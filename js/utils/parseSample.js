export const parseSample = (line) => {
  if (typeof line !== 'string' || line.trim().length === 0) {
    return null
  }

  const [msRaw, cmdRaw, estRaw, lightRaw] = line.split(',')
  const timestamp = Number(msRaw)
  const angleCmd = Number(cmdRaw)
  const angleEst = estRaw !== undefined && estRaw.length > 0 ? Number(estRaw) : undefined
  const light = Number(lightRaw ?? '')

  if (!Number.isFinite(timestamp) || !Number.isFinite(angleCmd) || !Number.isFinite(light)) {
    return null
  }

  return {
    timestamp,
    angleCmd,
    angleEst: Number.isFinite(angleEst) ? angleEst : undefined,
    light,
  }
}
