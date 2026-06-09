import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useAuthStore } from './store/auth'
import './index.css'

// 应用启动时获取用户信息
useAuthStore.getState().fetchMe()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
