const http = require('http');

/**
 * Proxy config for Angular dev server.
 * agent.keepAlive: false evita "socket hang up" tras varios requests,
 * ya que el proxy no reutiliza conexiones que el backend pudo cerrar.
 */
module.exports = {
  '/api': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
    agent: new http.Agent({ keepAlive: false }),
  },
};
