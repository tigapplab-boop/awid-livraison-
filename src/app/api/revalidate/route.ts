// Revalidate API - Force clear Next.js cache
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret')
    
    // Simple secret check (optional)
    if (secret && secret !== process.env.REVALIDATE_SECRET && process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    // Revalidate all paths
    revalidatePath('/', 'layout')
    revalidatePath('/menu')
    revalidatePath('/admin')
    revalidatePath('/livreur')

    return NextResponse.json({ 
      revalidated: true, 
      timestamp: new Date().toISOString() 
    })
  } catch (err) {
    return NextResponse.json({ 
      error: 'Error revalidating',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to revalidate cache',
    buildId: process.env.NEXT_BUILD_ID || 'unknown'
  })
}
