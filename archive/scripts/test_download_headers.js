import http from 'http';
const req = http.get({
  hostname: 'localhost',
  port: 5000,
  path: '/api/documents/doc-6094a442-9/download',
  headers: { 'x-user-id': 'usr-jud-001' }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  process.exit(0);
});
req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});
