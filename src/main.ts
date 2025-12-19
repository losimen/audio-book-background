import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initRemoteLogger } from './remoteLogger'

// Initialize remote logging to port 8000
// Only needed for debugging on device
initRemoteLogger(8000);

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
