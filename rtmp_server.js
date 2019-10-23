const NodeMediaServer = require('node-media-server');
const NodeRelayServer = require('node-media-server/node_relay_server');
const NodeRtmpSession = require('node-media-server/node_rtmp_session');
const NodeRelayServerExtensions = require('./relayServerExtensions');
const NodeRtmpSessionExtensions = require('./rtmpSessionExtensions');
const Logger = require('node-media-server/node_core_logger');

Object.assign(NodeRelayServer.prototype, NodeRelayServerExtensions);
Object.assign(NodeRtmpSession.prototype, NodeRtmpSessionExtensions);
 
const config = {
  logType: 3,

  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  relay: {
    ffmpeg: 'C:/Program Files/FFmpeg-4.2/bin/ffmpeg.exe',
    tasks: [
      {
        app: 'live',
        mode: 'static',
        edge: 'rtmp://live-sfo.twitch.tv/app/live_270812556_dUN2n0vWwmqTA0zRVEihmI4kXST325',
      }
    ]
  }
};
 
var nms = new NodeMediaServer(config)
nms.run();