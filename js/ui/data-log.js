import { store } from '../state.js'
import { formatTimestamp } from '../utils/format.js'
import { downloadCsv } from '../utils/csv.js'

const buildRow = (sample) => {
  const row = document.createElement('tr')
  const cells = [
    formatTimestamp(sample.timestamp),
    sample.angleCmd ?? '—',
    sample.angleEst ?? '—',
    sample.light ?? '—',
  ]
  cells.forEach((value) => {
    const td = document.createElement('td')
    td.textContent = value === undefined ? '—' : value
    row.append(td)
  })
  return row
}

export const initDataLog = () => {
  const root = document.querySelector('[data-component="data-log"]')
  if (!root) return () => {}

  const tbody = root.querySelector('[data-bind="rows"]')
  const downloadBtn = root.querySelector('[data-action="download"]')
  if (!tbody) return () => {}

  const render = (state) => {
    const samples = state.history
    tbody.innerHTML = ''
    if (!samples.length) {
      const emptyRow = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = 4
      td.textContent = '데이터를 수신하면 로그가 표시됩니다.'
      emptyRow.append(td)
      tbody.append(emptyRow)
      if (downloadBtn) downloadBtn.disabled = true
      return
    }

    samples.slice(-20).forEach((sample) => {
      tbody.append(buildRow(sample))
    })

    if (downloadBtn) downloadBtn.disabled = false
  }

  downloadBtn?.addEventListener('click', () => {
    const samples = store.getState().history
    downloadCsv(samples)
  })

  const unsubscribe = store.subscribe(render)

  return () => {
    unsubscribe()
  }
}
