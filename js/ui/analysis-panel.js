const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '—'
  return Number(value).toFixed(digits)
}

export const initAnalysisPanel = (root, store, actions) => {
  if (!root || !store) return

  const downloadBtn = root.querySelector('[data-action="download-csv"]')
  const fitBtn = root.querySelector('[data-action="run-fit"]')
  const helperText = root.querySelector('[data-role="helper"]')
  const statusText = root.querySelector('[data-role="status-text"]')
  const resultCard = root.querySelector('[data-role="result"]')

  const fields = {
    amplitude: root.querySelector('[data-field="amplitude"]'),
    offset: root.querySelector('[data-field="offset"]'),
    phase: root.querySelector('[data-field="phase"]'),
    rSquared: root.querySelector('[data-field="rSquared"]'),
    maxAt: root.querySelector('[data-field="maxAt"]'),
    minAt: root.querySelector('[data-field="minAt"]'),
  }

  const { onDownloadCsv, onRunFit } = actions ?? {}

  if (downloadBtn && typeof onDownloadCsv === 'function') {
    downloadBtn.addEventListener('click', (event) => {
      event.preventDefault()
      onDownloadCsv()
    })
  }

  if (fitBtn && typeof onRunFit === 'function') {
    fitBtn.addEventListener('click', (event) => {
      event.preventDefault()
      onRunFit()
    })
  }

  store.subscribe((state) => {
    const hasSamples = state.samples.length > 0
    const inAnalysis = state.currentStep === 'analyze'
    const isRunning = state.fitStatus === 'running'
    const hasResult = state.fitStatus === 'success' && state.fitResult

    const disableDownload = !inAnalysis || state.workflow.measuring || !hasSamples || isRunning
    const disableFit = !inAnalysis || state.workflow.measuring || !hasSamples || isRunning

    if (downloadBtn) {
      downloadBtn.disabled = disableDownload
    }
    if (fitBtn) {
      fitBtn.disabled = disableFit
    }

    if (helperText) {
      if (!hasSamples) {
        helperText.textContent = '측정을 완료하면 결과를 확인할 수 있습니다.'
      } else if (!inAnalysis) {
        helperText.textContent = '측정을 중지하면 분석 단계가 열립니다.'
      } else if (state.fitStatus === 'running') {
        helperText.textContent = '피팅을 계산하는 중입니다…'
      } else if (state.fitStatus === 'success') {
        helperText.textContent = '피팅 결과를 확인하세요.'
      } else if (state.fitStatus === 'error') {
        helperText.textContent = '피팅에 실패했습니다. 샘플을 확인하거나 다시 실행해 보세요.'
      } else {
        helperText.textContent = `${state.samples.length}개 샘플이 준비되었습니다.`
      }
    }

    if (statusText) {
      if (state.fitStatus === 'running') {
        statusText.textContent = '피팅 계산 중…'
      } else if (state.fitStatus === 'success' && state.fitResult) {
        statusText.textContent = `결정계수 R² = ${formatNumber(state.fitResult.rSquared, 3)}`
      } else if (state.fitStatus === 'error') {
        statusText.textContent = '피팅을 수행하지 못했습니다.'
      } else {
        statusText.textContent = ''
      }
    }

    if (resultCard) {
      if (hasResult) {
        resultCard.hidden = false
        const result = state.fitResult
        if (fields.amplitude) fields.amplitude.textContent = formatNumber(result.amplitude)
        if (fields.offset) fields.offset.textContent = formatNumber(result.offset)
        if (fields.phase) fields.phase.textContent = `${formatNumber(result.phase, 1)}°`
        if (fields.rSquared) fields.rSquared.textContent = formatNumber(result.rSquared, 3)
        if (fields.maxAt) fields.maxAt.textContent = `${formatNumber(result.maxAt, 1)}°`
        if (fields.minAt) fields.minAt.textContent = `${formatNumber(result.minAt, 1)}°`
      } else {
        resultCard.hidden = true
      }
    }

    root.classList.toggle('is-active', inAnalysis)
    root.classList.toggle('has-result', hasResult)
  })
}
