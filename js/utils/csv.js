const CSV_HEADER = 'timestamp_ms,angle_deg,light_level'

export const buildCsv = (samples) => {
  if (!Array.isArray(samples) || samples.length === 0) {
    return CSV_HEADER
  }

  const rows = samples.map((sample) =>
    [sample.timestamp, sample.angle, sample.light]
      .map((value) => (value ?? '')).join(',')
  )

  return [CSV_HEADER, ...rows].join('
')
}

export const downloadCsv = (samples, filename = 'malus-log.csv') => {
  if (!Array.isArray(samples) || samples.length === 0) {
    return
  }

  const csvContent = buildCsv(samples)
  const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}
