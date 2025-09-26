const HISTORY_LIMIT_DEFAULT = 600

const INITIAL_CALIBRATION = {
  angleZero: 0,
  angleScale: 1,
  servoSpeedDegPerSec: 120,
}

const INITIAL_STATE = {
  connectionStatus: 'disconnected',
  currentStep: 'prepare',
  deviceInfo: undefined,
  uiMode: 'student',
  latestSample: undefined,
  history: [],
  historyLimit: HISTORY_LIMIT_DEFAULT,
  chartMode: 'angle',
  fitResult: undefined,
  calibration: { ...INITIAL_CALIBRATION },
  workflow: {
    autoCalibrationRunning: false,
    measurementRunning: false,
    sweepProgress: 0,
    sweepDurationMs: 6000,
    lastRunAt: undefined,
  },
  messages: {
    status: undefined,
    warning: undefined,
  },
  notes: '',
  errorMessage: undefined,
  lastUpdatedAt: undefined,
}

let currentState = { ...INITIAL_STATE }
const listeners = new Set()

const appendSample = (history, sample, limit) => {
  if (!sample) return history
  const next = history.concat(sample)
  if (next.length > limit) {
    return next.slice(next.length - limit)
  }
  return next
}

const reduce = (state, action) => {
  switch (action.type) {
    case 'setStatus':
      return { ...state, connectionStatus: action.status }
    case 'setDevice':
      return { ...state, deviceInfo: action.deviceInfo }
    case 'setStep':
      return { ...state, currentStep: action.step }
    case 'setSample': {
      const nextHistory = appendSample(state.history, action.sample, state.historyLimit)
      return {
        ...state,
        latestSample: action.sample,
        history: nextHistory,
        lastUpdatedAt: action.sample?.timestamp,
        errorMessage: undefined,
      }
    }
    case 'setHistoryLimit': {
      const limit = Math.max(1, Number(action.limit) || HISTORY_LIMIT_DEFAULT)
      const trimmed = state.history.slice(-limit)
      return { ...state, historyLimit: limit, history: trimmed }
    }
    case 'setChartMode':
      return { ...state, chartMode: action.mode }
    case 'setCalibration':
      return { ...state, calibration: { ...state.calibration, ...action.calibration } }
    case 'setFitResult':
      return { ...state, fitResult: action.fitResult }
    case 'setError':
      return { ...state, errorMessage: action.message }
    case 'setWorkflow':
      return { ...state, workflow: { ...state.workflow, ...action.workflow } }
    case 'setMessage':
      return { ...state, messages: { ...state.messages, ...action.message } }
    case 'setNotes':
      return { ...state, notes: action.notes }
    case 'setUiMode':
      return { ...state, uiMode: action.uiMode }
    case 'reset':
      return {
        ...INITIAL_STATE,
        calibration: state.calibration,
        historyLimit: state.historyLimit,
        chartMode: state.chartMode,
        notes: state.notes,
        uiMode: state.uiMode,
      }
    default:
      return state
  }
}

const notify = () => {
  listeners.forEach((listener) => listener(currentState))
}

export const store = {
  getState() {
    return currentState
  },
  dispatch(action) {
    if (!action || typeof action.type !== 'string') return
    const nextState = reduce(currentState, action)
    if (nextState !== currentState) {
      currentState = nextState
      notify()
    }
  },
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {}
    listeners.add(listener)
    listener(currentState)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const actions = {
  setStatus: (status) => ({ type: 'setStatus', status }),
  setDevice: (deviceInfo) => ({ type: 'setDevice', deviceInfo }),
  setStep: (step) => ({ type: 'setStep', step }),
  setSample: (sample) => ({ type: 'setSample', sample }),
  setHistoryLimit: (limit) => ({ type: 'setHistoryLimit', limit }),
  setChartMode: (mode) => ({ type: 'setChartMode', mode }),
  setCalibration: (calibration) => ({ type: 'setCalibration', calibration }),
  setFitResult: (fitResult) => ({ type: 'setFitResult', fitResult }),
  setError: (message) => ({ type: 'setError', message }),
  setWorkflow: (workflow) => ({ type: 'setWorkflow', workflow }),
  setMessage: (message) => ({ type: 'setMessage', message }),
  setNotes: (notes) => ({ type: 'setNotes', notes }),
  setUiMode: (uiMode) => ({ type: 'setUiMode', uiMode }),
  reset: () => ({ type: 'reset' }),
}

export const constants = {
  HISTORY_LIMIT_DEFAULT,
  INITIAL_CALIBRATION,
}
