// ========================================
// AWID / BURGER MINUTE - Auth Utilities
// JWT creation and verification using jose
// ========================================

import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'burger-minute-secret-key-change-in-production'
)

export interface JwtPayload {
  userId: string
  role: string
  name: string
}

export async function createToken(payload: JwtPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  return token
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      name: payload.name as string,
    }
  } catch {
    return null
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

export async function authenticateRequest(request: Request): Promise<JwtPayload | NextResponse> {
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader)
  if (!token) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  return payload
}

export async function requireRole(request: Request, role: string): Promise<JwtPayload | NextResponse> {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }
  const payload = authResult as JwtPayload
  if (payload.role !== role && payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  return payload
}
