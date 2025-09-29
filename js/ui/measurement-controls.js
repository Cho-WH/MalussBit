import { store, actions } from '../state.js'
import { sendSweepCommand, sendResetCommand } from '../bluetooth.js'

export const initMeasurementControls = () => {
  const root = document.querySelector('[data-component="measurement-controls"]')
  if (!root) return

  const startBtn = root.querySelector('[data-action="start"]')
  const resetBtn = root.querySelector('[data-action="reset"]')
  if (!startBtn || !resetBtn) return

  const render = (state) => {
    const isConnected = state.connectionStatus === 'connected'
    const status = state.measurementStatus
    startBtn.disabled = !isConnected || status !== 'idle'
    resetBtn.disabled = !isConnected || status === 'resetting'
  }

  startBtn.addEventListener('click', async () => {
    const state = store.getState()
    if (state.connectionStatus !== 'connected' || state.measurementStatus !== 'idle') {
      return
    }
    try {
      store.dispatch(actions.setError(undefined))
      store.dispatch(actions.resetMeasurement())
      store.dispatch(actions.setMeasurementStatus('running'))
      await sendSweepCommand()
    } catch (error) {
      console.error(error)
      store.dispatch(actions.setMeasurementStatus('idle'))
      store.dispatch(actions.setError('스윕 명령 전송 중 오류가 발생했습니다.'))
    }
  })

  resetBtn.addEventListener('click', async () => {
    const state = store.getState()
    if (state.connectionStatus !== 'connected' || state.measurementStatus === 'resetting') {
      return
    }
    try {
      store.dispatch(actions.setError(undefined))
      store.dispatch(actions.setMeasurementStatus('resetting'))
      await sendResetCommand()
      store.dispatch(actions.resetMeasurement())
    } catch (error) {
      console.error(error)
      store.dispatch(actions.setMeasurementStatus('idle'))
      store.dispatch(actions.setError('RESET 명령 전송 중 오류가 발생했습니다.'))
    }
  })

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe?.()
  }
}
