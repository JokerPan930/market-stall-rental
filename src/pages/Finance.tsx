import { useState, useEffect, useCallback } from 'react'
import { DollarSign, AlertTriangle, FileText, CreditCard, Store, Zap, Car, X } from 'lucide-react'
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
  feeType: string
  waterElectricityAmount: number
  parkingFee: number
}

// 费用统计类型
interface FeeStats {
  totalExpected: number
  totalPaid: number
  totalOverdue: number
  overdueCount: number
}

// 已租摊位选项
interface RentedStall {
  id: number
  stallNo: string
  area: string
  tenantName: string
  monthlyRent: number
}

// 状态筛选Tab
const statusTabs = [
  { key: '', label: '全部' },
  { key: 'unpaid', label: '未缴' },
  { key: 'partial', label: '部分缴纳' },
  { key: 'paid', label: '已缴' },
  { key: 'overdue', label: '逾期' },
]

// 费用类型筛选Tab
const feeTypeTabs = [
  { key: '', label: '全部' },
  { key: 'rent', label: '租金' },
  { key: 'water_electricity', label: '水电费' },
  { key: 'parking', label: '停车费' },
]

// 费用类型标签配置
const feeTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  rent: { label: '租金', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  water_electricity: { label: '水电费', color: 'text-green-700', bgColor: 'bg-green-100' },
  parking: { label: '停车费', color: 'text-purple-700', bgColor: 'bg-purple-100' },
}

