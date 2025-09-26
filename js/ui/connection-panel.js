const STATUS_TEXT = {
  unsupported: '이 브라우저는 Web Bluetooth를 지원하지 않습니다.',
  disconnected: '연결 대기 중입니다.',
  requesting: '장치를 선택해 주세요…',
  connecting: '연결 중…',
  connected: '연결 완료.',
  disconnecting: '연결을 해제하는 중…',
}

export const initConnectionPanel = (root, store, actions) => {
  if (!root || !store) return
  const connectBtn = root.querySelector('[data-action="connect"]')
  const disconnectBtn = root.querySelector('[data-action="disconnect"]')
  const statusText = root.querySelector('[data-bind="status"]')
  const helperText = root.querySelector('[data-bind="helper"]')
  const deviceLabel = root.querySelector('[data-bind="device"]')

  const { onConnect, onDisconnect } = actions ?? {}

  if (connectBtn && typeof onConnect === 'function') {
    connectBtn.addEventListener('click', (event) => {
      event.preventDefault()
      onConnect()
    })
  }

  if (disconnectBtn && typeof onDisconnect === 'function') {
    disconnectBtn.addEventListener('click', (event) => {
      event.preventDefault()
      onDisconnect()
    })
  }

  store.subscribe((state) => {
    const { connection } = state
    const status = connection.status || 'disconnected'
    if (statusText) {
      statusText.textContent = STATUS_TEXT[status] ?? STATUS_TEXT.disconnected
    }
    if (helperText) {
      if (status === 'unsupported') {
        helperText.textContent = 'Chrome 혹은 Edge 브라우저에서 HTTPS(또는 http://localhost) 환경으로 접속하세요.'
      } else {
        helperText.textContent = 'micro:bit 전원이 켜져 있고 페어링 모드인지 확인하세요.'
      }
    }
    if (deviceLabel) {
      deviceLabel.textContent = connection.deviceName ? `장치: ${connection.deviceName}` : ''
    }

    const isConnecting = status === 'requesting' || status === 'connecting'
    if (connectBtn) {
      connectBtn.disabled = status === 'unsupported' || isConnecting || status === 'connected'
    }
    if (disconnectBtn) {
      disconnectBtn.disabled = status !== 'connected'
    }
    root.classList.toggle('is-connected', status === 'connected')
  })
}
