import {
  isSupported,
  requestDevice,
  connect,
  disconnect,
  startNotifications,
  sendSweep,
  sendStop,
  sendReset,
  onDisconnect,
  classifyNotification,
} from './bluetooth.js'
import { fitMalus } from './analysis/malusFit.js'
import { parseSample } from './utils/parseSample.js'
import { downloadCsv } from './utils/csv.js'
import { initState } from './state.js'
import { initConnectionPanel } from './ui/connection-panel.js'
import { initMeasurementPanel } from './ui/measurement-panel.js'
import { initAnalysisPanel } from './ui/analysis-panel.js'
import { initLightChart } from './ui/light-chart.js'
import { initStatusBanner } from './ui/status-banner.js'
import { initStepIndicator } from './ui/step-indicator.js'

const store = initState()

const DEFAULT_SWEEP = {
  start: 0,
  end: 180,
  duration: 6000,
}
const SWEEP_PROGRESS_INTERVAL = 200
const MIN_FIT_SAMPLES = 12

let rxBuffer = ''
let progressTimerId = null
let currentSweepDuration = DEFAULT_SWEEP.duration
let hasRegisteredDisconnect = false

const clearProgressTimer = () => {
  if (progressTimerId !== null) {
    window.clearInterval(progressTimerId)
    progressTimerId = null
  }
}

const finalizeMeasurement = ({ status, warning, step = 'analyze', markComplete = false } = {}) => {
  clearProgressTimer()
  store.setWorkflow({
    measuring: false,
    sweepProgress: markComplete ? 100 : 0,
    sweepRemainingMs: 0,
    sweepDurationMs: 0,
    sweepStartedAt: null,
  })
  store.setStep(step)
  if (status !== undefined || warning !== undefined) {
    store.setMessages({ status: status ?? '', warning: warning ?? '' })
  }
}

const performFit = async (reason = 'manual') => {
  const { samples } = store.getState()
  if (!Array.isArray(samples) || samples.length < MIN_FIT_SAMPLES) {
    store.setFitResult(null)
    store.setFitStatus('error')
    const warning = reason === 'auto'
      ? '피팅을 수행하기 위한 샘플이 부족합니다. 필요한 경우 측정을 다시 진행하세요.'
      : '피팅을 수행하기 위한 샘플 수가 부족합니다.'
    store.setMessages({ status: '', warning })
    return null
  }

  store.setFitStatus('running')
  const statusText = reason === 'auto' ? '측정이 완료되었습니다. 피팅을 계산 중…' : '피팅을 계산 중입니다…'
  store.setMessages({ status: statusText, warning: '' })

  try {
    const result = fitMalus(samples) || null
    if (!result) {
      store.setFitResult(null)
      store.setFitStatus('error')
      store.setMessages({ status: '', warning: '피팅 결과를 계산하지 못했습니다.' })
      return null
    }

    store.setFitResult(result)
    store.setFitStatus('success')
    const completeText = reason === 'auto' ? '측정 및 피팅이 완료되었습니다.' : '피팅 계산이 완료되었습니다.'
    store.setMessages({ status: completeText, warning: '' })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    store.setFitResult(null)
    store.setFitStatus('error')
    store.setMessages({ status: '', warning: `피팅 실패: ${message}` })
    console.error('fitMalus failed', error)
    return null
  }
}

const startProgressTimer = (durationMs) => {
  clearProgressTimer()
  currentSweepDuration = durationMs
  const startedAt = Date.now()
  store.setWorkflow({
    sweepDurationMs: durationMs,
    sweepRemainingMs: durationMs,
    sweepStartedAt: startedAt,
    sweepProgress: 0,
  })

  progressTimerId = window.setInterval(() => {
    const now = Date.now()
    const elapsed = now - startedAt
    const progress = Math.min(100, (elapsed / durationMs) * 100)
    const remaining = Math.max(0, durationMs - elapsed)

    store.setWorkflow({
      sweepProgress: progress,
      sweepRemainingMs: remaining,
    })

    if (elapsed >= durationMs) {
      clearProgressTimer()
      const state = store.getState()
      if (state.workflow.measuring) {
        stopMeasurement({
          statusMessage: '측정을 완료했습니다. 분석 결과를 확인하세요.',
          markComplete: true,
        }).catch((error) => {
          console.error('stopMeasurement failed', error)
        })
      }
    }
  }, SWEEP_PROGRESS_INTERVAL)
}

