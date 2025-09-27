import { store, actions } from '../state.js'
import { sendSweepCommand } from '../bluetooth.js'

export const initMeasurementControls = () => {
  const root = document.querySelector('[data-component="measurement-controls"]')
  if (!root) return

  const startBtn = root.querySelector('[data-action="start"]')
  if (!startBtn) return

  const render = (state) => {
    startBtn.disabled = state.connectionStatus !== 'connected'
  }

  startBtn.addEventListener('click', async () => {
    const state = store.getState()
    if (state.connectionStatus !== 'connected') {
      return
    }
    try {
      startBtn.disabled = true
      store.dispatch(actions.clearHistory())
      await sendSweepCommand()
    } catch (error) {
      console.error(error)
      store.dispatch(actions.setError('스윕 명령 전송 중 오류가 발생했습니다.'))
    } finally {
      startBtn.disabled = store.getState().connectionStatus !== 'connected'
    }
  })

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe?.()
  }
}
