const HISTORY_LIMIT = 400

const INITIAL_FIT = {
  status: 'idle',
  result: undefined,
  error: undefined,
}

const INITIAL_STATE = {
  connectionStatus: 'disconnected',
  device: undefined,
  service: undefined,
  txCharacteristic: undefined,
  latestSample: undefined,
  history: [],
  fit: { ...INITIAL_FIT },
  lastUpdatedAt: undefined,
  errorMessage: undefined,
  measurementStatus: 'idle',
}

let currentState = { ...INITIAL_STATE }
const listeners = new Set()

const appendSample = (history, sample) => {
  const next = history.concat(sample)
  if (next.length > HISTORY_LIMIT) {
    return next.slice(next.length - HISTORY_LIMIT)
  }
  return next
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'setStatus':
      return { ...state, connectionStatus: action.status }
    case 'setDevice':
      return {
        ...state,
        device: action.payload?.device,
        service: action.payload?.service,
        txCharacteristic: action.payload?.txCharacteristic,
      }
    case 'setSample': {
      const sample = action.sample
      if (!sample) return state
      return {
        ...state,
        latestSample: sample,
        history: appendSample(state.history, sample),
        lastUpdatedAt: sample.timestamp,
        errorMessage: undefined,
      }
    }
    case 'setFitStatus':
      return {
        ...state,
        fit: {
          status: action.status,
          result: action.result ?? state.fit.result,
          error: action.error,
        },
      }
    case 'setMeasurementStatus':
      return {
        ...state,
        measurementStatus: action.status,
      }
    case 'clearHistory':
      return {
        ...state,
        latestSample: undefined,
        history: [],
        lastUpdatedAt: undefined,
      }
    case 'resetMeasurement':
      return {
        ...state,
        latestSample: undefined,
        history: [],
        lastUpdatedAt: undefined,
        fit: { ...INITIAL_FIT },
        errorMessage: undefined,
      }
    case 'setError':
      return { ...state, errorMessage: action.message }
    case 'reset': {
      return {
        ...INITIAL_STATE,
        fit: { ...INITIAL_FIT },
      }
    }
    default:
      return state
  }
}

const notify = () => {
  listeners.forEach((listener) => {
    listener(currentState)
  })
}

export const store = {
  getState() {
    return currentState
  },
  dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      return
    }
    const nextState = reducer(currentState, action)
    if (nextState !== currentState) {
      currentState = nextState
      notify()
    }
  },
  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {}
    }
    listeners.add(listener)
    listener(currentState)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const constants = {
  HISTORY_LIMIT,
}

export const actions = {
  setStatus: (status) => ({ type: 'setStatus', status }),
  setDevice: (payload) => ({ type: 'setDevice', payload }),
  setSample: (sample) => ({ type: 'setSample', sample }),
  setFitStatus: ({ status, result, error }) => ({ type: 'setFitStatus', status, result, error }),
  setMeasurementStatus: (status) => ({ type: 'setMeasurementStatus', status }),
  setError: (message) => ({ type: 'setError', message }),
  clearHistory: () => ({ type: 'clearHistory' }),
  resetMeasurement: () => ({ type: 'resetMeasurement' }),
  reset: () => ({ type: 'reset' }),
}
