import { store, actions } from '../state.js'
import { formatTimestamp, formatRelative } from '../utils/format.js'
import { parseSample } from '../utils/parseSample.js'
import {
  isSupported,
  requestDevice,
  connect,
  startNotifications,
  stopNotifications,
  disconnect,
  setDisconnectedListener,
} from '../bluetooth.js'

const statusText = {
  disconnected: '연결 안 됨',
  connecting: '연결 중',
  connected: '연결됨',
}

export const initConnectionPanel = () => {
  const root = document.querySelector('[data-component="connection-panel"]')
  if (!root) return () => {}

  const statusEl = root.querySelector('[data-bind="status"]')
  const lastUpdatedEl = root.querySelector('[data-bind="last-updated"]')
  const relativeEl = root.querySelector('[data-bind="relative-time"]')
  const errorEl = root.querySelector('[data-bind="error"]')
  const helperEl = root.querySelector('[data-bind="helper"]')
  const connectBtn = root.querySelector('[data-action="connect"]')
  const disconnectBtn = root.querySelector('[data-action="disconnect"]')

  let isBusy = false
  let manualDisconnect = false

  const updateButtons = (state) => {
    if (connectBtn) connectBtn.disabled = isBusy || state.connectionStatus !== 'disconnected' || !isSupported()
    if (disconnectBtn) disconnectBtn.disabled = isBusy || state.connectionStatus === 'disconnected'
  }

  const showError = (message) => {
    if (!errorEl) return
    if (!message) {
      errorEl.textContent = ''
      errorEl.hidden = true
      return
    }
    errorEl.textContent = message
    errorEl.hidden = false
  }

  const render = (state) => {
    if (statusEl) statusEl.textContent = statusText[state.connectionStatus] ?? '—'
    if (lastUpdatedEl) lastUpdatedEl.textContent = formatTimestamp(state.lastUpdatedAt)
    if (relativeEl) relativeEl.textContent = formatRelative(state.lastUpdatedAt)
    showError(state.errorMessage)
    updateButtons(state)
  }

  if (!isSupported() && helperEl) {
    helperEl.textContent =
      '이 환경은 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge에서 HTTPS 혹은 http://localhost 로 접근하세요.'
  }

  setDisconnectedListener(() => {
    store.dispatch(actions.reset())
    store.dispatch(actions.setStatus('disconnected'))
    store.dispatch(actions.setStep('prepare'))
    if (!manualDisconnect) {
      store.dispatch(actions.setError('디바이스 연결이 종료되었습니다.'))
      store.dispatch(actions.setMessage({ status: undefined, warning: '디바이스 연결이 종료되었습니다.' }))
    }
    manualDisconnect = false
  })

  const handleLine = (line) => {
    if (line.startsWith('CAL,')) {
      const parts = line.split(',')
      const zero = Number(parts[1])
      const scale = Number(parts[2])
      const speed = Number(parts[3])
      const next = {
        angleZero: Number.isFinite(zero) ? zero : store.getState().calibration.angleZero,
        angleScale: Number.isFinite(scale) ? scale : store.getState().calibration.angleScale,
        servoSpeedDegPerSec: Number.isFinite(speed)
          ? speed
          : store.getState().calibration.servoSpeedDegPerSec,
      }
      store.dispatch(actions.setCalibration(next))
      store.dispatch(actions.setWorkflow({ autoCalibrationRunning: false }))
      store.dispatch(actions.setMessage({ status: '자동 보정이 완료되었습니다.', warning: undefined }))
      store.dispatch(actions.setStep('measure'))
      return
    }

    const sample = parseSample(line)
    if (sample) {
      store.dispatch(actions.setSample(sample))
    }
  }

  const connectFlow = async () => {
    try {
      isBusy = true
      store.dispatch(actions.setError(undefined))
      store.dispatch(actions.setStatus('connecting'))
      const device = await requestDevice()
      const info = await connect(device)
      store.dispatch(actions.setDevice(info))
      await startNotifications(handleLine)
      store.dispatch(actions.setStatus('connected'))
      store.dispatch(actions.setStep('calibrate'))
      store.dispatch(
        actions.setMessage({ status: '디바이스와 연결되었습니다. 자동 보정을 실행하세요.', warning: undefined })
      )
    } catch (error) {
      console.error(error)
      await stopNotifications().catch(() => {})
      await disconnect().catch(() => {})
      store.dispatch(actions.setStatus('disconnected'))
      const message = error instanceof Error ? error.message : '디바이스 연결 중 오류가 발생했습니다.'
      store.dispatch(actions.setError(message))
      store.dispatch(actions.setMessage({ status: undefined, warning: message }))
    } finally {
      isBusy = false
      updateButtons(store.getState())
    }
  }

  connectBtn?.addEventListener('click', () => {
    const state = store.getState()
    if (state.connectionStatus !== 'disconnected' || isBusy || !isSupported()) return
    void connectFlow()
  })

  disconnectBtn?.addEventListener('click', async () => {
    const state = store.getState()
    if (state.connectionStatus === 'disconnected' || isBusy) return
    try {
      manualDisconnect = true
      isBusy = true
      await stopNotifications()
      await disconnect()
    } finally {
      store.dispatch(actions.reset())
      store.dispatch(actions.setStatus('disconnected'))
      store.dispatch(actions.setStep('prepare'))
      store.dispatch(actions.setMessage({ status: '연결이 해제되었습니다.', warning: undefined }))
      isBusy = false
      updateButtons(store.getState())
    }
  })

  const unsubscribe = store.subscribe(render)
  const interval = window.setInterval(() => {
    const state = store.getState()
    if (relativeEl) relativeEl.textContent = formatRelative(state.lastUpdatedAt)
  }, 1000)

  return () => {
    unsubscribe()
    window.clearInterval(interval)
  }
}
