const STEPS = ['prepare', 'measure', 'analyze']

export const initStepIndicator = (root, store) => {
  if (!root || !store) return
  const items = Array.from(root.querySelectorAll('[data-step]'))
  const labels = {
    prepare: '준비',
    measure: '측정',
    analyze: '분석',
  }

  items.forEach((item) => {
    const step = item.dataset.step
    if (!item.querySelector('[data-role="label"]')) {
      const label = document.createElement('span')
      label.dataset.role = 'label'
      label.textContent = labels[step] ?? step
      item.append(label)
    }
  })

  store.subscribe((state) => {
    items.forEach((item) => {
      item.classList.toggle('is-active', item.dataset.step === state.currentStep)
    })
  })
}
