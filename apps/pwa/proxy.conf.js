const http = require('http');

/**
 * Proxy del dev server de la PWA hacia la API.
 * - Local: localhost:3000
 * - Docker: http://api:3000 vía PROXY_API_TARGET (docker-compose)
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
