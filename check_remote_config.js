
const https = require('https');

const url = "https://raw.githubusercontent.com/filesavertorrent-cloud/mov-site/main/mov-react/public/config.json?t=" + Date.now();

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Requests in remote config:");
            console.log(JSON.stringify(json.requests, null, 2));
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw data:", data);
        }
    });
}).on('error', (err) => {
    console.error("Error fetching config:", err);
});
