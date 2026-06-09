import { create } from 'zustand'

// 用户信息类型
interface User {
  id: number
  username: string
  role: string
  displayName: string
}

// 认证状态类型
interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

// 认证状态管理
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  // 登录
  login: async (username: string, password: string, remember?: boolean) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, remember }),
      })
      const data = await res.json()
      if (data.success) {
        // 登录成功后获取用户信息
        const store = useAuthStore.getState()
        await store.fetchMe()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  // 获取当前用户信息
  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.data) {
        set({ user: data.data, loading: false })
      } else {
        set({ user: null, loading: false })
      }
    } catch {
      set({ user: null, loading: false })
    }
  },

  // 退出登录
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      set({ user: null })
    }
  },
}))
