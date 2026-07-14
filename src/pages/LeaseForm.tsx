import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Grid2X2 } from 'lucide-react'
import StallPicker from '@/components/StallPicker'

// 选中的摊位类型
interface SelectedStall {
  id: number
  stallNo: string
  area: string
  size: number
  pricePerMonth: number
}

// 租户选项类型
interface TenantOption {
  id: number
  name: string
  phone?: string
}

// 合同表单数据类型
interface LeaseFormData {
  stallId: number | string
  tenantId: number | string
  startDate: string
  endDate: string
  monthlyRent: number | string
  deposit: number | string
  waterElectricity: number | string
  parkingFee: number | string
  notes: string
}

export default function LeaseForm() {
  const navigate = useNavigate()
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])
  const [selectedStall, setSelectedStall] = useState<SelectedStall | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [form, setForm] = useState<LeaseFormData>({
    stallId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    waterElectricity: '',
    parkingFee: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTenants()
  }, [])

  // 获取租户列表
  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants?pageSize=200', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setTenantOptions(data.data || [])
    } catch {
      // 模拟数据
      setTenantOptions([
        { id: 1, name: '张三', phone: '13800000001' },
        { id: 2, name: '李四', phone: '13800000002' },
        { id: 3, name: '王五', phone: '13800000003' },
        { id: 4, name: '赵六', phone: '13800000004' },
      ])
    }
  }

  // 从弹窗选择摊位
  const handleStallSelected = (stall: SelectedStall) => {
    setSelectedStall(stall)
    setForm({
      ...form,
      stallId: stall.id,
      monthlyRent: stall.pricePerMonth,
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
          stallId: Number(form.stallId),
          tenantId: Number(form.tenantId),
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: Number(form.monthlyRent),
          deposit: Number(form.deposit) || 0,
          waterElectricity: Number(form.waterElectricity) || 0,
          parkingFee: Number(form.parkingFee) || 0,
          notes: form.notes,
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
          {/* 选择摊位 - 可视化弹窗 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              选择摊位 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 border border-slate-300 rounded-lg hover:border-primary-500 hover:bg-primary-50/30 transition-colors"
            >
              {selectedStall ? (
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Grid2X2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {selectedStall.stallNo}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedStall.area} · {selectedStall.size}㎡ · ¥{selectedStall.pricePerMonth.toLocaleString('zh-CN')}/月
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Grid2X2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">点击选择摊位</div>
                    <div className="text-xs text-slate-400">按分区可视化查看，点击空置摊位即可选中</div>
                  </div>
                </div>
              )}
              <span className="text-xs text-primary-600 font-medium flex-shrink-0">
                {selectedStall ? '重新选择' : '选择 →'}
              </span>
            </button>

            {/* 已选摊位信息提示 */}
            {selectedStall && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>
                  已选中摊位 {selectedStall.stallNo}，月租金已自动填充为 ¥{selectedStall.pricePerMonth.toLocaleString('zh-CN')}
                </span>
              </div>
            )}
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
                  {tenant.name}{tenant.phone ? `（${tenant.phone}）` : ''}
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
              placeholder="请输入月租金金额"
              min="0"
              step="0.01"
            />
          </div>

          {/* 水电费 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              水电费(元/月)
            </label>
            <input
              type="number"
              value={form.waterElectricity}
              onChange={(e) => setForm({ ...form, waterElectricity: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入水电费金额"
              min="0"
              step="0.01"
            />
          </div>

          {/* 停车费 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              停车费(元/月)
            </label>
            <input
              type="number"
              value={form.parkingFee}
              onChange={(e) => setForm({ ...form, parkingFee: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入停车费金额"
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

      {/* 可视化摊位选择器弹窗 */}
      <StallPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleStallSelected}
      />
    </div>
  )
}
