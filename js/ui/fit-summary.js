import { store, actions } from '../state.js'
import { fitMalus } from '../utils/malusFit.js'
import { formatNumber } from '../utils/format.js'

const MIN_SAMPLES = 12

const formatValue = (value, digits) => {
  return Number.isFinite(value) ? formatNumber(value, digits) : '—'
}

const buildSignature = (samples) => {
  if (!samples.length) return 'empty'
  const first = samples[0]?.timestamp ?? 0
  const last = samples[samples.length - 1]?.timestamp ?? 0
  return `${samples.length}:${first}:${last}`
}

const hasSufficientCoverage = (samples) => {
  if (!Array.isArray(samples) || samples.length < MIN_SAMPLES) {
    return false
  }
  const angles = samples
    .map((sample) => sample?.angleCmd)
    .filter((angle) => Number.isFinite(angle))
  if (angles.length < MIN_SAMPLES) {
    return false
  }
  const minAngle = Math.min(...angles)
  const maxAngle = Math.max(...angles)
  return Number.isFinite(minAngle) && Number.isFinite(maxAngle) && maxAngle - minAngle >= 60
}

export const initFitSummary = () => {
  const root = document.querySelector('[data-component="fit-summary"]')
  if (!root) return

  const runBtn = root.querySelector('[data-action="run-fit"]')
  const amplitudeEl = root.querySelector('[data-bind="amplitude"]')
  const offsetEl = root.querySelector('[data-bind="offset"]')
  const phaseEl = root.querySelector('[data-bind="phase"]')
  const r2El = root.querySelector('[data-bind="r2"]')
  const messageEl = root.querySelector('[data-bind="fit-message"]')

  let lastSignature = null
  let autoRunScheduled = false

  const setMessage = (text) => {
    if (messageEl) {
      messageEl.textContent = text
    }
  }

  const runFit = () => {
    const state = store.getState()
    const samples = state.history

    if (!hasSufficientCoverage(samples)) {
      const coverageMessage = samples.length < MIN_SAMPLES
        ? `샘플이 부족합니다. 최소 ${MIN_SAMPLES}개 필요합니다.`
        : '각도 범위가 충분하지 않습니다. 0°에서 180°까지 스윕을 완료했는지 확인하세요.'
      store.dispatch(actions.setFitStatus({ status: 'idle', error: coverageMessage, result: null }))
      return
    }

    const signature = buildSignature(samples)
    store.dispatch(actions.setFitStatus({ status: 'running', result: state.fit.result, error: undefined }))

    const fit = fitMalus(samples, { minSamples: MIN_SAMPLES })
    if (fit.ok) {
      const resultWithSignature = { ...fit.result, signature }
      store.dispatch(actions.setFitStatus({ status: 'success', result: resultWithSignature, error: undefined }))
      lastSignature = signature
    } else {
      store.dispatch(actions.setFitStatus({ status: 'idle', result: null, error: fit.error }))
      store.dispatch(actions.setError(fit.error))
      lastSignature = signature
    }
  }

  const render = (state) => {
    const { fit, history } = state
    const samples = history
    const signature = buildSignature(samples)

    if (runBtn) {
      runBtn.disabled = fit.status === 'running' || !hasSufficientCoverage(samples)
    }

    if (fit.status === 'success' && fit.result) {
      amplitudeEl.textContent = formatValue(fit.result.amplitude, 3)
      offsetEl.textContent = formatValue(fit.result.offset, 3)
      phaseEl.textContent = formatValue(fit.result.phaseDeg, 2)
      r2El.textContent = formatValue(fit.result.r2, 3)
      setMessage('피팅이 완료되었습니다.')
      lastSignature = fit.result.signature ?? signature
    } else if (fit.status === 'running') {
      amplitudeEl.textContent = '…'
      offsetEl.textContent = '…'
      phaseEl.textContent = '…'
      r2El.textContent = '…'
      setMessage('피팅 중…')
    } else if (fit.error) {
      amplitudeEl.textContent = '—'
      offsetEl.textContent = '—'
      phaseEl.textContent = '—'
      r2El.textContent = '—'
      setMessage(fit.error)
    } else {
      amplitudeEl.textContent = '—'
      offsetEl.textContent = '—'
      phaseEl.textContent = '—'
      r2El.textContent = '—'
      if (!samples.length) {
        setMessage('피팅 결과가 준비되면 여기에 표시됩니다.')
      } else if (!hasSufficientCoverage(samples)) {
        const info = samples.length < MIN_SAMPLES
          ? `충분한 데이터를 수집하면 피팅을 실행할 수 있습니다. (현재 ${samples.length}개)`
          : '각도 범위가 충분하지 않습니다. 스윕을 끝까지 완료하세요.'
        setMessage(info)
      } else {
        setMessage('피팅 결과가 준비되면 여기에 표시됩니다.')
      }
    }

    if (hasSufficientCoverage(samples) && fit.status !== 'running' && signature !== lastSignature && !autoRunScheduled) {
      autoRunScheduled = true
      window.setTimeout(() => {
        autoRunScheduled = false
        runFit()
      }, 150)
    }
  }

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runFit()
    })
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe?.()
  }
}
