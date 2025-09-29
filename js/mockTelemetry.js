import { store, actions } from './state.js'

const START_DEG = 0
const END_DEG = 180
const INTERVAL_MS = 50

const randomBetween = (min, max) => Math.random() * (max - min) + min
const toRadians = (deg) => (deg * Math.PI) / 180

const generateSample = (angle) => {
  const amplitude = 40
  const offset = 10
  const phaseDeg = 15
  const noise = randomBetween(-1.5, 1.5)
  const value = offset + amplitude * Math.cos(toRadians(angle + phaseDeg)) ** 2 + noise
  return Math.max(0, value)
}

export const initMockTelemetry = () => {
  store.dispatch(actions.setStatus('connected'))
  store.dispatch(actions.resetMeasurement())

  const startSweep = () => {
    store.dispatch(actions.resetMeasurement())
    store.dispatch(actions.setMeasurementStatus('running'))
    let angle = START_DEG
    const timer = window.setInterval(() => {
      const illuminance = generateSample(angle)
      store.dispatch(
        actions.setSample({
          timestamp: Date.now(),
          deviceTimestamp: angle * INTERVAL_MS,
          angleCmd: angle,
          illuminance,
        })
      )
      angle += 1
      if (angle > END_DEG) {
        window.clearInterval(timer)
        store.dispatch(actions.setMeasurementStatus('idle'))
      }
    }, INTERVAL_MS)
  }

  const reset = () => {
    store.dispatch(actions.resetMeasurement())
    store.dispatch(actions.setMeasurementStatus('idle'))
  }

  if (typeof window !== 'undefined') {
    window.__malussMock = {
      startSweep,
      reset,
    }
  }

  return () => {
    if (typeof window !== 'undefined' && window.__malussMock) {
      delete window.__malussMock
    }
  }
}
