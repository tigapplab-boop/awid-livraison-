'use client'

// ========================================
// AWID / BURGER MINUTE - Error Boundary
// Catches client-side exceptions and shows
// a user-friendly error page with retry
// ========================================

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App] Client error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bm-bg p-6">
      <div className="w-full max-w-sm text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-xl font-bold text-stone-900">
          Oups, une erreur est survenue
        </h1>

        {/* Description */}
        <p className="mb-6 text-sm text-stone-500">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer ou recharger la page.
        </p>

        {/* Retry Button */}
        <button
          onClick={reset}
          className="btn-bm btn-bm-primary btn-bm-lg w-full mb-3"
        >
          Réessayer
        </button>

        {/* Reload Link */}
        <a
          href="/"
          className="inline-block text-sm text-stone-400 hover:text-bm-primary transition-colors"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  )
}
