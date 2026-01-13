const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STYLES_DIR = path.join(__dirname, 'styles');

const server = http.createServer((req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📡 REQUEST: ${req.method} ${req.url}`);
    console.log(`    👉 Headers: User-Agent: ${req.headers['user-agent']}`);
    console.log(`    👉 Origin: ${req.headers['origin'] || 'Direct/Unknown'}`);

    // Enable CORS for testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`    📝 Watching for incoming Beds24 requests...\n`);
});
