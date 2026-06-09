import { useState, useEffect, useCallback } from 'react'
import { DollarSign, AlertTriangle, FileText, CreditCard } from 'lucide-react'
import Pagination from '@/components/Pagination'
import StatusBadge from '@/components/StatusBadge'

// 费用记录类型
interface FeeRecord {
  id: number
  tenantName: string
  stallNumber: string
  month: string
  amount: number
  paidAmount: number
  status: string
  dueDate: string
}

// 费用统计类型
interface FeeStats {
  totalExpected: number
  totalPaid: number
  totalOverdue: number
  overdueCount: number
}

// 状态筛选Tab
const statusTabs = [
  { key: '', label: '全部' },
  { key: 'unpaid', label: '未缴' },
  { key: 'partial', label: '部分缴纳' },
  { key: 'paid', label: '已缴' },
  { key: 'overdue', label: '逾期' },
]

export default function Finance() {
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  // 统计数据
  const [stats, setStats] = useState<FeeStats>({
    totalExpected: 0,
    totalPaid: 0,
    totalOverdue: 0,
    overdueCount: 0,
  })

  // 缴费弹窗
  const [payModal, setPayModal] = useState<{ id: number; tenantName: string; amount: number; remaining: number } | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [paySubmitting, setPaySubmitting] = useState(false)

  // 获取费用列表
  const fetchFees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (activeTab) params.set('status', activeTab)
      if (monthFilter) params.set('month', monthFilter)

      const res = await fetch(`/api/fees?${params}`)
      const data = await res.json()
      if (data.success) {
        setFees(data.data?.records || [])
        setTotal(data.data?.total || 0)
        setStats(data.data?.stats || { totalExpected: 0, totalPaid: 0, totalOverdue: 0, overdueCount: 0 })
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setFees([
      { id: 1, tenantName: '张三', stallNumber: 'A-001', month: '2026-06', amount: 3000, paidAmount: 3000, status: 'paid', dueDate: '2026-06-05' },
      { id: 2, tenantName: '李四', stallNumber: 'B-015', month: '2026-06', amount: 2800, paidAmount: 0, status: 'unpaid', dueDate: '2026-06-05' },
      { id: 3, tenantName: '王五', stallNumber: 'C-008', month: '2026-06', amount: 3500, paidAmount: 1500, status: 'partial', dueDate: '2026-06-05' },
      { id: 4, tenantName: '赵六', stallNumber: 'A-003', month: '2026-05', amount: 3000, paidAmount: 0, status: 'overdue', dueDate: '2026-05-05' },
      { id: 5, tenantName: '钱七', stallNumber: 'B-022', month: '2026-05', amount: 2500, paidAmount: 0, status: 'overdue', dueDate: '2026-05-05' },
    ])
    setTotal(5)
    setStats({ totalExpected: 14800, totalPaid: 4500, totalOverdue: 5500, overdueCount: 2 })
    setLoading(false)
  }, [page, pageSize, activeTab, monthFilter])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  // 批量生成费用
  const handleBatchGenerate = async () => {
    try {
      const res = await fetch('/api/fees/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        fetchFees()
      }
    } catch {
      // 忽略错误
    }
  }

  // 打开缴费弹窗
  const openPayModal = (fee: FeeRecord) => {
    const remaining = fee.amount - fee.paidAmount
    setPayModal({
      id: fee.id,
      tenantName: fee.tenantName,
      amount: fee.amount,
      remaining,
    })
    setPayAmount(String(remaining))
    setPayDate(new Date().toISOString().split('T')[0])
  }

  // 提交缴费
  const handlePay = async () => {
    if (!payModal || !payAmount || Number(payAmount) <= 0) return

    setPaySubmitting(true)
    try {
      const res = await fetch(`/api/fees/${payModal.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: Number(payAmount),
          paidDate: payDate,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPayModal(null)
        fetchFees()
      }
    } catch {
      // 忽略错误
    } finally {
      setPaySubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  const formatAmount = (amount: number) => amount.toLocaleString('zh-CN')

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 状态筛选Tab */}
          <div className="flex items-center gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* 月份筛选 */}
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {/* 批量生成费用按钮 */}
            <button
              onClick={handleBatchGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              批量生成费用
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">应收总额</p>
              <p className="text-xl font-bold text-slate-800">¥{formatAmount(stats.totalExpected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">实收总额</p>
              <p className="text-xl font-bold text-slate-800">¥{formatAmount(stats.totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">逾期金额</p>
              <p className="text-xl font-bold text-red-600">¥{formatAmount(stats.totalOverdue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">逾期笔数</p>
              <p className="text-xl font-bold text-slate-800">{stats.overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 费用表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">租户名</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">摊位号</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">月份</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">应缴金额</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">已缴金额</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">到期日</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">加载中...</td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">暂无数据</td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-slate-100 table-row-hover transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{fee.tenantName}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.stallNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.month}</td>
                    <td className="px-5 py-3 text-slate-600">¥{formatAmount(fee.amount)}</td>
                    <td className="px-5 py-3 text-slate-600">¥{formatAmount(fee.paidAmount)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={fee.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{new Date(fee.dueDate).toLocaleDateString('zh-CN')}</td>
                    <td className="px-5 py-3">
                      {fee.status !== 'paid' && (
                        <button
                          onClick={() => openPayModal(fee)}
                          className="text-primary-700 hover:text-primary-800 text-sm font-medium transition-colors"
                        >
                          缴费登记
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-5 py-3 border-t border-slate-200">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* 缴费弹窗 */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 animate-overlay-in"
            onClick={() => setPayModal(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-modal-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">缴费登记</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">租户</p>
                  <p className="text-sm font-medium text-slate-800">{payModal.tenantName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">应缴金额</p>
                  <p className="text-sm font-medium text-slate-800">¥{formatAmount(payModal.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">剩余应缴</p>
                  <p className="text-sm font-medium text-accent-600">¥{formatAmount(payModal.remaining)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    缴费金额 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    max={payModal.remaining}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    缴费日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setPayModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePay}
                disabled={paySubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {paySubmitting ? '提交中...' : '确认缴费'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
