const DEG_TO_RAD = Math.PI / 180

const DEFAULT_OPTIONS = {
  minSamples: 12,
  normalize: false,
  phaseRange: [-60, 60],
  phaseStep: 5,
  amplitudeScale: 1.1,
  offsetPadding: 10,
  maxIterations: 60,
  tolerance: 1e-4,
}

const mean = (values) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const sumOfSquares = (values) => values.reduce((sum, value) => sum + value * value, 0)

const modelValue = (angleDeg, params) => {
  const { amplitude, offset, phase } = params
  const theta = (angleDeg + phase) * DEG_TO_RAD
  const cosTerm = Math.cos(theta)
  return amplitude * cosTerm * cosTerm + offset
}

const computeRSquared = (samples, params) => {
  const yValues = samples.map((sample) => sample.light)
  const meanY = mean(yValues)
  const ssTot = samples.reduce((sum, sample) => sum + (sample.light - meanY) ** 2, 0)
  if (ssTot <= 0) return 1

  const ssRes = samples.reduce((sum, sample) => {
    const predicted = modelValue(sample.angle, params)
    const residual = sample.light - predicted
    return sum + residual * residual
  }, 0)

  return 1 - ssRes / ssTot
}

const clampPhase = (value, [minPhase, maxPhase]) => Math.max(minPhase, Math.min(maxPhase, value))

const coordinateDescent = (samples, initialParams, options) => {
  const phaseBounds = options.phaseRange ?? DEFAULT_OPTIONS.phaseRange
  const tolerance = options.tolerance ?? DEFAULT_OPTIONS.tolerance
  const maxIterations = options.maxIterations ?? DEFAULT_OPTIONS.maxIterations

  const current = { ...initialParams }
  let bestScore = computeRSquared(samples, current)

  const adjust = (key, delta) => {
    const next = { ...current, [key]: current[key] + delta }
    if (key === 'phase') {
      next.phase = clampPhase(next.phase, phaseBounds)
    }
    const score = computeRSquared(samples, next)
    if (score > bestScore) {
      bestScore = score
      Object.assign(current, next)
      return true
    }
    return false
  }

  let step = {
    amplitude: Math.max(0.1, Math.abs(current.amplitude) * 0.2),
    offset: Math.max(0.1, Math.abs(current.offset) * 0.2),
    phase: Math.max(1, (phaseBounds[1] - phaseBounds[0]) * 0.05),
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let improved = false
    ;(['amplitude', 'offset', 'phase']).forEach((key) => {
      const delta = step[key]
      if (adjust(key, delta) || adjust(key, -delta)) {
        improved = true
      }
    })

    if (!improved) {
      if (Math.max(step.amplitude, step.offset, step.phase) <= tolerance) {
        break
      }
      step = {
        amplitude: step.amplitude * 0.5,
        offset: step.offset * 0.5,
        phase: Math.max(0.1, step.phase * 0.5),
      }
    }
  }

  return { params: current, rSquared: bestScore }
}

const gridSearch = (samples, options, stats) => {
  const phaseBounds = options.phaseRange ?? DEFAULT_OPTIONS.phaseRange
  const phaseStep = options.phaseStep ?? DEFAULT_OPTIONS.phaseStep
  const [phaseMin, phaseMax] = phaseBounds
  const lightValues = samples.map((sample) => sample.light)
  const maxLight = Math.max(...lightValues)
  const minLight = Math.min(...lightValues)

  const amplitudeMax = (stats.stdLight * (options.amplitudeScale ?? DEFAULT_OPTIONS.amplitudeScale)) || maxLight
  const offsetMin = minLight - (options.offsetPadding ?? DEFAULT_OPTIONS.offsetPadding)
  const offsetMax = maxLight + (options.offsetPadding ?? DEFAULT_OPTIONS.offsetPadding)

  let best = {
    params: {
      amplitude: Math.max(1, amplitudeMax * 0.5),
      offset: Math.max(0, maxLight * 0.1),
      phase: 0,
    },
    rSquared: -Infinity,
  }

  for (let phase = phaseMin; phase <= phaseMax; phase += phaseStep) {
    const params = {
      amplitude: Math.max(1, amplitudeMax * 0.5),
      offset: Math.max(0, maxLight * 0.1),
      phase,
    }
    const score = computeRSquared(samples, params)
    if (score > best.rSquared) {
      best = { params, rSquared: score }
    }
  }

  return best
}

const findExtrema = (params) => {
  const { phase } = params
  let maxAt = -phase
  let minAt = maxAt + 90

  while (maxAt < 0) maxAt += 360
  while (maxAt >= 360) maxAt -= 360
  while (minAt < 0) minAt += 360
  while (minAt >= 360) minAt -= 360

  return { maxAt, minAt }
}

export const fitMalus = (rawSamples, options = {}) => {
  const settings = { ...DEFAULT_OPTIONS, ...options }
  if (!Array.isArray(rawSamples)) return null
  if (rawSamples.length < settings.minSamples) return null

  const cleaned = rawSamples
    .filter((sample) => typeof sample.angle === 'number' && typeof sample.light === 'number')
    .map((sample) => ({ angle: sample.angle, light: sample.light }))
  if (cleaned.length < settings.minSamples) return null

  const lightValues = cleaned.map((sample) => sample.light)
  const meanLight = mean(lightValues)
  const stdLight = Math.sqrt(sumOfSquares(lightValues.map((value) => value - meanLight)) / cleaned.length) || 1

  const normalizedSamples = settings.normalize
    ? cleaned.map((sample) => ({ angle: sample.angle, light: (sample.light - meanLight) / stdLight }))
    : cleaned

  const initial = gridSearch(normalizedSamples, settings, { stdLight })
  const refined = coordinateDescent(normalizedSamples, initial.params, settings)

  const finalParams = refined.params
  const rSquared = refined.rSquared
  const extrema = findExtrema(finalParams)

  return {
    amplitude: finalParams.amplitude,
    offset: finalParams.offset,
    phase: finalParams.phase,
    rSquared,
    ...extrema,
  }
}
