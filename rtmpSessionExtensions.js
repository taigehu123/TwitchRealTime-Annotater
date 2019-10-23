const AMF = require("node-media-server/node_core_amf");
const NodeFlvSession = require("node-media-server/node_flv_session");
const context = require("node-media-server/node_core_ctx");
const NodeRtmpSession = require('node-media-server/node_rtmp_session');
const WebSocket = require('ws');
const { AUDIO_SOUND_RATE, AUDIO_CODEC_NAME, VIDEO_CODEC_NAME } = require("node-media-server/node_core_av");
const AV = require("node-media-server/node_core_av");
const Logger = require("node-media-server/node_core_logger");
const revainode = require('revai-node-sdk');
const fs = require('fs');

const accessToken = '02nZ3Q9gmP_1SuR1YATQKGKPLhwv5hkj8pJ8TS1c15LC3_p2IH1AL3UVHIXFK2bQTNIcc80oB3o6yKRvvfpvfgKhFzfE8';

const N_CHUNK_STREAM = 8;
const RTMP_VERSION = 3;
const RTMP_HANDSHAKE_SIZE = 1536;
const RTMP_HANDSHAKE_UNINIT = 0;
const RTMP_HANDSHAKE_0 = 1;
const RTMP_HANDSHAKE_1 = 2;
const RTMP_HANDSHAKE_2 = 3;

const RTMP_PARSE_INIT = 0;
const RTMP_PARSE_BASIC_HEADER = 1;
const RTMP_PARSE_MESSAGE_HEADER = 2;
const RTMP_PARSE_EXTENDED_TIMESTAMP = 3;
const RTMP_PARSE_PAYLOAD = 4;

const MAX_CHUNK_HEADER = 18;

const RTMP_CHUNK_TYPE_0 = 0; // 11-bytes: timestamp(3) + length(3) + stream type(1) + stream id(4)
const RTMP_CHUNK_TYPE_1 = 1; // 7-bytes: delta(3) + length(3) + stream type(1)
const RTMP_CHUNK_TYPE_2 = 2; // 3-bytes: delta(3)
const RTMP_CHUNK_TYPE_3 = 3; // 0-byte

const RTMP_CHANNEL_PROTOCOL = 2;
const RTMP_CHANNEL_INVOKE = 3;
const RTMP_CHANNEL_AUDIO = 4;
const RTMP_CHANNEL_VIDEO = 5;
const RTMP_CHANNEL_DATA = 6;

const rtmpHeaderSize = [11, 7, 3, 0];

/* Protocol Control Messages */
const RTMP_TYPE_SET_CHUNK_SIZE = 1;
const RTMP_TYPE_ABORT = 2;
const RTMP_TYPE_ACKNOWLEDGEMENT = 3; // bytes read report
const RTMP_TYPE_WINDOW_ACKNOWLEDGEMENT_SIZE = 5; // server bandwidth
const RTMP_TYPE_SET_PEER_BANDWIDTH = 6; // client bandwidth

/* User Control Messages Event (4) */
const RTMP_TYPE_EVENT = 4;

const RTMP_TYPE_AUDIO = 8;
const RTMP_TYPE_VIDEO = 9;
const RTMP_TYPE_CMD = 14;

/* Data Message */
const RTMP_TYPE_FLEX_STREAM = 15; // AMF3
const RTMP_TYPE_DATA = 18; // AMF0

/* Shared Object Message */
const RTMP_TYPE_FLEX_OBJECT = 16; // AMF3
const RTMP_TYPE_SHARED_OBJECT = 19; // AMF0

/* Command Message */
const RTMP_TYPE_FLEX_MESSAGE = 17; // AMF3
const RTMP_TYPE_INVOKE = 20; // AMF0

/* Aggregate Message */
const RTMP_TYPE_METADATA = 22;

const RTMP_CHUNK_SIZE = 128;
const RTMP_PING_TIME = 60000;
const RTMP_PING_TIMEOUT = 30000;