const appendSamplesFromChunk = (chunk) => {
  rxBuffer += chunk
  let newlineIndex = rxBuffer.indexOf('\n')
  while (newlineIndex !== -1) {
    const rawLine = rxBuffer.slice(0, newlineIndex)
    rxBuffer = rxBuffer.slice(newlineIndex + 1)
    const { type, payload } = classifyNotification(rawLine)

    if (type === 'control') {
      handleControlMessage(payload)
    } else if (type === 'data') {
      const sample = parseSample(payload)
      if (sample) {
        store.appendSample(sample)
      }
    }

    newlineIndex = rxBuffer.indexOf('\n')
  }
}

const handleControlMessage = (message) => {
  const text = (message ?? '').trim()
  if (!text) return
  const upper = text.toUpperCase()
  if (upper === 'SWEEP_DONE' || upper === 'SWEEP_COMPLETE') {
    stopMeasurement({
      skipCommand: true,
      statusMessage: '측정이 완료되었습니다. 분석 결과를 확인하세요.',
      markComplete: true,
    }).catch((error) => {
      console.error('stopMeasurement failed', error)
    })
    return
  }
  if (upper.startsWith('ERROR')) {
    store.setMessages({ status: '', warning: `장치 오류: ${text}` })
  } else {
    store.setMessages({ status: `장치: ${text}`, warning: '' })
  }
}

const stopMeasurement = async ({
  skipCommand = false,
  statusMessage = '측정을 종료했습니다. 분석 결과를 확인하세요.',
  warningMessage = '',
  markComplete = false,
  step = 'analyze',
} = {}) => {
  const state = store.getState()
  if (!state.workflow.measuring) {
    if (statusMessage || warningMessage) {
      store.setMessages({ status: statusMessage, warning: warningMessage })
    }
    return
  }

  if (!skipCommand && state.connection.status === 'connected') {
    try {
      await sendStop()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warningMessage = warningMessage
        ? `${warningMessage} (STOP 실패: ${message})`
        : `측정 중지 명령 전송 실패: ${message}`
      console.warn('sendStop failed', error)
    }
  }

  finalizeMeasurement({ status: statusMessage, warning: warningMessage, step, markComplete })
  if (markComplete) {
    performFit('auto').catch((error) => {
      console.error('performFit(auto) failed', error)
    })
  } else {
    store.setFitStatus('idle')
  }
}

const handleBleDisconnectEvent = () => {
  const wasMeasuring = store.getState().workflow.measuring
  rxBuffer = ''
  store.resetSamples()
  store.setConnection({ status: 'disconnected', deviceName: null })
  store.setFitResult(null)
  store.setFitStatus('idle')

  if (wasMeasuring) {
    finalizeMeasurement({
      status: '',
      warning: '연결이 해제되어 측정이 중단되었습니다.',
      step: 'prepare',
      markComplete: false,
    })
  } else {
    clearProgressTimer()
    store.setWorkflow({
      measuring: false,
      sweepProgress: 0,
      sweepRemainingMs: 0,
      sweepDurationMs: 0,
      sweepStartedAt: null,
    })
    store.setStep('prepare')
    store.setMessages({ status: '연결이 해제되었습니다.', warning: '' })
  }
}

const ensureDisconnectHook = () => {
  if (hasRegisteredDisconnect) return
  onDisconnect(handleBleDisconnectEvent)
  hasRegisteredDisconnect = true
}

