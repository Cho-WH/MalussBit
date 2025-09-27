const parseFinite = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

export const parseSample = (raw) => {
  if (typeof raw !== 'string') {
    return null
  }

  const segments = raw.split(',').map((part) => part.trim())
  if (segments.length < 3) {
    return null
  }

  const [tsStr, angleCmdStr, lightStr] = segments

  const deviceTimestamp = parseFinite(tsStr)
  const angleCmd = parseFinite(angleCmdStr)
  const illuminance = parseFinite(lightStr)

  if (deviceTimestamp === undefined || angleCmd === undefined || illuminance === undefined) {
    return null
  }

  return {
    timestamp: Date.now(),
    deviceTimestamp,
    angleCmd,
    illuminance,
  }
}
