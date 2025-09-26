import { store } from '../state.js'

const buildPoint = (sample, mode) => {
  if (!sample) return null
  if (mode === 'angle-est' && typeof sample.angleEst === 'number') {
    return { x: sample.angleEst, y: sample.light }
  }
  return { x: sample.angleCmd, y: sample.light }
}

const getMode = (state) => {
  if (state.chartMode === 'angle-est') return 'angle-est'
  return 'angle'
}

export const initLightChart = () => {
  const root = document.querySelector('[data-component="light-chart"]')
  if (!root) return () => {}

  const canvas = root.querySelector('canvas')
  const emptyEl = root.querySelector('[data-bind="empty"]')
  const subtitleEl = root.querySelector('[data-bind="subtitle"]')
  if (!canvas || typeof Chart === 'undefined') return () => {}

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'scatter',
    data: { datasets: [{ label: '조도', data: [] }] },
    options: {
      animation: false,
      scales: {
        x: { type: 'linear', title: { display: true, text: '각도 (deg)' } },
        y: { title: { display: true, text: '조도 (arb.)' } },
      },
      plugins: {
        legend: { display: false },
      },
    },
  })

  const render = (state) => {
    const mode = getMode(state)
    const data = state.history.map((sample) => buildPoint(sample, mode)).filter(Boolean)
    chart.data.datasets[0].data = data
    chart.update('none')
    if (emptyEl) emptyEl.hidden = data.length > 0
    if (subtitleEl) {
      const stepText = {
        prepare: '준비 단계입니다. 장비를 연결하세요.',
        calibrate: '자동 보정을 실행해 0점을 맞추세요.',
        measure: '측정 중… 실시간 데이터를 확인하세요.',
        analyze: '측정이 완료되었습니다. 피팅 결과를 검토하세요.',
      }
      subtitleEl.textContent = stepText[state.currentStep] ?? '실험 상태를 확인하세요.'
    }
  }

  const unsubscribe = store.subscribe(render)

  return () => {
    unsubscribe()
    chart.destroy()
  }
}
