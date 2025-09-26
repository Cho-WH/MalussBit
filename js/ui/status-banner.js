export const initStatusBanner = (root, store) => {
  if (!root || !store) return

  const statusEl = root.querySelector('[data-role="status"]')
  const warningEl = root.querySelector('[data-role="warning"]')

  store.subscribe((state) => {
    const { status, warning } = state.messages
    if (statusEl) {
      statusEl.textContent = status || ''
      statusEl.hidden = !status
    }
    if (warningEl) {
      warningEl.textContent = warning || ''
      warningEl.hidden = !warning
    }

    const hasMessage = Boolean(status) || Boolean(warning)
    root.hidden = !hasMessage
  })
}