const handleConnect = async () => {
  if (!isSupported()) {
    store.setConnection({ status: 'unsupported' })
    store.setMessages({ status: '', warning: '이 브라우저에서는 Web Bluetooth를 사용할 수 없습니다.' })
    return
  }

  try {
    ensureDisconnectHook()
    store.setConnection({ status: 'requesting' })
    store.setMessages({ status: 'micro:bit 장치를 선택하세요.', warning: '' })
    const device = await requestDevice()
    const deviceName = device?.name ?? 'micro:bit'

    store.setConnection({ status: 'connecting', deviceName })
    store.setMessages({ status: '장치와 연결 중…', warning: '' })

    await connect()
    await startNotifications(appendSamplesFromChunk)

    rxBuffer = ''
    store.resetSamples()
    store.setConnection({ status: 'connected', deviceName })
    store.setStep('prepare')
    store.setMessages({ status: 'BLE 연결이 완료되었습니다.', warning: '' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    store.setConnection({ status: 'disconnected', deviceName: null })
    store.setMessages({ status: '', warning: `연결 실패: ${message}` })
    await disconnect().catch(() => {})
    rxBuffer = ''
  }
}

const handleDisconnect = async () => {
  const currentStatus = store.getState().connection.status
  if (currentStatus !== 'connected') {
    handleBleDisconnectEvent()
    return
  }

  store.setConnection({ status: 'disconnecting' })
  store.setMessages({ status: '연결을 해제하는 중입니다…', warning: '' })

  try {
    await disconnect()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    store.setMessages({ status: '', warning: `연결 해제 중 오류: ${message}` })
  }
}

const startMeasurement = async () => {
  const state = store.getState()
  if (state.connection.status !== 'connected') {
    store.setMessages({ status: '', warning: '장비 연결 후 측정을 시작할 수 있습니다.' })
    return
  }
  if (state.workflow.measuring) {
    store.setMessages({ status: '', warning: '이미 측정이 진행 중입니다.' })
    return
  }

  store.setFitResult(null)
  store.setFitStatus('idle')
  store.resetSamples()
  store.setWorkflow({ measuring: true, sweepProgress: 0 })
  store.setStep('measure')
  store.setMessages({ status: '측정을 시작했습니다. 측정 중지는 언제든 가능합니다.', warning: '' })

  try {
    await sendSweep(DEFAULT_SWEEP)
    startProgressTimer(DEFAULT_SWEEP.duration)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finalizeMeasurement({
      status: '',
      warning: `측정 시작 실패: ${message}`,
      step: 'prepare',
      markComplete: false,
    })
    store.setFitStatus('error')
  }
}

const stopMeasurementHandler = async () => {
  await stopMeasurement()
}

const handleDownloadCsv = () => {
  const samples = store.getState().samples
  if (!Array.isArray(samples) || samples.length === 0) {
    store.setMessages({ status: '', warning: '다운로드할 데이터가 없습니다.' })
    return
  }
  downloadCsv(samples)
  store.setMessages({ status: 'CSV 다운로드를 시작했습니다.', warning: '' })
}

const handleRunFit = () => {
  performFit('manual').catch((error) => {
    console.error('performFit(manual) failed', error)
  })
}

const handleReset = async () => {
  const state = store.getState()
  if (state.connection.status !== 'connected') {
    store.setMessages({ status: '', warning: '연결된 장치가 없습니다.' })
    return
  }
  store.setFitResult(null)
  store.setFitStatus('idle')
  try {
    await sendReset()
    store.setMessages({ status: '장치를 초기화했습니다.', warning: '' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    store.setMessages({ status: '', warning: `장치 초기화 실패: ${message}` })
  }
}

const initModules = () => {
  const stepIndicatorRoot = document.querySelector('[data-component="step-indicator"]')
  const connectionRoot = document.querySelector('[data-component="connection-panel"]')
  const measurementRoot = document.querySelector('[data-component="measurement-panel"]')
  const analysisRoot = document.querySelector('[data-component="analysis-panel"]')
  const lightChartRoot = document.querySelector('[data-component="light-chart"]')
  const statusBannerRoot = document.querySelector('[data-component="status-banner"]')
  const resetButton = document.querySelector('[data-action="device-reset"]')

  initStepIndicator(stepIndicatorRoot, store)
  initConnectionPanel(connectionRoot, store, {
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  })
  initMeasurementPanel(measurementRoot, store, {
    onStart: startMeasurement,
    onStop: stopMeasurementHandler,
  })
  initAnalysisPanel(analysisRoot, store, {
    onDownloadCsv: handleDownloadCsv,
    onRunFit: handleRunFit,
  })
  initLightChart(lightChartRoot, store)
  initStatusBanner(statusBannerRoot, store)

  if (resetButton) {
    resetButton.addEventListener('click', (event) => {
      event.preventDefault()
      handleReset()
    })
  }
}

const init = () => {
  if (!isSupported()) {
    store.setConnection({ status: 'unsupported' })
    store.setMessages({ status: '', warning: '이 브라우저 환경에서는 Web Bluetooth가 지원되지 않습니다.' })
  } else {
    store.setMessages({ status: '장비 연결 버튼을 눌러 실험을 시작하세요.', warning: '' })
  }

  ensureDisconnectHook()
  initModules()
}

document.addEventListener('DOMContentLoaded', init)

export { stopMeasurement }
