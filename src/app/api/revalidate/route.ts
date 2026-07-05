// Revalidate API - Force clear Next.js cache
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.REVALIDATE_SECRET

    // Avant : si "secret" n'était pas fourni dans l'URL, la vérification était sautée
    // entièrement (n'importe qui pouvait forcer un vidage de cache). Corrigé :
    // - si REVALIDATE_SECRET n'est pas configuré côté serveur, on refuse par sécurité
    // - sinon, le secret fourni doit correspondre exactement
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'REVALIDATE_SECRET non configuré côté serveur' },
        { status: 500 }
      )
    }
    if (secret !== expectedSecret) {
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
