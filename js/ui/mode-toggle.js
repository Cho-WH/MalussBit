import { store, actions } from '../state.js'

export const initModeToggle = () => {
  const root = document.querySelector('[data-component="mode-toggle"]')
  if (!root) return () => {}

  const checkbox = root.querySelector('input[data-action="toggle-mode"]')
  if (!checkbox) return () => {}

  checkbox.addEventListener('change', () => {
    const mode = checkbox.checked ? 'instructor' : 'student'
    store.dispatch(actions.setUiMode(mode))
  })

  const render = (state) => {
    const isInstructor = state.uiMode === 'instructor'
    if (checkbox) checkbox.checked = isInstructor
    document.body.dataset.uiMode = state.uiMode
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
