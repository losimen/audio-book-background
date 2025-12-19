const http = require('http');

const PORT = 8000;

const server = http.createServer((req, res) => {
  // 1. Handle CORS (So your iOS device can talk to this local server)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle Preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 3. Handle Log Messages
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      // Print the log with a timestamp
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${body}`);
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📡 Remote Logger running on port ${PORT}`);
  console.log(`Now listening for logs from your device...`);
  console.log(`Make sure your device is on the same Wi-Fi.`);
});
