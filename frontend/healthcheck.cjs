const http = require('node:http');

const req = http.get('http://127.0.0.1:5173', (res) => {
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
    process.exit(0);
  }

  process.exit(1);
});

req.on('error', () => {
  process.exit(1);
});

req.setTimeout(2000, () => {
  req.destroy();
  process.exit(1);
});
