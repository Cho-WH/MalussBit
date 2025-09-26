import { store } from '../state.js'
import { formatNumber } from '../utils/format.js'
import { runFit } from './analysis-actions.js'

const setResultText = (node, value, digits = 3) => {
  if (!node) return
  if (value === undefined || Number.isNaN(value)) {
    node.textContent = '—'
    return
  }
  node.textContent = formatNumber(value, digits)
}

const describeResult = (result) => {
  if (!result) return '측정이 끝나면 결과가 자동으로 계산됩니다.'
  if (result.r2 >= 0.95) return '결정계수 0.95 이상, 매우 양호한 결과입니다.'
  if (result.r2 >= 0.85) return '결정계수 0.85 이상, 양호한 결과입니다.'
  return '결정계수가 낮습니다. 정렬이나 외광을 점검하세요.'
}

export const initFittingPanel = () => {
  const root = document.querySelector('[data-component="fitting-panel"]')
  if (!root) return () => {}

  const resultNodes = {
    A: root.querySelector('[data-result="A"]'),
    B: root.querySelector('[data-result="B"]'),
    phi0: root.querySelector('[data-result="phi0"]'),
    r2: root.querySelector('[data-result="r2"]'),
    residual: root.querySelector('[data-result="residual"]'),
    sampleSize: root.querySelector('[data-result="sampleSize"]'),
  }
  const messageEl = root.querySelector('[data-result="message"]')
  const advanced = root.querySelector('.advanced')
  const rerunBtn = advanced?.querySelector('[data-action="run-fit"]')

  rerunBtn?.addEventListener('click', () => {
    runFit()
  })

  const render = (state) => {
    const { fitResult, uiMode } = state
    setResultText(resultNodes.A, fitResult?.A, 4)
    setResultText(resultNodes.B, fitResult?.B, 4)
    setResultText(resultNodes.phi0, fitResult?.phi0, 2)
    setResultText(resultNodes.r2, fitResult?.r2, 4)
    setResultText(resultNodes.residual, fitResult?.residualRms, 4)
    if (resultNodes.sampleSize) {
      resultNodes.sampleSize.textContent = fitResult?.sampleSize ?? '—'
    }

    if (messageEl) {
      messageEl.textContent = describeResult(fitResult)
    }

    if (advanced) {
      advanced.hidden = uiMode !== 'instructor'
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
