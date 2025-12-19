import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initRemoteLogger } from './remoteLogger'

// Dev/opt-in only (prod iOS PWA: avoid extra failing fetch noise)
if (import.meta.env.DEV || localStorage.getItem('remoteLogger') === '1') {
  initRemoteLogger(8000)
}

window.addEventListener('pagehide', (e) => {
  console.log('[Lifecycle] pagehide', { persisted: (e as PageTransitionEvent).persisted })
})

window.addEventListener('pageshow', (e) => {
  console.log('[Lifecycle] pageshow', { persisted: (e as PageTransitionEvent).persisted })
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
