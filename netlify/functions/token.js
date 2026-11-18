const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

exports.handler = async function(event, context) {
    const APP_ID = "57b7c940c0cd478e8648cf8ff15650dd";
    const APP_CERTIFICATE = "ae2d686f7f26413dad7debb13971f3ed"; 

    const channelName = event.queryStringParameters.channel;
    if (!channelName) {
        return { statusCode: 400, body: "Channel name is required" };
    }

    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);

    return {
        statusCode: 200,
        body: JSON.stringify({ token: token })
    };
};

