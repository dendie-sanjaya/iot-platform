// history-server.js
const http = require('http');

const historyData = [
  { id: 1, timestamp: new Date(), payload: 'data-1' },
  { id: 2, timestamp: new Date(), payload: 'data-2' }
];

const server = http.createServer((req, res) => {
  if (req.url === '/history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(historyData));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Endpoint tidak ditemukan');
  }
});

server.listen(3000, () => {
  console.log('Server API HTTP mendengarkan di port 3000');
});