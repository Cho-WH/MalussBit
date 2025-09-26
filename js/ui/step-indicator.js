import { store, actions } from '../state.js'

const STEPS = ['prepare', 'calibrate', 'measure', 'analyze']

export const initStepIndicator = () => {
  const root = document.querySelector('[data-component="step-indicator"]')
  if (!root) return () => {}

  const buttons = Array.from(root.querySelectorAll('button[data-step]'))

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetStep = button.dataset.step
      if (!targetStep) return
      const state = store.getState()
      const currentIndex = STEPS.indexOf(state.currentStep)
      const targetIndex = STEPS.indexOf(targetStep)
      if (targetIndex === -1) return
      if (targetIndex <= currentIndex + 1) {
        store.dispatch(actions.setStep(targetStep))
      }
    })
  })

  const render = (state) => {
    const currentIndex = STEPS.indexOf(state.currentStep)
    buttons.forEach((button) => {
      const step = button.dataset.step
      const index = STEPS.indexOf(step)
      button.classList.toggle('active', index === currentIndex)
      button.classList.toggle('completed', index < currentIndex)
      button.disabled = index > currentIndex + 1
    })
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
