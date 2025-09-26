import { store, actions } from '../state.js'
import { fitMalus } from '../analysis/malusFit.js'

const interpretFit = (result) => {
  if (!result) return '피팅 결과가 없습니다.'
  const { r2 } = result
  if (r2 >= 0.95) return '결정계수 0.95 이상, 매우 양호한 결과입니다.'
  if (r2 >= 0.85) return '결정계수 0.85 이상, 양호한 결과입니다.'
  return '결정계수가 낮습니다. 정렬이나 외광을 점검하세요.'
}

const saveReport = (state) => {
  if (!state.fitResult) {
    store.dispatch(actions.setMessage({ status: undefined, warning: '저장할 결과가 없습니다.' }))
    return
  }
  const lines = [
    'MalussBit 측정 요약',
    `A: ${state.fitResult.A}`,
    `B: ${state.fitResult.B}`,
    `phi0 (deg): ${state.fitResult.phi0}`,
    `R^2: ${state.fitResult.r2}`,
    `잔차 RMS: ${state.fitResult.residualRms}`,
    `정규화 여부: ${state.fitResult.normalized ? '예' : '아니오'}`,
    `샘플 수: ${state.fitResult.sampleSize}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'malussbit-summary.txt'
  anchor.click()
  URL.revokeObjectURL(url)
}

const runFit = (options = {}) => {
  const state = store.getState()
  const samples = state.history
  if (!samples.length) {
    if (!options.silent) {
      store.dispatch(actions.setMessage({ status: undefined, warning: '피팅할 데이터가 없습니다.' }))
    }
    return null
  }
  const result = fitMalus(samples, state.calibration, { normalize: options.normalize })
  store.dispatch(actions.setFitResult(result || undefined))
  if (!result) {
    store.dispatch(actions.setMessage({ status: undefined, warning: '피팅에 실패했습니다.' }))
    return null
  }
  store.dispatch(actions.setMessage({ status: interpretFit(result), warning: undefined }))
  return result
}

export const initAnalysisActions = () => {
  const root = document.querySelector('[data-component="analysis-actions"]')
  if (!root) return () => {}

  const runButton = root.querySelector('[data-action="run-fit"]')
  const saveButton = root.querySelector('[data-action="save-report"]')
  const summaryEl = root.querySelector('[data-bind="summary"]')

  runButton?.addEventListener('click', () => {
    runFit()
  })

  saveButton?.addEventListener('click', () => {
    const state = store.getState()
    if (!state.fitResult) {
      saveReport(state)
      return
    }
    saveReport(state)
  })

  let wasRunning = false

  const render = (state) => {
    const { measurementRunning, sweepProgress } = state.workflow
    if (summaryEl) {
      summaryEl.textContent = state.fitResult ? interpretFit(state.fitResult) : '측정이 완료되면 결과 요약이 여기에 표시됩니다.'
    }
    if (state.history.length === 0) {
      runButton?.setAttribute('disabled', 'disabled')
      saveButton?.setAttribute('disabled', 'disabled')
    } else {
      runButton?.removeAttribute('disabled')
      saveButton?.removeAttribute('disabled')
    }

    if (wasRunning && !measurementRunning && sweepProgress >= 90) {
      const result = runFit({ silent: true })
      if (result) {
        store.dispatch(actions.setStep('analyze'))
      }
    }
    wasRunning = measurementRunning
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}

export { runFit }
