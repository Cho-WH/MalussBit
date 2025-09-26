const MAX_SAMPLE_COUNT = 500

const defaultState = {
  currentStep: 'prepare',
  connection: {
    status: 'disconnected',
    deviceName: null,
  },
  workflow: {
    measuring: false,
    sweepProgress: 0,
    sweepRemainingMs: 0,
    sweepDurationMs: 0,
    sweepStartedAt: null,
  },
  samples: [],
  fitResult: null,
  fitStatus: 'idle',
  messages: {
    status: '',
    warning: '',
  },
  notes: '',
}

const cloneState = (state) => JSON.parse(JSON.stringify(state))

export const initState = () => {
  let state = cloneState(defaultState)
  const listeners = new Set()

  const getState = () => cloneState(state)

  const notify = () => {
    const snapshot = getState()
    listeners.forEach((listener) => {
      try {
        listener(snapshot)
      } catch (error) {
        console.error('State listener failed', error)
      }
    })
  }

  const setState = (partial) => {
    state = { ...state, ...partial }
    notify()
  }

  const setNested = (key, patch) => {
    state = {
      ...state,
      [key]: {
        ...state[key],
        ...patch,
      },
    }
    notify()
  }

  const appendSample = (sample) => {
    if (!sample) return
    const nextSamples = state.samples.concat(sample)
    if (nextSamples.length > MAX_SAMPLE_COUNT) {
      nextSamples.splice(0, nextSamples.length - MAX_SAMPLE_COUNT)
    }
    state = {
      ...state,
      samples: nextSamples,
    }
    notify()
  }

  const resetSamples = () => {
    if (state.samples.length === 0) return
    state = {
      ...state,
      samples: [],
    }
    notify()
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {}
    listeners.add(listener)
    listener(getState())
    return () => listeners.delete(listener)
  }

  return {
    getState,
    subscribe,
    setState,
    setStep: (step) => {
      if (!step) return
      setState({ currentStep: step })
    },
    setConnection: (patch) => {
      if (!patch) return
      setNested('connection', patch)
    },
    setWorkflow: (patch) => {
      if (!patch) return
      setNested('workflow', patch)
    },
    appendSample,
    resetSamples,
    setMessages: (patch) => {
      if (!patch) return
      setNested('messages', patch)
    },
    setNotes: (text) => {
      setState({ notes: text ?? '' })
    },
    setFitResult: (result) => {
      setState({ fitResult: result })
    },
    setFitStatus: (status) => {
      if (!status) return
      setState({ fitStatus: status })
    },
    reset: () => {
      state = cloneState(defaultState)
      notify()
    },
  }
}

export { MAX_SAMPLE_COUNT }
