import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

// 登录页面
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  // 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password.trim()) {
      setError('请输入密码')
      return
    }

    setSubmitting(true)
    const success = await login(username, password, remember)
    setSubmitting(false)

    if (success) {
      navigate('/', { replace: true })
    } else {
      setError('用户名或密码错误')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-primary-800 to-slate-900 p-4">
      {/* 登录卡片 */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* 左侧装饰区域 */}
        <div className="hidden md:flex w-2/5 bg-primary-700 flex-col items-center justify-center p-8 text-white">
          <Store className="w-20 h-20 mb-6 opacity-90" />
          <h2 className="text-2xl font-bold mb-2">市场摊位</h2>
          <h2 className="text-2xl font-bold mb-4">租赁管理系统</h2>
          <p className="text-primary-200 text-sm text-center leading-relaxed">
            高效管理市场摊位租赁业务<br />
            轻松掌控租户、合同与费用
          </p>
        </div>

        {/* 右侧登录表单 */}
        <div className="flex-1 p-8 md:p-12">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Store className="w-8 h-8 text-primary-700" />
            <h2 className="text-xl font-bold text-slate-800">摊位租赁管理</h2>
          </div>

          <h3 className="text-2xl font-bold text-slate-800 mb-2">欢迎登录</h3>
          <p className="text-slate-500 text-sm mb-8">请输入您的账号信息</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="请输入用户名"
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors pr-10"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 记住我 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 text-primary-700 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                记住我
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary-700 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
