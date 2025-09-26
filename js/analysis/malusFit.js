const degToRad = (deg) => (deg * Math.PI) / 180

export const applyCalibration = (sample, calibration) => {
  if (!sample) return null
  const baseAngle = typeof sample.angleEst === 'number' ? sample.angleEst : sample.angleCmd
  if (!Number.isFinite(baseAngle)) return null
  const zero = calibration?.angleZero ?? 0
  const scale = calibration?.angleScale ?? 1
  return (baseAngle + zero) * scale
}

const solveLinear = (xs, ys) => {
  let sumC = 0
  let sumC2 = 0
  let sumY = 0
  let sumCY = 0
  const n = xs.length
  for (let i = 0; i < n; i += 1) {
    const c = xs[i]
    const y = ys[i]
    sumC += c
    sumC2 += c * c
    sumY += y
    sumCY += c * y
  }
  const denom = sumC2 * n - sumC * sumC
  if (Math.abs(denom) < 1e-9) return null
  const A = (sumCY * n - sumC * sumY) / denom
  const B = (sumY - A * sumC) / n
  return { A, B }
}

const evaluate = (samples, calibration, options, phiDeg) => {
  const phiRad = degToRad(phiDeg)
  const cosVals = []
  const yVals = []
  let minLight = Infinity
  let maxLight = -Infinity

  samples.forEach((sample) => {
    const calibrated = applyCalibration(sample, calibration)
    if (!Number.isFinite(calibrated)) return
    const light = Number(sample.light)
    if (!Number.isFinite(light)) return
    minLight = Math.min(minLight, light)
    maxLight = Math.max(maxLight, light)
    const theta = degToRad(calibrated)
    const cosTerm = Math.cos(theta + phiRad)
    cosVals.push(cosTerm * cosTerm)
    yVals.push(light)
  })

  if (cosVals.length < 5) return null

  let normalized = false
  let scaledYs = yVals
  if (options.normalize && maxLight > minLight) {
    normalized = true
    const range = maxLight - minLight
    scaledYs = yVals.map((value) => (value - minLight) / range)
  }

  const fit = solveLinear(cosVals, scaledYs)
  if (!fit) return null

  const { A, B } = fit
  let ssTot = 0
  let ssRes = 0
  const mean = scaledYs.reduce((sum, value) => sum + value, 0) / scaledYs.length
  for (let i = 0; i < scaledYs.length; i += 1) {
    const predicted = A * cosVals[i] + B
    const diff = scaledYs[i] - predicted
    ssRes += diff * diff
    const totDiff = scaledYs[i] - mean
    ssTot += totDiff * totDiff
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  const residualRms = Math.sqrt(ssRes / scaledYs.length)

  return {
    score: ssRes,
    result: {
      A,
      B,
      phi0: phiDeg,
      r2,
      normalized,
      sampleSize: scaledYs.length,
      residualRms,
    },
  }
}

export const fitMalus = (samples, calibration, options = {}) => {
  if (!Array.isArray(samples) || samples.length < 5) return null
  const settings = {
    normalize: !!options.normalize,
    phiMin: options.phiMin ?? -30,
    phiMax: options.phiMax ?? 30,
    phiStep: options.phiStep ?? 1,
  }

  let best = null
  for (let phi = settings.phiMin; phi <= settings.phiMax; phi += settings.phiStep) {
    const evaluated = evaluate(samples, calibration, settings, phi)
    if (!evaluated) continue
    if (!best || evaluated.score < best.score) {
      best = evaluated
    }
  }

  return best ? best.result : null
}
