import { store } from '../state.js'
import { formatNumber } from '../utils/format.js'

const buildFitLine = (fitResult, angles) => {
  if (!fitResult || typeof fitResult.predict !== 'function' || !Array.isArray(angles) || angles.length === 0) {
    return []
  }

  const finiteAngles = angles.filter((angle) => Number.isFinite(angle))
  if (finiteAngles.length === 0) {
    return []
  }

  const minAngle = Math.min(...finiteAngles)
  const maxAngle = Math.max(...finiteAngles)
  if (!Number.isFinite(minAngle) || !Number.isFinite(maxAngle)) {
    return []
  }

  const span = Math.max(maxAngle - minAngle, 1)
  const steps = Math.min(240, Math.max(60, Math.round(span * 2)))
  const step = span / steps
  const line = []
  for (let i = 0; i <= steps; i += 1) {
    const angle = minAngle + step * i
    const value = fitResult.predict(angle)
    if (Number.isFinite(value)) {
      line.push({ x: angle, y: value })
    }
  }
  return line
}

export const initIntensityChart = () => {
  const root = document.querySelector('[data-component="intensity-chart"]')
  if (!root) return

  const canvas = root.querySelector('canvas')
  const emptyEl = root.querySelector('[data-bind="empty"]')
  const subtitleEl = root.querySelector('[data-bind="dataset"]')

  if (!canvas) return

  const Chart = window.Chart
  if (!Chart) {
    if (emptyEl) {
      emptyEl.textContent = 'Chart.js 로드를 실패했습니다.'
      emptyEl.style.display = 'flex'
    }
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Illuminance',
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.35)',
          pointRadius: 3,
        },
        {
          label: 'Malus Fit',
          type: 'line',
          data: [],
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.15)',
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
          hidden: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '각도 (deg)',
          },
          ticks: {
            color: '#94a3b8',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
          },
        },
        y: {
          title: {
            display: true,
            text: '조도 (단위)',
          },
          ticks: {
            color: '#94a3b8',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#e2e8f0',
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const x = context.parsed.x
              const y = context.parsed.y
              return `각도 ${formatNumber(x, 1)}°, 조도 ${formatNumber(y, 2)}`
            },
          },
        },
      },
    },
  })

  const scatterDataset = chart.data.datasets[0]
  const fitDataset = chart.data.datasets[1]

  const render = (state) => {
    const samples = state.history
    const hasData = samples.length > 0

    if (subtitleEl) {
      const sampleLabel = hasData ? `${samples.length}개 샘플` : '샘플을 기다리는 중…'
      if (state.fit.status === 'success' && state.fit.result) {
        subtitleEl.textContent = `${sampleLabel} • R² ${formatNumber(state.fit.result.r2, 3)}`
      } else {
        subtitleEl.textContent = sampleLabel
      }
    }

    if (!hasData) {
      scatterDataset.data = []
      fitDataset.data = []
      fitDataset.hidden = true
      chart.update('none')
      if (emptyEl) {
        emptyEl.hidden = false
      }
      return
    }

    scatterDataset.data = samples.map((sample) => ({
      x: sample.angleCmd,
      y: sample.illuminance,
    }))

    const fitResult = state.fit.status === 'success' ? state.fit.result : null
    if (fitResult) {
      const line = buildFitLine(fitResult, samples.map((sample) => sample.angleCmd))
      fitDataset.data = line
      fitDataset.hidden = line.length === 0
    } else {
      fitDataset.data = []
      fitDataset.hidden = true
    }

    chart.update('none')

    if (emptyEl) {
      emptyEl.hidden = true
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe?.()
    chart.destroy()
  }
}
