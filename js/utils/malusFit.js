const isFiniteNumber = (value) => Number.isFinite(value)

const buildDesignRow = (angleRad) => {
  const cos2 = Math.cos(2 * angleRad)
  const sin2 = Math.sin(2 * angleRad)
  return [1, cos2, sin2]
}

const invertSymmetric3 = (m) => {
  const [a00, a01, a02, a11, a12, a22] = m
  const det =
    a00 * (a11 * a22 - a12 * a12) -
    a01 * (a01 * a22 - a12 * a02) +
    a02 * (a01 * a12 - a11 * a02)

  if (Math.abs(det) < 1e-9) {
    return null
  }

  const invDet = 1 / det
  const m00 = (a11 * a22 - a12 * a12) * invDet
  const m01 = (a02 * a12 - a01 * a22) * invDet
  const m02 = (a01 * a12 - a02 * a11) * invDet
  const m11 = (a00 * a22 - a02 * a02) * invDet
  const m12 = (a01 * a02 - a00 * a12) * invDet
  const m22 = (a00 * a11 - a01 * a01) * invDet

  return [m00, m01, m02, m01, m11, m12, m02, m12, m22]
}

const multiplyMatrixVector = (matrix, vector) => {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
  ]
}

const radians = (degrees) => (degrees * Math.PI) / 180

const normalizePhaseDeg = (deg) => {
  let result = deg
  while (result <= -180) result += 360
  while (result > 180) result -= 360
  return result
}

export const fitMalus = (samples, { minSamples = 12 } = {}) => {
  if (!Array.isArray(samples) || samples.length < minSamples) {
    return { ok: false, error: `샘플이 부족합니다. 최소 ${minSamples}개 이상의 데이터가 필요합니다.` }
  }

  const filtered = samples
    .map((sample) => ({
      angle: sample?.angleCmd,
      illuminance: sample?.illuminance,
    }))
    .filter(({ angle, illuminance }) => isFiniteNumber(angle) && isFiniteNumber(illuminance))

  if (filtered.length < minSamples) {
    return { ok: false, error: `유효한 각도/조도 데이터가 부족합니다.` }
  }

  let sumY = 0
  filtered.forEach(({ illuminance }) => {
    sumY += illuminance
  })
  const meanY = sumY / filtered.length

  let m00 = filtered.length
  let m01 = 0
  let m02 = 0
  let m11 = 0
  let m12 = 0
  let m22 = 0
  let b0 = 0
  let b1 = 0
  let b2 = 0

  const designRows = []
  filtered.forEach(({ angle, illuminance }) => {
    const angleRad = radians(angle)
    const row = buildDesignRow(angleRad)
    designRows.push(row)
    const [x0, x1, x2] = row

    m01 += x0 * x1
    m02 += x0 * x2
    m11 += x1 * x1
    m12 += x1 * x2
    m22 += x2 * x2

    b0 += x0 * illuminance
    b1 += x1 * illuminance
    b2 += x2 * illuminance
  })

  const normalMatrix = [m00, m01, m02, m11, m12, m22]
  const inverse = invertSymmetric3(normalMatrix)
  if (!inverse) {
    return { ok: false, error: '피팅 행렬이 특이합니다. 다른 데이터로 다시 시도하세요.' }
  }

  const coefficients = multiplyMatrixVector(inverse, [b0, b1, b2])
  const [c0, c1, c2] = coefficients

  const halfAmplitude = Math.sqrt(c1 * c1 + c2 * c2)
  const amplitude = 2 * halfAmplitude
  const offset = c0 - halfAmplitude
  const phaseRad = 0.5 * Math.atan2(-c2, c1)
  const phaseDeg = normalizePhaseDeg((phaseRad * 180) / Math.PI)

  const predictions = designRows.map(([x0, x1, x2]) => x0 * c0 + x1 * c1 + x2 * c2)
  let ssResidual = 0
  let ssTotal = 0
  const residuals = []

  for (let i = 0; i < filtered.length; i += 1) {
    const { illuminance } = filtered[i]
    const pred = predictions[i]
    const residual = illuminance - pred
    residuals.push(residual)
    ssResidual += residual * residual
    const diff = illuminance - meanY
    ssTotal += diff * diff
  }

  const r2 = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssResidual / ssTotal)) : 1

  const predict = (angleDeg) => {
    const [x0, x1, x2] = buildDesignRow(radians(angleDeg))
    return x0 * c0 + x1 * c1 + x2 * c2
  }

  return {
    ok: true,
    result: {
      amplitude,
      offset,
      phaseRad,
      phaseDeg,
      coefficients: { c0, c1, c2 },
      residuals,
      r2,
      predict,
      sampleCount: filtered.length,
    },
  }
}
