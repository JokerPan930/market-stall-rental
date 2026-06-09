import { useState, useEffect } from 'react'
import { Plus, Pencil } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'

// 用户数据类型
interface User {
  id: number
  username: string
  displayName: string
  role: string
  enabled: boolean
}

// 用户弹窗表单类型
interface UserFormData {
  username: string
  password: string
  role: string
  displayName: string
}

// 修改密码表单类型
interface PasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'users' | 'profile'>('users')

  // 用户管理状态
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [userModal, setUserModal] = useState<{ open: boolean; editId: number | null }>({ open: false, editId: null })
  const [userForm, setUserForm] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'operator',
    displayName: '',
  })
  const [userFormError, setUserFormError] = useState('')
  const [userSubmitting, setUserSubmitting] = useState(false)

  // 修改密码状态
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab])

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data || [])
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setUsers([
      { id: 1, username: 'admin', displayName: '管理员', role: 'admin', enabled: true },
      { id: 2, username: 'operator1', displayName: '操作员1', role: 'operator', enabled: true },
      { id: 3, username: 'operator2', displayName: '操作员2', role: 'operator', enabled: false },
    ])
    setLoading(false)
  }

  // 打开新增/编辑用户弹窗
  const openUserModal = (editId: number | null = null) => {
    if (editId) {
      const user = users.find((u) => u.id === editId)
      if (user) {
        setUserForm({
          username: user.username,
          password: '',
          role: user.role,
          displayName: user.displayName,
        })
      }
    } else {
      setUserForm({ username: '', password: '', role: 'operator', displayName: '' })
    }
    setUserFormError('')
    setUserModal({ open: true, editId })
  }

  // 提交用户表单
  const handleUserSubmit = async () => {
    setUserFormError('')

    if (!userForm.username.trim()) {
      setUserFormError('请输入用户名')
      return
    }
    if (!userModal.editId && !userForm.password.trim()) {
      setUserFormError('请输入密码')
      return
    }
    if (!userForm.displayName.trim()) {
      setUserFormError('请输入显示名称')
      return
    }

    setUserSubmitting(true)
    try {
      const url = userModal.editId ? `/api/users/${userModal.editId}` : '/api/users'
      const method = userModal.editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      const data = await res.json()
      if (data.success) {
        setUserModal({ open: false, editId: null })
        fetchUsers()
      } else {
        setUserFormError(data.error || '操作失败')
      }
    } catch {
      setUserFormError('网络错误')
    } finally {
      setUserSubmitting(false)
    }
  }

  // 切换用户启用状态
  const toggleUserEnabled = async (userId: number, enabled: boolean) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
    } catch {
      // 忽略错误
    }
    fetchUsers()
  }

  // 修改密码
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (!passwordForm.oldPassword) {
      setPasswordError('请输入原密码')
      return
    }
    if (!passwordForm.newPassword) {
      setPasswordError('请输入新密码')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密码至少6位')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的密码不一致')
      return
    }

    setPasswordSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPasswordSuccess(true)
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPasswordError(data.error || '修改失败')
      }
    } catch {
      setPasswordError('网络错误')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab切换 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-primary-700 border-b-2 border-primary-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-primary-700 border-b-2 border-primary-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            个人设置
          </button>
        </div>

        {/* 用户管理Tab */}
        {activeTab === 'users' && (
          <div className="p-5">
            {/* 新增用户按钮 */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openUserModal()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增用户
              </button>
            </div>

            {/* 用户列表 */}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">用户名</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">显示名称</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">角色</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">加载中...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">暂无用户</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 table-row-hover">
                      <td className="px-5 py-3 font-medium text-slate-800">{user.username}</td>
                      <td className="px-5 py-3 text-slate-600">{user.displayName}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {user.role === 'admin' ? '管理员' : '操作员'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={user.enabled ? 'enabled' : 'disabled'} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openUserModal(user.id)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* 启用/禁用开关 */}
                          <button
                            onClick={() => toggleUserEnabled(user.id, user.enabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              user.enabled ? 'bg-primary-700' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user.enabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 个人设置Tab */}
        {activeTab === 'profile' && (
          <div className="p-5">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">修改密码</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">原密码</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {passwordError && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">密码修改成功</div>
                )}

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {passwordSubmitting ? '提交中...' : '修改密码'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 新增/编辑用户弹窗 */}
      {userModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 animate-overlay-in"
            onClick={() => setUserModal({ open: false, editId: null })}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-modal-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {userModal.editId ? '编辑用户' : '新增用户'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    用户名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    密码 {!userModal.editId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={userModal.editId ? '不修改请留空' : '请输入密码'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    角色 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="admin">管理员</option>
                    <option value="operator">操作员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    显示名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.displayName}
                    onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="请输入显示名称"
                  />
                </div>

                {userFormError && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{userFormError}</div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setUserModal({ open: false, editId: null })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUserSubmit}
                disabled={userSubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {userSubmitting ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
