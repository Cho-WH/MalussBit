export const initMeasurementPanel = (root, store, actions) => {
  if (!root || !store) return

  const toggleBtn = root.querySelector('[data-action="toggle-measurement"]')
  const progressBar = root.querySelector('[data-role="progress-bar"]')
  const progressLabel = root.querySelector('[data-role="progress-label"]')

  const { onStart, onStop } = actions ?? {}
  let currentState = store.getState()

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (event) => {
      event.preventDefault()
      const state = currentState
      if (!state) return
      if (state.workflow.measuring) {
        if (typeof onStop === 'function') onStop()
      } else {
        if (typeof onStart === 'function') onStart()
      }
    })
  }

  store.subscribe((state) => {
    currentState = state
    const isConnected = state.connection.status === 'connected'
    const isMeasuring = state.workflow.measuring
    const progress = Math.max(0, Math.min(100, state.workflow.sweepProgress ?? 0))
    const remainingMs = state.workflow.sweepRemainingMs ?? null

    if (toggleBtn) {
      toggleBtn.disabled = !isConnected && !isMeasuring
      toggleBtn.textContent = isMeasuring ? '측정 중지' : '측정 시작'
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`
    }

    if (progressLabel) {
      if (!isConnected) {
        progressLabel.textContent = '연결 후 측정을 시작하세요.'
      } else if (!isMeasuring) {
        progressLabel.textContent = '대기 중'
      } else {
        const percentText = `${Math.round(progress)}% 진행 중`
        if (Number.isFinite(remainingMs) && remainingMs > 0) {
          const seconds = Math.ceil(remainingMs / 1000)
          progressLabel.textContent = `${percentText} (약 ${seconds}s 남음)`
        } else {
          progressLabel.textContent = percentText
        }
      }
    }

    root.classList.toggle('is-active', state.currentStep === 'measure')
  })
}
