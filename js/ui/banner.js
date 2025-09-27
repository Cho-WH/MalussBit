import { store } from '../state.js'
import { isSupported } from '../bluetooth.js'

const createBanner = (type, message, role) => {
  const banner = document.createElement('div')
  banner.className = `banner ${type}`
  banner.textContent = message
  banner.dataset.role = role
  return banner
}

const upsertBanner = (host, { type, message, role }) => {
  if (!host) return null
  const existing = host.querySelector(`[data-role="${role}"]`)
  if (existing) {
    existing.className = `banner ${type}`
    existing.textContent = message
    return existing
  }
  const banner = createBanner(type, message, role)
  host.append(banner)
  return banner
}

const removeBanner = (host, role) => {
  if (!host) return
  const existing = host.querySelector(`[data-role="${role}"]`)
  if (existing) {
    existing.remove()
  }
}

export const initBanner = ({ mockEnabled = false } = {}) => {
  const host = document.getElementById('banner-root')
  if (!host) {
    return
  }

  if (!isSupported()) {
    upsertBanner(host, {
      type: 'warning',
      message: '이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome/Edge와 같은 최신 데스크톱 브라우저를 사용하거나 Android Chrome을 이용하세요.',
      role: 'support-warning',
    })
  }

  if (mockEnabled) {
    upsertBanner(host, {
      type: 'info',
      message: 'Mock 텔레메트리 모드입니다. 실제 장치를 연결하려면 ?mock=1 파라미터를 제거하세요.',
      role: 'mock-info',
    })
  }

  const render = (state) => {
    if (state.errorMessage) {
      upsertBanner(host, {
        type: 'error',
        message: state.errorMessage,
        role: 'runtime-error',
      })
    } else {
      removeBanner(host, 'runtime-error')
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe?.()
  }
}
