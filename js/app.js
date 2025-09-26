import { isSupported } from './bluetooth.js'
import { initConnectionPanel } from './ui/connection-panel.js'
import { initCalibrationPanel } from './ui/calibration-panel.js'
import { initMeasurementPanel } from './ui/measurement-panel.js'
import { initAnalysisActions } from './ui/analysis-actions.js'
import { initLiveStats } from './ui/live-stats.js'
import { initLightChart } from './ui/light-chart.js'
import { initDataLog } from './ui/data-log.js'
import { initFittingPanel } from './ui/fitting-panel.js'
import { initSessionNotes } from './ui/session-notes.js'
import { initModeToggle } from './ui/mode-toggle.js'
import { initStatusBanner } from './ui/status-banner.js'
import { initStepIndicator } from './ui/step-indicator.js'

const init = () => {
  if (!isSupported()) {
    const helper = document.querySelector('[data-component="connection-panel"] [data-bind="helper"]')
    if (helper) {
      helper.textContent =
        '이 환경은 Web Bluetooth를 지원하지 않습니다. Chrome/Edge에서 HTTPS 또는 http://localhost 로 접속해 주세요.'
    }
  }

  const disposers = [
    initModeToggle(),
    initStatusBanner(),
    initStepIndicator(),
    initConnectionPanel(),
    initCalibrationPanel(),
    initMeasurementPanel(),
    initAnalysisActions(),
    initLiveStats(),
    initLightChart(),
    initDataLog(),
    initFittingPanel(),
    initSessionNotes(),
  ].filter((fn) => typeof fn === 'function')

  window.addEventListener('beforeunload', () => {
    disposers.forEach((dispose) => {
      try {
        dispose()
      } catch (error) {
        console.warn('dispose error', error)
      }
    })
  })
}

document.addEventListener('DOMContentLoaded', init)
