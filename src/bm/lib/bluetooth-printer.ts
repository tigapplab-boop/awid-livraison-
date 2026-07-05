/**
 * Bluetooth Thermal Printer Integration
 * Support pour Goojprt PT-210 (48mm) et imprimantes ESC/POS compatibles
 */

export interface BluetoothPrinterOptions {
  deviceName?: string
  characterSet?: string
  codePage?: number
  width?: 48 | 58 // Largeur en mm
}

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private encoder = new TextEncoder()
  private width: 48 | 58 = 48 // Default 48mm pour PT-210
  private maxChars: number = 32 // Nombre de caractères par ligne pour 48mm

  // ESC/POS Commands
  private readonly ESC = '\x1B'
  private readonly GS = '\x1D'
  private readonly INIT = '\x1B\x40' // Initialize printer
  private readonly LINE_FEED = '\x0A'
  private readonly CUT_PAPER = '\x1D\x56\x00' // Cut paper (partiel)
  private readonly CUT_PAPER_FULL = '\x1D\x56\x01' // Cut paper (complet)

  // Text formatting
  private readonly BOLD_ON = '\x1B\x45\x01'
  private readonly BOLD_OFF = '\x1B\x45\x00'
  private readonly ALIGN_LEFT = '\x1B\x61\x00'
  private readonly ALIGN_CENTER = '\x1B\x61\x01'
  private readonly ALIGN_RIGHT = '\x1B\x61\x02'
  private readonly DOUBLE_HEIGHT_ON = '\x1B\x21\x10'
  private readonly DOUBLE_WIDTH_ON = '\x1B\x21\x20'
  private readonly DOUBLE_SIZE_ON = '\x1B\x21\x30'
  private readonly NORMAL_SIZE = '\x1B\x21\x00'
  private readonly UNDERLINE_ON = '\x1B\x2D\x01'
  private readonly UNDERLINE_OFF = '\x1B\x2D\x00'

  /**
   * Vérifie si l'API Bluetooth est disponible
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  /**
   * Demande et se connecte à une imprimante Bluetooth
   */
  async connect(options: BluetoothPrinterOptions = {}): Promise<boolean> {
    if (!BluetoothPrinter.isSupported()) {
      throw new Error('Bluetooth non supporté par ce navigateur')
    }

    // Configuration de la largeur
    if (options.width) {
      this.width = options.width
      this.maxChars = options.width === 48 ? 32 : 42
    }

    try {
      // Demander un appareil Bluetooth - compatible avec Goojprt PT-210
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'PT-' }, // Goojprt PT-210, PT-200, etc.
          { namePrefix: 'Printer' },
          { namePrefix: 'BlueTooth Printer' },
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        ],
        optionalServices: [
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
          '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
          '0000ff00-0000-1000-8000-00805f9b34fb', // Service personnalisé
          '000018f0-0000-1000-8000-00805f9b34fb', // Service d'impression
          '0000fff0-0000-1000-8000-00805f9b34fb', // Service Goojprt
        ],
      })

      if (!this.device.gatt) {
        throw new Error('GATT non disponible')
      }

      // Connecter au serveur GATT
      const server = await this.device.gatt.connect()

      // Obtenir le service d'impression
      const services = await server.getPrimaryServices()
      let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

      // Chercher une caractéristique d'écriture
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char
            break
          }
        }
        if (writeCharacteristic) break
      }

      if (!writeCharacteristic) {
        throw new Error('Aucune caractéristique d\'écriture trouvée')
      }

      this.characteristic = writeCharacteristic

      // Initialiser l'imprimante
      await this.sendCommand(this.INIT)

      return true
    } catch (error) {
      console.error('Erreur de connexion Bluetooth:', error)
      throw error
    }
  }

  /**
   * Déconnecte l'imprimante
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.device = null
    this.characteristic = null
  }

  /**
   * Vérifie si l'imprimante est connectée
   */
  isConnected(): boolean {
    return this.device?.gatt?.connected || false
  }

  /**
   * Envoie une commande brute à l'imprimante
   */
  private async sendCommand(command: string | Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Imprimante non connectée')
    }

    const data = typeof command === 'string' ? this.encoder.encode(command) : command

    // Goojprt PT-210 supporte des chunks plus petits pour la stabilité
    const chunkSize = 20
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      await this.characteristic.writeValue(chunk)
      // Délai pour la PT-210
      await new Promise((resolve) => setTimeout(resolve, 15))
    }
  }

  /**
   * Coupe une ligne de texte pour respecter la largeur max
   */
  private splitLine(text: string, maxLength?: number): string[] {
    const max = maxLength || this.maxChars
    const lines: string[] = []
    let currentLine = ''

    const words = text.split(' ')
    for (const word of words) {
      if ((currentLine + word).length <= max) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)

    return lines
  }

  /**
   * Crée une ligne avec texte à gauche et à droite (pour prix)
   */
  private createPriceLine(left: string, right: string): string {
    const totalLength = this.maxChars
    const rightLen = right.length
    const leftLen = left.length
    const spaces = totalLength - leftLen - rightLen
    return left + ' '.repeat(Math.max(spaces, 1)) + right
  }

  /**
   * Crée une ligne de séparation
   */
  private createSeparator(char: string = '-'): string {
    return char.repeat(this.maxChars)
  }

  /**
   * Envoie du texte à l'imprimante
   */
  private async sendText(text: string): Promise<void> {
    await this.sendCommand(text)
  }

  /**
   * Imprime un ticket de commande optimisé pour 48mm (32 caractères)
   */
  async printOrderTicket(order: {
    orderNumber: string
    type: 'pos' | 'phone' | 'online'
    items: Array<{
      name: string
      quantity: number
      price: number
      attachedToProductId?: string
    }>
    subtotal: number
    deliveryFee?: number
    total: number
    clientName?: string
    clientPhone?: string
    clientAddress?: string
    deliveryZone?: string
    notes?: string
    createdAt: Date
  }): Promise<void> {
    try {
      // Initialiser
      await this.sendCommand(this.INIT)

      // En-tête
      await this.sendCommand(this.ALIGN_CENTER)
      await this.sendCommand(this.DOUBLE_SIZE_ON)
      await this.sendCommand(this.BOLD_ON)
      await this.sendText('BURGER MINUTE\n')
      await this.sendCommand(this.NORMAL_SIZE)
      await this.sendCommand(this.BOLD_OFF)
      await this.sendText(this.createSeparator() + '\n')

      // Numéro de commande
      await this.sendCommand(this.DOUBLE_HEIGHT_ON)
      await this.sendCommand(this.BOLD_ON)
      await this.sendText(`CMD: ${order.orderNumber}\n`)
      await this.sendCommand(this.NORMAL_SIZE)
      await this.sendCommand(this.BOLD_OFF)

      // Type de commande
      const typeLabel =
        order.type === 'pos' ? 'SUR PLACE' : order.type === 'phone' ? 'TEL' : 'EN LIGNE'
      await this.sendText(`Type: ${typeLabel}\n`)

      // Date et heure
      const date = order.createdAt.toLocaleDateString('fr-DZ', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
      const time = order.createdAt.toLocaleTimeString('fr-DZ', {
        hour: '2-digit',
        minute: '2-digit',
      })
      await this.sendText(`${date} ${time}\n`)
      await this.sendText(this.createSeparator() + '\n')

      // Informations client (si livraison)
      if (order.type !== 'pos' && order.clientName) {
        await this.sendCommand(this.ALIGN_LEFT)
        await this.sendCommand(this.BOLD_ON)
        await this.sendText('CLIENT:\n')
        await this.sendCommand(this.BOLD_OFF)
        
        // Découper le nom si trop long
        const nameLines = this.splitLine(order.clientName)
        for (const line of nameLines) {
          await this.sendText(line + '\n')
        }
        
        if (order.clientPhone) {
          await this.sendText(`Tel: ${order.clientPhone}\n`)
        }
        
        if (order.clientAddress) {
          const addressLines = this.splitLine(order.clientAddress)
          for (const line of addressLines) {
            await this.sendText(line + '\n')
          }
        }
        
        if (order.deliveryZone) {
          await this.sendText(`Zone: ${order.deliveryZone}\n`)
        }
        await this.sendText(this.createSeparator() + '\n')
      }

      // Articles
      await this.sendCommand(this.ALIGN_LEFT)
      await this.sendCommand(this.BOLD_ON)
      await this.sendText('ARTICLES:\n')
      await this.sendCommand(this.BOLD_OFF)

      const mainItems = order.items.filter((item) => !item.attachedToProductId)

      for (const item of mainItems) {
        // Article principal
        const itemName = `${item.quantity}x ${item.name}`
        const itemTotal = (item.price * item.quantity).toFixed(0)
        
        // Si le nom est trop long, le couper sur plusieurs lignes
        const nameLines = this.splitLine(itemName, this.maxChars - 8) // Reserve 8 chars pour le prix
        
        for (let i = 0; i < nameLines.length; i++) {
          if (i === nameLines.length - 1) {
            // Dernière ligne : ajouter le prix
            await this.sendText(this.createPriceLine(nameLines[i], itemTotal + ' DA') + '\n')
          } else {
            await this.sendText(nameLines[i] + '\n')
          }
        }

        // Suppléments/Sauces attachés
        const attachedItems = order.items.filter(
          (attached) => attached.attachedToProductId === item.name
        )
        for (const attached of attachedItems) {
          const attachedName = ` +${attached.quantity}x ${attached.name}`
          const attachedTotal = (attached.price * attached.quantity).toFixed(0)
          
          const attachedLines = this.splitLine(attachedName, this.maxChars - 8)
          for (let i = 0; i < attachedLines.length; i++) {
            if (i === attachedLines.length - 1) {
              await this.sendText(this.createPriceLine(attachedLines[i], attachedTotal + ' DA') + '\n')
            } else {
              await this.sendText(attachedLines[i] + '\n')
            }
          }
        }
      }

      await this.sendText(this.createSeparator() + '\n')

      // Totaux
      await this.sendCommand(this.ALIGN_LEFT)
      await this.sendText(this.createPriceLine('Sous-total:', order.subtotal.toFixed(0) + ' DA') + '\n')

      if (order.deliveryFee && order.deliveryFee > 0) {
        await this.sendText(this.createPriceLine('Livraison:', order.deliveryFee.toFixed(0) + ' DA') + '\n')
      }

      await this.sendText(this.createSeparator() + '\n')
      await this.sendCommand(this.BOLD_ON)
      await this.sendCommand(this.DOUBLE_HEIGHT_ON)
      await this.sendText(this.createPriceLine('TOTAL:', order.total.toFixed(0) + ' DA') + '\n')
      await this.sendCommand(this.NORMAL_SIZE)
      await this.sendCommand(this.BOLD_OFF)

      // Notes
      if (order.notes) {
        await this.sendText(this.createSeparator() + '\n')
        await this.sendCommand(this.BOLD_ON)
        await this.sendText('NOTES:\n')
        await this.sendCommand(this.BOLD_OFF)
        const notesLines = this.splitLine(order.notes)
        for (const line of notesLines) {
          await this.sendText(line + '\n')
        }
      }

      // Pied de page
      await this.sendText(this.createSeparator() + '\n')
      await this.sendCommand(this.ALIGN_CENTER)
      await this.sendText('Merci!\n')
      await this.sendText('Burger Minute\n')
      await this.sendText('\n\n\n')

      // Couper le papier
      await this.sendCommand(this.CUT_PAPER)
      
      // Délai final
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Erreur d\'impression:', error)
      throw error
    }
  }

  /**
   * Test d'impression optimisé pour PT-210
   */
  async printTest(): Promise<void> {
    await this.sendCommand(this.INIT)
    await this.sendCommand(this.ALIGN_CENTER)
    await this.sendCommand(this.DOUBLE_SIZE_ON)
    await this.sendCommand(this.BOLD_ON)
    await this.sendText('TEST\n')
    await this.sendCommand(this.NORMAL_SIZE)
    await this.sendCommand(this.BOLD_OFF)
    await this.sendText(this.createSeparator() + '\n')
    await this.sendText('Goojprt PT-210\n')
    await this.sendText('48mm - 32 caracteres\n')
    await this.sendText(this.createSeparator() + '\n')
    await this.sendCommand(this.ALIGN_LEFT)
    await this.sendText('Connexion reussie!\n')
    await this.sendText(this.createSeparator() + '\n')
    await this.sendCommand(this.ALIGN_CENTER)
    await this.sendText('Burger Minute\n')
    await this.sendText('\n\n\n')
    await this.sendCommand(this.CUT_PAPER)
  }
}

// Instance singleton
let printerInstance: BluetoothPrinter | null = null

export function getBluetoothPrinter(): BluetoothPrinter {
  if (!printerInstance) {
    printerInstance = new BluetoothPrinter()
  }
  return printerInstance
}
