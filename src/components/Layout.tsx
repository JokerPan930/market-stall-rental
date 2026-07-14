import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Users,
  FileText,
  Banknote,
  Settings,
  LogOut,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

// 导航菜单项配置
const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  {
    path: '/stalls',
    label: '摊位管理',
    icon: Store,
    children: [
      { path: '/stalls', label: '摊位管理' },
      { path: '/areas', label: '区域管理' },
    ],
  },
  { path: '/tenants', label: '租户管理', icon: Users },
  { path: '/leases', label: '租赁管理', icon: FileText },
  { path: '/finance', label: '费用管理', icon: Banknote },
  { path: '/settings', label: '系统设置', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // 退出登录
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // 判断菜单是否激活
  const isMenuActive = (path: string, children?: { path: string }[]) => {
    if (children) {
      return children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'))
    }
    return location.pathname === path
  }

  // 切换子菜单
  const toggleMenu = (path: string) => {
    setOpenMenu(openMenu === path ? null : path)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* 顶部导航栏 */}
      <header className="bg-primary-700 text-white flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between px-6 h-14">
          {/* 系统名称 */}
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6" />
            <h1 className="text-lg font-bold tracking-wide">市场摊位租赁管理系统</h1>
          </div>

          {/* 导航菜单 */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = isMenuActive(item.path, item.children)
              const hasChildren = item.children && item.children.length > 0
              const isOpen = openMenu === item.path

              if (hasChildren) {
                return (
                  <div key={item.path} className="relative">
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-800 text-white shadow-sm'
                          : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {/* 子菜单 */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[120px] z-50">
                        {item.children!.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => setOpenMenu(null)}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-primary-50 text-primary-700 font-medium'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-800 text-white shadow-sm'
                        : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* 用户信息 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
              <span className="text-sm">{user?.displayName || '用户'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-primary-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-primary-600"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
