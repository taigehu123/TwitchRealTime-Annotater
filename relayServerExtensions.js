const Logger = require('node-media-server/node_core_logger');
const NodeCoreUtils = require('node-media-server/node_core_utils');
const NodeRelaySession = require('node-media-server/node_relay_session');

module.exports = {
    onStatic() {
        if (!this.config.relay.tasks) {
            return;
        }
        let i = this.config.relay.tasks.length;
        while (i--) {
            if (this.staticSessions.has(i)) {
                continue;
            }
    
            let conf = this.config.relay.tasks[i];
            let isStatic = conf.mode === 'static';
            if (isStatic) {
                conf.name = conf.name ? conf.name : NodeCoreUtils.genRandomName();
                conf.ffmpeg = this.config.relay.ffmpeg;
                conf.inPath = 'rtmp://localhost/live/STREAM_NAME';
                conf.ouPath = `rtmp://live-sfo.twitch.tv/app/live_270812556_dUN2n0vWwmqTA0zRVEihmI4kXST325`;
                let session = new NodeRelaySession(conf);
                session.id = i;
                session.streamPath = `/${conf.app}/${conf.name}`;
                session.on('end', (id) => {
                    this.staticSessions.delete(id);
                });
                this.staticSessions.set(i, session);
                session.run();
                Logger.log('[Relay static pull] start', i, conf.inPath, ' to ', conf.ouPath);
            }
        }
    },
}