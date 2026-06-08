import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }
  return NextResponse.json(authResult)
}