const STREAM_BEGIN = 0x00;
const STREAM_EOF = 0x01;
const STREAM_DRY = 0x02;
const STREAM_EMPTY = 0x1f;
const STREAM_READY = 0x20;

const RtmpPacket = {
    create: (fmt = 0, cid = 0) => {
        return {
            header: {
                fmt: fmt,
                cid: cid,
                timestamp: 0,
                length: 0,
                type: 0,
                stream_id: 0
            },
            clock: 0,
            payload: null,
            capacity: 0,
            bytes: 0
        };
    }
};

module.exports = {
    run() {
        this.getTranscription();
        this.socket.on("data", this.onSocketData.bind(this));
        this.socket.on("close", this.onSocketClose.bind(this));
        this.socket.on("error", this.onSocketError.bind(this));
        this.socket.on("timeout", this.onSocketTimeout.bind(this));
        this.socket.setTimeout(this.pingTimeout);
        this.isStarting = true;
    },

    encodeCaptionData(text) {
        let data = AMF.amf0EncodeOne('onCaptionInfo');
        const opt = [ type = '708', data = text ];

        opt.forEach(function (n) {
            if (opt.hasOwnProperty(n))
                data = Buffer.concat([data, AMF.amf0EncodeOne(opt[n])]);
        });

        Logger.log(data);
        return Buffer.from(data);
    },

    handleRevAiResponse(resp) {
        Logger.log('handling revai response');
        const phrase = resp.elements.map(e => e.value).join(' ');

        Logger.log(phrase);

        let packet = RtmpPacket.create();
        packet.header.fmt = RTMP_CHUNK_TYPE_0;
        packet.header.cid = RTMP_CHANNEL_INVOKE;
        packet.header.type = RTMP_TYPE_INVOKE;
        packet.header.stream_id = 0;
        packet.payload = this.encodeCaptionData(phrase);
        packet.header.length = packet.payload.length;
        packet.header.timestamp = this.parserPacket.clock;

        let rtmpChunks = this.rtmpChunksCreate(packet);

        for (let playerId of this.players) {
            let playerSession = context.sessions.get(playerId);
      
            if (playerSession.numPlayCache === 0) {
              playerSession.res.cork();
            }
      
            if (playerSession instanceof NodeRtmpSession) {
              if (playerSession.isStarting && playerSession.isPlaying && !playerSession.isPause && playerSession.isReceiveVideo) {
                rtmpChunks.writeUInt32LE(playerSession.playStreamId, 8);
                playerSession.res.write(rtmpChunks);
                this.getTranscription();
              }
            }

            playerSession.numPlayCache++;
      
            if (playerSession.numPlayCache === 10) {
              process.nextTick(() => playerSession.res.uncork());
              playerSession.numPlayCache = 0;
            }
          }
    },

    getTranscription() {
      const audioConfig = new revainode.AudioConfig(
          /* contentType */ "audio/*",
          /* layout */      "interleaved",
          /* sample rate */ 16000,
          /* format */      "S16LE",
          /* channels */    1
      );

      var client = new revainode.RevAiStreamingClient(accessToken, audioConfig);

      // Create your event responses
      client.on('close', (code, reason) => {
          Logger.log(`Connection closed, ${code}: ${reason}`);
      });
      client.on('httpResponse', code => {
          Logger.log(`Streaming client received http response with code: ${code}`);
      })
      client.on('connectFailed', error => {
          Logger.log(`Connection failed with error: ${error}`);
      })
      client.on('connect', connectionMessage => {
          Logger.log(`Connected with message: ${connectionMessage}`);
      })
      // Begin streaming session
      var stream = client.start();

      // Read file from disk
      var file = fs.createReadStream("./2019-10-11 15-16-21.mkv");

      stream.on('data', data => {
          if (data.type == "final") {
            this.handleRevAiResponse(data);
          }
      });
      stream.on('end', function () {
          Logger.log("End of Stream");
      });

      file.on('end', () => {
          client.end();
      });

      // Stream the file
      file.pipe(stream);
    }
};
