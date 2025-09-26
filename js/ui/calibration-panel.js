import { store, actions } from '../state.js'
import { setServoSpeed, writeLine } from '../bluetooth.js'

const getNumber = (input, fallback) => {
  if (!input) return fallback
  const value = Number(input.value)
  return Number.isFinite(value) ? value : fallback
}

export const initCalibrationPanel = () => {
  const root = document.querySelector('[data-component="calibration-panel"]')
  if (!root) return () => {}

  const autoButton = root.querySelector('[data-action="run-auto-calibration"]')
  const toggleManualBtn = root.querySelector('[data-action="toggle-manual"]')
  const manualContainer = root.querySelector('.manual')
  const applyButton = root.querySelector('[data-action="apply-manual"]')
  const statusText = root.querySelector('[data-bind="status"]')
  const inputZero = root.querySelector('[data-input="angle-zero"]')
  const inputScale = root.querySelector('[data-input="angle-scale"]')
  const inputSpeed = root.querySelector('[data-input="servo-speed"]')

  let manualOpen = false

  const render = (state) => {
    const { calibration, workflow, uiMode } = state
    const isConnected = state.connectionStatus === 'connected'
    if (autoButton) autoButton.disabled = !isConnected || workflow.autoCalibrationRunning
    if (statusText) {
      statusText.textContent = workflow.autoCalibrationRunning
        ? '자동 보정 실행 중...'
        : '보정을 실행하면 0점과 각도 스케일이 자동 적용됩니다.'
    }
    if (inputZero) inputZero.value = calibration.angleZero
    if (inputScale) inputScale.value = calibration.angleScale
    if (inputSpeed) inputSpeed.value = calibration.servoSpeedDegPerSec

    const showManual = manualOpen && uiMode === 'instructor'
    if (manualContainer) {
      manualContainer.hidden = !showManual
    }
    if (toggleManualBtn) {
      toggleManualBtn.hidden = uiMode !== 'instructor'
      toggleManualBtn.textContent = showManual ? '수동 보정 닫기' : '수동 보정 열기'
    }
  }

  autoButton?.addEventListener('click', async () => {
    const state = store.getState()
    if (state.connectionStatus !== 'connected') return
    store.dispatch(actions.setWorkflow({ autoCalibrationRunning: true }))
    store.dispatch(actions.setMessage({ status: '자동 보정을 실행 중입니다.', warning: undefined }))
    store.dispatch(actions.setStep('calibrate'))
    try {
      await writeLine('CALIBRATE')
    } catch (error) {
      const message = error instanceof Error ? error.message : '자동 보정 명령을 전송하지 못했습니다.'
      store.dispatch(actions.setWorkflow({ autoCalibrationRunning: false }))
      store.dispatch(actions.setMessage({ status: undefined, warning: message }))
    }
  })

  toggleManualBtn?.addEventListener('click', () => {
    manualOpen = !manualOpen
    render(store.getState())
  })

  applyButton?.addEventListener('click', async () => {
    const state = store.getState()
    const next = {
      angleZero: getNumber(inputZero, state.calibration.angleZero),
      angleScale: getNumber(inputScale, state.calibration.angleScale),
      servoSpeedDegPerSec: getNumber(inputSpeed, state.calibration.servoSpeedDegPerSec),
    }
    store.dispatch(actions.setCalibration(next))
    store.dispatch(actions.setMessage({ status: '수동 보정 값을 적용했습니다.', warning: undefined }))
    try {
      await setServoSpeed(next.servoSpeedDegPerSec)
    } catch (error) {
      const message = error instanceof Error ? error.message : '서보 속도 설정에 실패했습니다.'
      store.dispatch(actions.setMessage({ status: undefined, warning: message }))
    }
  })

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
