import { store, actions } from '../state.js'
import { startSweep, stopSweep } from '../bluetooth.js'

const DEFAULT_SWEEP = { fromDeg: 0, toDeg: 180 }

export const initMeasurementPanel = () => {
  const root = document.querySelector('[data-component="measurement-panel"]')
  if (!root) return () => {}

  const toggleButton = root.querySelector('[data-action="toggle-measurement"]')
  const stopButton = root.querySelector('[data-action="stop-measurement"]')
  const progressBar = root.querySelector('[data-bind="progress"]')
  const progressText = root.querySelector('[data-bind="progress-text"]')
  const etaText = root.querySelector('[data-bind="eta"]')

  let progressTimer = null

  const updateProgress = () => {
    const state = store.getState()
    const { measurementRunning, lastRunAt, sweepDurationMs } = state.workflow
    if (!measurementRunning || !lastRunAt) return
    const elapsed = Date.now() - lastRunAt
    const duration = sweepDurationMs || 1
    const progress = Math.min(100, Math.round((elapsed / duration) * 100))
    store.dispatch(actions.setWorkflow({ sweepProgress: progress }))
    if (progress >= 100) {
      void finishMeasurement(false)
    }
  }

  const startProgressTimer = () => {
    stopProgressTimer()
    progressTimer = window.setInterval(updateProgress, 250)
  }

  const stopProgressTimer = () => {
    if (progressTimer) {
      window.clearInterval(progressTimer)
      progressTimer = null
    }
  }

  const startMeasurement = async () => {
    const state = store.getState()
    if (state.connectionStatus !== 'connected') return
    if (state.workflow.measurementRunning) return
    if (state.workflow.autoCalibrationRunning) return
    try {
      const duration = state.workflow.sweepDurationMs || 6000
      store.dispatch(
        actions.setWorkflow({
          measurementRunning: true,
          sweepProgress: 0,
          lastRunAt: Date.now(),
          sweepDurationMs: duration,
        })
      )
      store.dispatch(actions.setStep('measure'))
      store.dispatch(actions.setMessage({ status: '측정을 시작했습니다.', warning: undefined }))
      await startSweep({ ...DEFAULT_SWEEP, durationMs: duration })
      startProgressTimer()
    } catch (error) {
      store.dispatch(actions.setWorkflow({ measurementRunning: false }))
      const message = error instanceof Error ? error.message : '측정 명령을 전송하지 못했습니다.'
      store.dispatch(actions.setMessage({ status: undefined, warning: message }))
    }
  }

  const finishMeasurement = async (manualStop) => {
    const state = store.getState()
    if (!state.workflow.measurementRunning && !manualStop) return
    stopProgressTimer()
    try {
      await stopSweep()
    } catch (error) {
      if (manualStop) {
        const message = error instanceof Error ? error.message : '측정을 중단하지 못했습니다.'
        store.dispatch(actions.setMessage({ status: undefined, warning: message }))
      }
    }
    store.dispatch(
      actions.setWorkflow({
        measurementRunning: false,
        sweepProgress: manualStop ? state.workflow.sweepProgress : 100,
        lastRunAt: undefined,
      })
    )
    store.dispatch(actions.setStep('analyze'))
    store.dispatch(actions.setMessage({ status: '측정이 완료되었습니다. 결과를 확인하세요.', warning: undefined }))
  }

  toggleButton?.addEventListener('click', () => {
    const state = store.getState()
    if (state.workflow.measurementRunning) {
      void finishMeasurement(true)
    } else {
      void startMeasurement()
    }
  })

  stopButton?.addEventListener('click', () => {
    void finishMeasurement(true)
  })

  const render = (state) => {
    const { measurementRunning, sweepProgress, sweepDurationMs, autoCalibrationRunning } = state.workflow
    const isConnected = state.connectionStatus === 'connected'
    if (toggleButton) {
      toggleButton.textContent = measurementRunning ? '측정 일시정지' : '측정 시작'
      toggleButton.disabled = !isConnected || autoCalibrationRunning
    }
    if (stopButton) {
      stopButton.disabled = !measurementRunning
    }
    if (progressBar) progressBar.style.width = `${sweepProgress ?? 0}%`
    if (progressText) {
      progressText.textContent = measurementRunning
        ? `진행률 ${sweepProgress ?? 0}%`
        : sweepProgress >= 100
        ? '측정 완료'
        : '대기 중'
    }
    if (etaText) {
      const seconds = Math.round((sweepDurationMs || 0) / 1000)
      etaText.textContent = `예상 소요 시간: 약 ${seconds}s`
    }
    if (!measurementRunning) {
      stopProgressTimer()
    } else if (!progressTimer) {
      startProgressTimer()
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
    stopProgressTimer()
  }
}
