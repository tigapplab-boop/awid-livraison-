'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface RestaurantGalleryProps {
  images: string[]
}

export function RestaurantGallery({ images }: RestaurantGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="px-4 py-6 bg-white">
      <div className="max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-stone-800 text-center mb-4">
          Notre Restaurant
        </h3>

        <div className="relative">
          {/* Main Image */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-100">
            <img
              src={images[currentIndex]}
              alt={`Restaurant - Photo ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 text-white text-xs font-semibold rounded-full">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-bm-primary scale-105'
                      : 'border-stone-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Miniature ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
