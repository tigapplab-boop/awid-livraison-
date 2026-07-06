// Custom Next.js server avec proxy WebSocket pour Socket.IO
// Permet à /socket.io/* de passer par le même domaine que l'app
// Sans nginx supplémentaire

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const httpProxy = require('http-proxy')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)
const socketUrl = process.env.SOCKET_SERVICE_URL || 'http://socket-service:3003'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Proxy vers le socket-service
const proxy = httpProxy.createProxyServer({
  target: socketUrl,
  ws: true,
  changeOrigin: true,
})

proxy.on('error', (err, req, res) => {
  console.error('[Proxy] Error:', err.message)
  if (res && res.writeHead) {
    res.writeHead(502)
    res.end('Socket service unavailable')
  }
})

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    const { pathname } = parsedUrl

    // Proxy HTTP polling vers socket-service
    if (pathname.startsWith('/socket.io/')) {
      return proxy.web(req, res)
    }

    handle(req, res, parsedUrl)
  })

  // Proxy WebSocket upgrade vers socket-service
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url)
    if (pathname.startsWith('/socket.io/')) {
      proxy.ws(req, socket, head)
    }
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.IO proxy: ${socketUrl}`)
  })
})
