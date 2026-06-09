import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// 租户表单数据类型
interface TenantFormData {
  name: string
  phone: string
  idCard: string
  address: string
  notes: string
}

export default function TenantForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<TenantFormData>({
    name: '',
    phone: '',
    idCard: '',
    address: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 获取租户信息（编辑模式）
  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenants/${id}`)
      const data = await res.json()
      if (data.success && data.data) {
        const tenant = data.data
        setForm({
          name: tenant.name,
          phone: tenant.phone,
          idCard: tenant.idCard,
          address: tenant.address || '',
          notes: tenant.notes || '',
        })
        return
      }
    } catch {
      // 使用模拟数据
    }
    setForm({
      name: '张三',
      phone: '13800138001',
      idCard: '110101199001011234',
      address: '北京市朝阳区某某街道',
      notes: '老客户',
    })
  }, [id])

  useEffect(() => {
    if (isEdit) {
      fetchTenant()
    }
  }, [isEdit, fetchTenant])

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('请输入姓名')
      return
    }
    if (!form.phone.trim()) {
      setError('请输入电话')
      return
    }
    if (!form.idCard.trim()) {
      setError('请输入身份证号')
      return
    }

    setSubmitting(true)
    try {
      const url = isEdit ? `/api/tenants/${id}` : '/api/tenants'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        navigate('/tenants')
        return
      }
      setError(data.error || '操作失败')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <h2 className="text-lg font-semibold text-slate-800">
          {isEdit ? '编辑租户' : '新增租户'}
        </h2>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入姓名"
            />
          </div>

          {/* 电话 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              电话 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入电话号码"
            />
          </div>

          {/* 身份证号 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              身份证号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.idCard}
              onChange={(e) => setForm({ ...form, idCard: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入身份证号"
              maxLength={18}
            />
          </div>

          {/* 地址 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              地址
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入地址"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              备注
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="请输入备注信息"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tenants')}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