export default function Finance() {
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [feeTypeTab, setFeeTypeTab] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  // 统计数据
  const [stats, setStats] = useState<FeeStats>({
    totalExpected: 0,
    totalPaid: 0,
    totalOverdue: 0,
    overdueCount: 0,
  })

  // 缴费弹窗
  const [payModal, setPayModal] = useState<{ id: number; tenantName: string; amount: number; remaining: number; feeType: string } | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [paySubmitting, setPaySubmitting] = useState(false)

  // 按摊位收费弹窗
  const [stallChargeOpen, setStallChargeOpen] = useState(false)
  const [rentedStalls, setRentedStalls] = useState<RentedStall[]>([])
  const [selectedStallId, setSelectedStallId] = useState<number | string>('')
  const [chargeMonth, setChargeMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [chargeRent, setChargeRent] = useState('')
  const [chargeWater, setChargeWater] = useState('')
  const [chargeParking, setChargeParking] = useState('')
  const [chargeSubmitting, setChargeSubmitting] = useState(false)
  const [chargeError, setChargeError] = useState('')

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
      if (feeTypeTab) params.set('feeType', feeTypeTab)

      const res = await fetch(`/api/fees?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setFees(data.data || [])
        setTotal(data.total || 0)
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setFees([
      { id: 1, tenantName: '张三', stallNumber: 'A-001', month: '2026-06', amount: 3000, paidAmount: 3000, status: 'paid', dueDate: '2026-06-05', feeType: 'rent', waterElectricityAmount: 0, parkingFee: 0 },
      { id: 2, tenantName: '李四', stallNumber: 'B-015', month: '2026-06', amount: 2800, paidAmount: 0, status: 'unpaid', dueDate: '2026-06-05', feeType: 'rent', waterElectricityAmount: 0, parkingFee: 0 },
      { id: 3, tenantName: '王五', stallNumber: 'C-008', month: '2026-06', amount: 350, paidAmount: 150, status: 'partial', dueDate: '2026-06-05', feeType: 'water_electricity', waterElectricityAmount: 350, parkingFee: 0 },
      { id: 4, tenantName: '赵六', stallNumber: 'A-003', month: '2026-05', amount: 3000, paidAmount: 0, status: 'overdue', dueDate: '2026-05-05', feeType: 'rent', waterElectricityAmount: 0, parkingFee: 0 },
      { id: 5, tenantName: '钱七', stallNumber: 'B-022', month: '2026-05', amount: 200, paidAmount: 0, status: 'overdue', dueDate: '2026-05-05', feeType: 'parking', waterElectricityAmount: 0, parkingFee: 200 },
    ])
    setTotal(5)
    setStats({ totalExpected: 14800, totalPaid: 4500, totalOverdue: 5500, overdueCount: 2 })
    setLoading(false)
  }, [page, pageSize, activeTab, monthFilter, feeTypeTab])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  // 打开按摊位收费弹窗时，获取已租摊位列表
  const openStallCharge = async () => {
    setStallChargeOpen(true)
    setChargeError('')
    setSelectedStallId('')
    setChargeRent('')
    setChargeWater('')
    setChargeParking('')
    try {
      const res = await fetch('/api/stalls?status=rented&pageSize=200', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        const stalls = (data.data || []).map((s: any) => ({
          id: s.id,
          stallNo: s.stallNo || s.stallNumber,
          area: s.area,
          tenantName: s.currentTenantName || s.tenantName || '',
          monthlyRent: s.pricePerMonth || s.price_per_month || 0,
        }))
        setRentedStalls(stalls)
        return
      }
    } catch {}
    // 模拟数据
    setRentedStalls([
      { id: 1, stallNo: 'A-001', area: 'A区-水果区', tenantName: '张三', monthlyRent: 1500 },
      { id: 5, stallNo: 'B-001', area: 'B区-蔬菜区', tenantName: '李四', monthlyRent: 1320 },
      { id: 8, stallNo: 'C-001', area: 'C区-熟食区', tenantName: '王五', monthlyRent: 2000 },
    ])
  }

  // 选择摊位时自动填充月租金
  const handleStallSelect = (stallId: number | string) => {
    setSelectedStallId(stallId)
    const stall = rentedStalls.find(s => s.id === Number(stallId))
    if (stall) {
      setChargeRent(String(stall.monthlyRent))
    }
  }

  // 提交按摊位收费
  const handleStallChargeSubmit = async () => {
    setChargeError('')
    if (!selectedStallId) { setChargeError('请选择摊位'); return }
    if (!chargeMonth) { setChargeError('请选择月份'); return }
    if (!chargeRent && !chargeWater && !chargeParking) { setChargeError('请至少填写一项费用'); return }

    setChargeSubmitting(true)
    try {
      const res = await fetch('/api/fees/create-by-stall', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallId: Number(selectedStallId),
          month: chargeMonth,
          rentAmount: chargeRent ? Number(chargeRent) : 0,
          waterElectricityAmount: chargeWater ? Number(chargeWater) : 0,
          parkingFeeAmount: chargeParking ? Number(chargeParking) : 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStallChargeOpen(false)
        fetchFees()
      } else {
        setChargeError(data.error || '操作失败')
      }
    } catch {
      setChargeError('网络错误，请稍后重试')
    } finally {
      setChargeSubmitting(false)
    }
  }

  // 批量生成费用
  const handleBatchGenerate = async () => {
    const month = prompt('请输入要生成费用的月份（格式：2025-07）：')
    if (!month) return
    try {
      const res = await fetch('/api/fees/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
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
      feeType: fee.feeType,
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
        credentials: 'include',
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

  // 当前选中的摊位信息
  const selectedStall = rentedStalls.find(s => s.id === Number(selectedStallId))

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
            {/* 费用类型筛选Tab */}
            <div className="flex items-center gap-1">
              {feeTypeTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setFeeTypeTab(tab.key); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    feeTypeTab === tab.key
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 月份筛选 */}
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {/* 按摊位收费按钮 */}
            <button
              onClick={openStallCharge}
              className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
            >
              <Store className="w-4 h-4" />
              按摊位收费
            </button>
            {/* 批量生成费用按钮 */}
            <button
              onClick={handleBatchGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              批量生成
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
                <th className="text-left px-5 py-3 font-medium text-slate-600">费用类型</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">应缴金额</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">水电费</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">停车费</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">已缴金额</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">到期日</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-500">加载中...</td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-500">暂无数据</td>
                </tr>
              ) : (
                fees.map((fee) => {
                  const typeConfig = feeTypeConfig[fee.feeType] || feeTypeConfig.rent
                  return (
                  <tr key={fee.id} className="border-b border-slate-100 table-row-hover transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{fee.tenantName}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.stallNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.month}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">¥{formatAmount(fee.amount)}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.feeType === 'water_electricity' ? `¥${formatAmount(fee.waterElectricityAmount)}` : '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{fee.feeType === 'parking' ? `¥${formatAmount(fee.parkingFee)}` : '-'}</td>
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
                  )
                })
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayModal(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">缴费登记</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">租户</p>
                  <p className="text-sm font-medium text-slate-800">{payModal.tenantName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">费用类型</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feeTypeConfig[payModal.feeType]?.bgColor || 'bg-blue-100'} ${feeTypeConfig[payModal.feeType]?.color || 'text-blue-700'}`}>
                    {feeTypeConfig[payModal.feeType]?.label || '租金'}
                  </span>
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
              <button onClick={() => setPayModal(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">取消</button>
              <button onClick={handlePay} disabled={paySubmitting} className="px-4 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-md disabled:opacity-50">
                {paySubmitting ? '提交中...' : '确认缴费'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 按摊位收费弹窗 */}
      {stallChargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            {/* 标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">按摊位收费</h3>
              </div>
              <button onClick={() => setStallChargeOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 表单 */}
            <div className="p-6 space-y-5">
              {/* 选择摊位 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  选择摊位 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStallId}
                  onChange={(e) => handleStallSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">请选择已租摊位</option>
                  {rentedStalls.map((stall) => (
                    <option key={stall.id} value={stall.id}>
                      {stall.stallNo} - {stall.area}（租户：{stall.tenantName || '未知'}）
                    </option>
                  ))}
                </select>
              </div>

              {/* 选中摊位信息 */}
              {selectedStall && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">摊位：<span className="font-medium text-slate-800">{selectedStall.stallNo}</span></span>
                    <span className="text-slate-500">租户：<span className="font-medium text-slate-800">{selectedStall.tenantName}</span></span>
                    <span className="text-slate-500">月租：<span className="font-medium text-primary-700">¥{selectedStall.monthlyRent.toLocaleString('zh-CN')}</span></span>
                  </div>
                </div>
              )}

              {/* 月份 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  收费月份 <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={chargeMonth}
                  onChange={(e) => setChargeMonth(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 费用明细 */}
              <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <h4 className="text-sm font-semibold text-slate-700">费用明细</h4>

                {/* 租金 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5" />
                    </span>
                    租金(元)
                  </label>
                  <input
                    type="number"
                    value={chargeRent}
                    onChange={(e) => setChargeRent(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入租金金额"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* 水电费 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                    水电费(元)
                  </label>
                  <input
                    type="number"
                    value={chargeWater}
                    onChange={(e) => setChargeWater(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入水电费金额"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* 停车费 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <span className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Car className="w-3.5 h-3.5" />
                    </span>
                    停车费(元)
                  </label>
                  <input
                    type="number"
                    value={chargeParking}
                    onChange={(e) => setChargeParking(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入停车费金额"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* 合计 */}
                {(Number(chargeRent) || 0) + (Number(chargeWater) || 0) + (Number(chargeParking) || 0) > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm text-slate-600">合计</span>
                    <span className="text-lg font-bold text-primary-700">
                      ¥{((Number(chargeRent) || 0) + (Number(chargeWater) || 0) + (Number(chargeParking) || 0)).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>

              {/* 错误提示 */}
              {chargeError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{chargeError}</div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setStallChargeOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleStallChargeSubmit}
                disabled={chargeSubmitting}
                className="px-6 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-lg disabled:opacity-50"
              >
                {chargeSubmitting ? '提交中...' : '确认收费'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
