import { defineContentScript } from 'wxt/utils/define-content-script'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { onVideoChange } from '../../lib/youtube'
import './style.css'

function findAnchor(): HTMLElement | null {
  return (
    document.querySelector('#secondary') ||
    document.querySelector('[aria-label="Secondary"]') ||
    document.querySelector('ytd-watch-flexy #related')
  )
}

function watchForAnchor(ui: any) {
  const observer = new MutationObserver(() => {
    const anchor = findAnchor()
    if (!anchor && ui) {
      ui.remove()
    } else if (anchor && !document.querySelector('#play-ai-root')) {
      ui.mount()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

async function renderApp(container: HTMLElement) {
  const React = await import('react')
  const ReactDOM = await import('react-dom/client')
  const AppModule = await import('./App')
  const App = AppModule.default

  const root = document.createElement('div')
  root.id = 'play-ai-root'
  container.append(root)

  container.style.fontSize = '16px'

  const appRoot = ReactDOM.createRoot(root)
  appRoot.render(React.createElement(App))
}

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'play-ai-overlay',
      position: 'inline',
      anchor: findAnchor,
      onMount(container: HTMLElement) {
        renderApp(container)
      },
    })

    ui.mount()

    const cleanup = onVideoChange(() => {
      ui.remove()
      ui.mount()
    })

    ctx.onInvalidated(() => {
      cleanup()
      ui.remove()
    })

    watchForAnchor(ui)
  },
})
