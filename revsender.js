const revai = require('revai-node-sdk');
const fs = require('fs');

const token = "02nZ3Q9gmP_1SuR1YATQKGKPLhwv5hkj8pJ8TS1c15LC3_p2IH1AL3UVHIXFK2bQTNIcc80oB3o6yKRvvfpvfgKhFzfE8"

// Initialize your client with your audio configuration and access token
const audioConfig = new revai.AudioConfig(
    /* contentType */ "audio/*",
    /* layout */      "interleaved",
    /* sample rate */ 16000,
    /* format */      "S16LE",
    /* channels */    1
);

var client = new revai.RevAiStreamingClient(token, audioConfig);

// Create your event responses
client.on('close', (code, reason) => {
    console.log(`Connection closed, ${code}: ${reason}`);
});
client.on('httpResponse', code => {
    console.log(`Streaming client received http response with code: ${code}`);
})
client.on('connectFailed', error => {
    console.log(`Connection failed with error: ${error}`);
})
client.on('connect', connectionMessage => {
    console.log(`Connected with message: ${connectionMessage}`);
})

// Begin streaming session
var stream = client.start();

// Read file from disk
var file = fs.createReadStream("/Users/taigehu/Movies/test");

stream.on('data', data => {
    if (data.type == "final") {
      handleRevAiResponse(data);
    }
});
stream.on('end', function () {
    console.log("End of Stream");
});

file.on('end', () => {
    client.end();
});

// Stream the file
file.pipe(stream);

// Forcibly ends the streaming session
// stream.end();
