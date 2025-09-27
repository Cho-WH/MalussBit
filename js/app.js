import { initBanner } from './ui/banner.js'
import { initConnectionPanel } from './ui/connection-panel.js'
import { initMeasurementControls } from './ui/measurement-controls.js'
import { initIntensityChart } from './ui/intensity-chart.js'
import { initFitSummary } from './ui/fit-summary.js'
import { initDataLog } from './ui/data-log.js'
import { initMockTelemetry } from './mockTelemetry.js'

const cleanupTasks = []

const registerCleanup = (fn) => {
  if (typeof fn === 'function') {
    cleanupTasks.push(fn)
  }
}

const boot = () => {
  const params = new URLSearchParams(window.location.search)
  const mockEnabled = ['1', 'true', 'yes'].includes((params.get('mock') || '').toLowerCase())

  initBanner({ mockEnabled })

  registerCleanup(initConnectionPanel())
  registerCleanup(initMeasurementControls())
  registerCleanup(initIntensityChart())
  registerCleanup(initFitSummary())
  registerCleanup(initDataLog())

  if (mockEnabled) {
    const disposeMock = initMockTelemetry()
    registerCleanup(disposeMock)
  }

  window.addEventListener('beforeunload', () => {
    cleanupTasks.splice(0).forEach((fn) => {
      try {
        fn()
      } catch (error) {
        console.warn('Cleanup failed', error)
      }
    })
  })
}

document.addEventListener('DOMContentLoaded', boot)
