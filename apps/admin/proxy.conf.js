const http = require('http');

/**
 * Proxy config for Angular dev server.
 * - Local: target localhost:3000 (API en el host)
 * - Docker: target http://api:3000 (PROXY_API_TARGET en docker-compose)
 * agent.keepAlive: false evita "socket hang up" tras varios requests.
 */
const apiTarget = process.env.PROXY_API_TARGET || 'http://localhost:3000';

module.exports = {
  '/api': {
    target: apiTarget,
    secure: false,
    changeOrigin: true,
    agent: new http.Agent({ keepAlive: false }),
  },
};
