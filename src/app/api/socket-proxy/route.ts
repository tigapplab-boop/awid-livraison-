// Proxy Socket.IO vers le socket-service interne
// Permet d'utiliser burgerminute.giize.com/socket.io/ au lieu d'un second domaine
// → Plus besoin de SSL séparé pour burgerminute.oplk.net

import { NextRequest } from 'next/server'

const SOCKET_URL = process.env.SOCKET_SERVICE_URL || 'http://socket-service:3003'

async function proxyToSocket(req: NextRequest) {
  const url = new URL(req.url)
  const targetUrl = `${SOCKET_URL}/socket.io/${url.search}`

  const headers = new Headers()
  // Transmettre les headers nécessaires pour Socket.IO
  for (const [key, value] of req.headers.entries()) {
    if (['content-type', 'authorization', 'cookie', 'origin'].includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }
  headers.set('host', new URL(SOCKET_URL).host)

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-ignore
      duplex: 'half',
    })

    const responseHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }
    // CORS pour Socket.IO
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (err) {
    console.error('[socket-proxy] Error:', err)
    return new Response(JSON.stringify({ error: 'Socket service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const GET = proxyToSocket
export const POST = proxyToSocket
export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
