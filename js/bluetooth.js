const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
const RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

const CONTROL_PREFIX = 'MSG:'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

let device = null
let server = null
let txCharacteristic = null
let rxCharacteristic = null
let notificationHandler = null
const disconnectListeners = new Set()

const notifyDisconnect = () => {
  disconnectListeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.error('disconnect listener failed', error)
    }
  })
}

const reset = () => {
  notificationHandler = null
  txCharacteristic = null
  rxCharacteristic = null
  server = null
  device = null
}

const handleGattDisconnect = () => {
  reset()
  notifyDisconnect()
}

const ensureSupported = () => {
  if (!isSupported()) {
    throw new Error('Web Bluetooth is not available in this browser.')
  }
}

const ensureWritable = () => {
  if (!txCharacteristic) {
    throw new Error('TX characteristic not available.')
  }
}

const normalizeNumber = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`)
  }
  return parsed
}

const writeCommand = async (text) => {
  ensureWritable()
  const payload = encoder.encode(`${text}\n`)
  await txCharacteristic.writeValue(payload)
}

export const isSupported = () => typeof navigator !== 'undefined' && !!navigator.bluetooth

export const onDisconnect = (listener) => {
  if (typeof listener !== 'function') return () => {}
  disconnectListeners.add(listener)
  return () => disconnectListeners.delete(listener)
}

export const requestDevice = async () => {
  ensureSupported()
  device = await navigator.bluetooth.requestDevice({
    filters: [
      { namePrefix: 'BBC micro:bit' },
      { namePrefix: 'micro:bit' },
    ],
    optionalServices: [UART_SERVICE_UUID],
  })
  if (device) {
    device.addEventListener('gattserverdisconnected', handleGattDisconnect)
  }
  return device
}

export const connect = async () => {
  if (!device) throw new Error('Device not selected.')
  server = await device.gatt?.connect()
  if (!server) throw new Error('Failed to connect to GATT server.')
  const service = await server.getPrimaryService(UART_SERVICE_UUID)
  txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID)
  rxCharacteristic = await service.getCharacteristic(RX_CHARACTERISTIC_UUID)
}

export const disconnect = async () => {
  if (rxCharacteristic) {
    try {
      await rxCharacteristic.stopNotifications()
    } catch (error) {
      console.warn('stopNotifications failed', error)
    }
  }

  if (device?.gatt?.connected) {
    device.gatt.disconnect()
    return
  }

  handleGattDisconnect()
}

export const startNotifications = async (handler) => {
  if (!rxCharacteristic) throw new Error('RX characteristic not available.')
  notificationHandler = handler
  rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
    if (!notificationHandler) return
    const value = event.target?.value
    if (!value) return
    const text = decoder.decode(value)
    notificationHandler(text)
  })
  await rxCharacteristic.startNotifications()
}

export const writeLine = async (text) => {
  await writeCommand(text)
}

export const sendSweep = async ({ start = 0, end = 180, duration = 6000 } = {}) => {
  const startDeg = Math.max(0, Math.min(180, normalizeNumber(start)))
  const endDeg = Math.max(0, Math.min(180, normalizeNumber(end)))
  const durationMs = Math.max(1, Math.round(normalizeNumber(duration)))
  await writeCommand(`SWEEP,${startDeg},${endDeg},${durationMs}`)
}

export const sendStop = async () => {
  await writeCommand('STOP')
}

export const sendReset = async () => {
  await writeCommand('RESET')
}

export const classifyNotification = (line) => {
  const trimmed = (line ?? '').trim()
  if (!trimmed) {
    return { type: 'empty', payload: '' }
  }
  if (trimmed.startsWith(CONTROL_PREFIX)) {
    return { type: 'control', payload: trimmed.slice(CONTROL_PREFIX.length).trim() }
  }
  return { type: 'data', payload: trimmed }
}
