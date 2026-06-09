import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Users,
  FileText,
  Banknote,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

// 导航菜单项配置
const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/stalls', label: '摊位管理', icon: Store },
  { path: '/tenants', label: '租户管理', icon: Users },
  { path: '/leases', label: '租赁管理', icon: FileText },
  { path: '/finance', label: '费用管理', icon: Banknote },
  { path: '/settings', label: '系统设置', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // 退出登录
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* 左侧导航栏 */}
      <aside className="w-60 flex-shrink-0 bg-primary-700 text-white flex flex-col">
        {/* 系统名称 */}
        <div className="px-5 py-6 border-b border-primary-600">
          <h1 className="text-lg font-bold leading-tight">市场摊位</h1>
          <h1 className="text-lg font-bold leading-tight">租赁管理系统</h1>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-800 text-white'
                    : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 底部用户信息 */}
        <div className="px-5 py-4 border-t border-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
              <span className="text-sm truncate">{user?.displayName || '用户'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-primary-200 hover:text-white transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部标题栏 */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">
            市场摊位租赁管理系统
          </h2>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
