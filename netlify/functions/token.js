const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

exports.handler = async (event, context) => {
    // Твои ключи из консоли Agora
    const appID = "913f13a6b8104d34b03695acdc0d79b7";
    const appCertificate = "1a1bb617f44841cdbb1ab4cdd47e75d1";

    const channel = event.queryStringParameters.channel;

    if (!channel) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: "Channel is required" })
        };
    }

    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // Токен живет 1 час
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channel, uid, role, privilegeExpiredTs);
        
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Разрешаем доступ с твоего сайта
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token: token })
        };
    } catch (e) {
        console.error("Ошибка генерации:", e);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: e.message })
        };
    }
};
