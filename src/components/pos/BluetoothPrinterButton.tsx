'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bluetooth, Printer, Loader2 } from 'lucide-react'
import { BluetoothPrinter, getBluetoothPrinter } from '@/bm/lib/bluetooth-printer'

interface BluetoothPrinterButtonProps {
  onPrinterConnected?: (printer: BluetoothPrinter) => void
  onPrinterDisconnected?: () => void
}

export default function BluetoothPrinterButton({
  onPrinterConnected,
  onPrinterDisconnected,
}: BluetoothPrinterButtonProps) {
  const [printer] = useState(() => getBluetoothPrinter())
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(BluetoothPrinter.isSupported())
    setIsConnected(printer.isConnected())
  }, [printer])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      await printer.connect()
      setIsConnected(true)
      if (onPrinterConnected) {
        onPrinterConnected(printer)
      }
    } catch (err) {
      console.error('Erreur de connexion:', err)
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await printer.disconnect()
      setIsConnected(false)
      if (onPrinterDisconnected) {
        onPrinterDisconnected()
      }
    } catch (err) {
      console.error('Erreur de déconnexion:', err)
      setError(err instanceof Error ? err.message : 'Erreur de déconnexion')
    }
  }

  const handleTestPrint = async () => {
    if (!isConnected) {
      setError('Imprimante non connectée')
      return
    }

    setIsTesting(true)
    setError(null)

    try {
      await printer.printTest()
    } catch (err) {
      console.error('Erreur de test d\'impression:', err)
      setError(err instanceof Error ? err.message : 'Erreur d\'impression')
    } finally {
      setIsTesting(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
        <Bluetooth className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-600">Bluetooth non supporté par ce navigateur</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Badge variant="default" className="bg-green-500 text-white">
              <Bluetooth className="h-3 w-3 mr-1" />
              Connecté
            </Badge>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Déconnecter
            </Button>
            <Button
              onClick={handleTestPrint}
              disabled={isTesting}
              variant="outline"
              size="sm"
              className="text-xs gap-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Test...
                </>
              ) : (
                <>
                  <Printer className="h-3 w-3" />
                  Test
                </>
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <Bluetooth className="h-4 w-4" />
                Connecter Imprimante
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
