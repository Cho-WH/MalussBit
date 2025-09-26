import { store } from '../state.js'

export const initStatusBanner = () => {
  const root = document.querySelector('[data-component="status-banner"]')
  if (!root) return () => {}

  const render = (state) => {
    const { status, warning } = state.messages || {}
    const { errorMessage } = state
    const message = warning || errorMessage || status
    root.textContent = message || ''
    root.dataset.level = warning || errorMessage ? 'warning' : 'info'
    root.hidden = !message
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
