import { useCallback, RefObject } from 'react'
import { useReactToPrint } from 'react-to-print'

export function usePrint(ref: RefObject<HTMLDivElement | null>) {
  const handlePrint = useReactToPrint({
    contentRef: ref,
    documentTitle: 'Ticket Cuisine',
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `,
  })

  const print = useCallback(() => {
    if (handlePrint) {
      handlePrint()
    }
  }, [handlePrint])

  return { print }
}
