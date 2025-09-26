import { store } from '../state.js'
import { formatNumber } from '../utils/format.js'

const fields = [
  { key: 'light', selector: '[data-field="light"] [data-role="value"]', digits: 0 },
  { key: 'angleCmd', selector: '[data-field="angle-cmd"] [data-role="value"]', digits: 1 },
  { key: 'angleEst', selector: '[data-field="angle-est"] [data-role="value"]', digits: 1 },
]

export const initLiveStats = () => {
  const root = document.querySelector('[data-component="live-stats"]')
  if (!root) return () => {}

  const targets = fields.map(({ selector }) => root.querySelector(selector))

  const render = (state) => {
    const sample = state.latestSample
    targets.forEach((node, index) => {
      if (!node) return
      const config = fields[index]
      if (!sample) {
        node.textContent = '—'
        return
      }
      const value = sample[config.key]
      if (value === undefined) {
        node.textContent = '—'
        return
      }
      node.textContent = formatNumber(value, config.digits)
    })
  }

  const unsubscribe = store.subscribe(render)

  return () => {
    unsubscribe()
  }
}
