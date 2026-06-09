import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// 摊位选项类型
interface StallOption {
  id: number
  stallNumber: string
  pricePerMonth: number
}

// 租户选项类型
interface TenantOption {
  id: number
  name: string
}

// 合同表单数据类型
interface LeaseFormData {
  stallId: number | string
  tenantId: number | string
  startDate: string
  endDate: string
  monthlyRent: number | string
  deposit: number | string
  notes: string
}

export default function LeaseForm() {
  const navigate = useNavigate()
  const [stallOptions, setStallOptions] = useState<StallOption[]>([])
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])
  const [form, setForm] = useState<LeaseFormData>({
    stallId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOptions()
  }, [])

  // 获取摊位和租户选项
  const fetchOptions = async () => {
    try {
      const [stallsRes, tenantsRes] = await Promise.all([
        fetch('/api/stalls?status=available&pageSize=100', { credentials: 'include' }),
        fetch('/api/tenants?pageSize=100', { credentials: 'include' }),
      ])
      const stallsData = await stallsRes.json()
      const tenantsData = await tenantsRes.json()
      if (stallsData.success) setStallOptions(stallsData.data || [])
      if (tenantsData.success) setTenantOptions(tenantsData.data || [])
    } catch {
      // 使用模拟数据
      setStallOptions([
        { id: 2, stallNumber: 'A-002', pricePerMonth: 4000 },
        { id: 6, stallNumber: 'B-003', pricePerMonth: 2600 },
        { id: 7, stallNumber: 'C-005', pricePerMonth: 3200 },
      ])
      setTenantOptions([
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
        { id: 3, name: '王五' },
        { id: 4, name: '赵六' },
      ])
    }
  }

  // 选择摊位时自动填充月租金
  const handleStallChange = (stallId: string) => {
    const stall = stallOptions.find((s) => s.id === Number(stallId))
    setForm({
      ...form,
      stallId: stallId ? Number(stallId) : '',
      monthlyRent: stall ? stall.pricePerMonth : '',
    })
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.stallId) {
      setError('请选择摊位')
      return
    }
    if (!form.tenantId) {
      setError('请选择租户')
      return
    }
    if (!form.startDate) {
      setError('请选择开始日期')
      return
    }
    if (!form.endDate) {
      setError('请选择结束日期')
      return
    }
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
      setError('请输入有效的月租金')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/leases', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          stallId: Number(form.stallId),
          tenantId: Number(form.tenantId),
          monthlyRent: Number(form.monthlyRent),
          deposit: Number(form.deposit) || 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        navigate('/leases')
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
          onClick={() => navigate('/leases')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <h2 className="text-lg font-semibold text-slate-800">签订合同</h2>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          {/* 选择摊位 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              选择摊位 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.stallId}
              onChange={(e) => handleStallChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">请选择摊位（仅显示空置摊位）</option>
              {stallOptions.map((stall) => (
                <option key={stall.id} value={stall.id}>
                  {stall.stallNumber}（月租金 ¥{stall.pricePerMonth.toLocaleString('zh-CN')}）
                </option>
              ))}
            </select>
          </div>

          {/* 选择租户 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              选择租户 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value ? Number(e.target.value) : '' })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">请选择租户</option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              开始日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              结束日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* 月租金 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              月租金(元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="默认取摊位月租金"
              min="0"
              step="0.01"
            />
          </div>

          {/* 押金 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              押金(元)
            </label>
            <input
              type="number"
              value={form.deposit}
              onChange={(e) => setForm({ ...form, deposit: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入押金金额"
              min="0"
              step="0.01"
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
              {submitting ? '提交中...' : '签订合同'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/leases')}
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
