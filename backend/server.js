const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./sockets/socket');

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`ArenaSuite API listening on http://localhost:${env.port}`);
});
