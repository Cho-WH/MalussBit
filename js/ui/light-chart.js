import { MAX_SAMPLE_COUNT } from '../state.js'

export const initLightChart = (root, store) => {
  if (!root || !store) return

  const canvas = root.querySelector('canvas')
  const emptyMessage = root.querySelector('[data-role="empty"]')
  if (!canvas || typeof Chart === 'undefined') return

  const chart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Light vs Angle',
          data: [],
          borderColor: '#0b84ff',
          backgroundColor: 'rgba(11, 132, 255, 0.2)',
          showLine: true,
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: '각도 (°)' },
        },
        y: {
          title: { display: true, text: '조도' },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  })

  store.subscribe((state) => {
    const points = state.samples.map((sample) => ({ x: sample.angle, y: sample.light }))
    chart.data.datasets[0].data = points
    chart.update('none')

    if (emptyMessage) {
      emptyMessage.hidden = points.length > 0
    }

    const subtitle = root.querySelector('[data-role="meta"]')
    if (subtitle) {
      subtitle.textContent = points.length
        ? `${points.length} / ${MAX_SAMPLE_COUNT} 샘플`
        : '샘플이 수집되면 그래프가 표시됩니다.'
    }
  })
}
