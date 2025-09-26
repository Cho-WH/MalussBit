import { store, actions } from '../state.js'

const copyToClipboard = async (text) => {
  if (!text) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export const initSessionNotes = () => {
  const root = document.querySelector('[data-component="session-notes"]')
  if (!root) return () => {}

  const textarea = root.querySelector('textarea[data-bind="notes"]')
  const copyBtn = root.querySelector('[data-action="copy"]')
  const clearBtn = root.querySelector('[data-action="clear"]')

  textarea?.addEventListener('input', () => {
    store.dispatch(actions.setNotes(textarea.value))
  })

  copyBtn?.addEventListener('click', async () => {
    try {
      await copyToClipboard(store.getState().notes)
      store.dispatch(actions.setMessage({ status: '메모를 클립보드에 복사했습니다.', warning: undefined }))
    } catch (error) {
      const message = error instanceof Error ? error.message : '클립보드 복사에 실패했습니다.'
      store.dispatch(actions.setMessage({ status: undefined, warning: message }))
    }
  })

  clearBtn?.addEventListener('click', () => {
    store.dispatch(actions.setNotes(''))
    store.dispatch(actions.setMessage({ status: '메모를 비웠습니다.', warning: undefined }))
  })

  const render = (state) => {
    if (textarea && textarea.value !== state.notes) {
      textarea.value = state.notes
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.getState())

  return () => {
    unsubscribe()
  }
}
