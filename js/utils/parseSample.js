const isFiniteNumber = (value) => Number.isFinite(value)

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') {
    const parsed = Number.parseFloat(value)
    if (isFiniteNumber(parsed)) return parsed
  }
  return null
}

export const parseSample = (raw) => {
  if (typeof raw !== 'string') {
    return null
  }

  const segments = raw.split(',')
  if (segments.length < 3) {
    return null
  }

  const [timestampStr, angleStr, _angleEstStr = '', lightStr = ''] = segments.map((part) => part.trim())
  const timestamp = sanitizeNumber(timestampStr)
  const angle = sanitizeNumber(angleStr)
  const light = sanitizeNumber(lightStr)

  if (![timestamp, angle, light].every((value) => value !== null)) {
    return null
  }

  return {
    timestamp,
    angle,
    light,
  }
}
