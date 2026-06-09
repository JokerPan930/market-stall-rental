import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// 摊位表单数据类型
interface StallFormData {
  stallNumber: string
  area: string
  size: number | string
  pricePerMonth: number | string
  description: string
}

export default function StallForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<StallFormData>({
    stallNumber: '',
    area: '',
    size: '',
    pricePerMonth: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 获取摊位信息（编辑模式）
  const fetchStall = useCallback(async () => {
    try {
      const res = await fetch(`/api/stalls/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.data) {
        const stall = data.data
        setForm({
          stallNumber: stall.stallNumber,
          area: stall.area,
          size: stall.size,
          pricePerMonth: stall.pricePerMonth,
          description: stall.description || '',
        })
        return
      }
    } catch {
      // 使用模拟数据
    }
    setForm({
      stallNumber: 'A-001',
      area: 'A区',
      size: 15,
      pricePerMonth: 3000,
      description: '位于A区入口处',
    })
  }, [id])

  useEffect(() => {
    if (isEdit) {
      fetchStall()
    }
  }, [isEdit, fetchStall])

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.stallNumber.trim()) {
      setError('请输入摊位编号')
      return
    }
    if (!form.area) {
      setError('请选择区域')
      return
    }
    if (!form.size || Number(form.size) <= 0) {
      setError('请输入有效的面积')
      return
    }
    if (!form.pricePerMonth || Number(form.pricePerMonth) <= 0) {
      setError('请输入有效的月租金')
      return
    }

    setSubmitting(true)
    try {
      const url = isEdit ? `/api/stalls/${id}` : '/api/stalls'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          pricePerMonth: Number(form.pricePerMonth),
        }),
      })
      const data = await res.json()
      if (data.success) {
        navigate('/stalls')
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
          onClick={() => navigate('/stalls')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <h2 className="text-lg font-semibold text-slate-800">
          {isEdit ? '编辑摊位' : '新增摊位'}
        </h2>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          {/* 摊位编号 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              摊位编号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.stallNumber}
              onChange={(e) => setForm({ ...form, stallNumber: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="如：A-001"
            />
          </div>

          {/* 区域 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              区域 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">请选择区域</option>
              <option value="A区">A区</option>
              <option value="B区">B区</option>
              <option value="C区">C区</option>
              <option value="D区">D区</option>
            </select>
          </div>

          {/* 面积 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              面积(㎡) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入面积"
              min="0"
              step="0.01"
            />
          </div>

          {/* 月租金 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              月租金(元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.pricePerMonth}
              onChange={(e) => setForm({ ...form, pricePerMonth: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入月租金"
              min="0"
              step="0.01"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="请输入描述信息"
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
              onClick={() => navigate('/stalls')}
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
