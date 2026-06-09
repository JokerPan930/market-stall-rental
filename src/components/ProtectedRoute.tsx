import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

// 路由守卫组件 - 未登录重定向到登录页
interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthStore()

  // 正在加载时显示加载状态
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500">加载中...</div>
      </div>
    )
  }

  // 未登录则重定向到登录页
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
