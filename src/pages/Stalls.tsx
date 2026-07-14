import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, MapPin, Store, X, User, Calendar, Banknote, Zap, Car, DollarSign } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

// 摊位数据类型
interface Stall {
  id: number
  stallNo: string
  area: string
  size: number
  pricePerMonth: number
  status: string
  effectiveStatus?: string
  currentTenantName?: string
  currentTenantPhone?: string
  description?: string
  currentLeaseId?: number
}

// 租赁信息类型
interface LeaseInfo {
  id: number
  tenantId: number
  tenantName: string
  tenantPhone?: string
  startDate: string
  endDate: string
  monthlyRent: number
  deposit: number
  status: string
  remark?: string
}

// 费用信息类型
interface FeeInfo {
  id: number
  feeType: string
  month: string
  amount: number
  paidAmount: number
  status: string
  dueDate: string
  remark?: string
}

// 状态样式配置
const stallStatusConfig: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  vacant: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: '空置',
  },
  rented: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: '已租',
  },
  maintenance: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: '维护',
  },
}

// 费用类型配置
const feeTypeOptions = [
  { value: 'rent', label: '租金', icon: <Banknote className="w-4 h-4" />, color: 'text-blue-700 bg-blue-100 border-blue-300' },
  { value: 'water_electricity', label: '水电费', icon: <Zap className="w-4 h-4" />, color: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
  { value: 'parking', label: '停车费', icon: <Car className="w-4 h-4" />, color: 'text-purple-700 bg-purple-100 border-purple-300' },
]

const feeTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  rent: { label: '租金', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <Banknote className="w-3.5 h-3.5" /> },
  water_electricity: { label: '水电费', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <Zap className="w-3.5 h-3.5" /> },
  parking: { label: '停车费', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: <Car className="w-3.5 h-3.5" /> },
}

export default function Stalls() {
  const navigate = useNavigate()
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // 摊位详情弹窗
  const [detailStall, setDetailStall] = useState<Stall | null>(null)
  const [detailLease, setDetailLease] = useState<LeaseInfo | null>(null)
  const [detailFees, setDetailFees] = useState<FeeInfo[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // 收费弹窗
  const [chargeOpen, setChargeOpen] = useState(false)
  const [chargeFeeType, setChargeFeeType] = useState('rent')
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeMonth, setChargeMonth] = useState('')
  const [chargeSubmitting, setChargeSubmitting] = useState(false)
  const [chargeError, setChargeError] = useState('')
  const [chargeLoading, setChargeLoading] = useState(false)

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ stallNo: '', area: '', size: '', pricePerMonth: '', status: '', description: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  // 新增弹窗
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ stallNo: '', area: '', size: '', pricePerMonth: '', status: 'vacant', description: '' })
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')

  // 区域列表
  const [areaOptions, setAreaOptions] = useState<{ id: number; name: string }[]>([])

  // 获取区域列表
  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas/all', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAreaOptions(data.data || [])
      }
    } catch {
      setAreaOptions([])
    }
  }, [])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  // 获取摊位列表
  const fetchStalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '200' })
      if (areaFilter) params.set('area', areaFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('keyword', search)

      const res = await fetch(`/api/stalls?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStalls(data.data || [])
      }
    } catch {
      setStalls([])
    } finally {
      setLoading(false)
    }
  }, [areaFilter, statusFilter, search])

  useEffect(() => {
    fetchStalls()
  }, [fetchStalls])

  // 按区域分组
  const groupedByArea = useMemo(() => {
    let filtered = stalls
    if (statusFilter) {
      filtered = filtered.filter(s => (s.effectiveStatus || s.status) === statusFilter)
    }
    const groups: Record<string, Stall[]> = {}
    for (const stall of filtered) {
      const area = stall.area || '未分类'
      if (!groups[area]) groups[area] = []
      groups[area].push(stall)
    }
    for (const area in groups) {
      groups[area].sort((a, b) => (a.stallNo || '').localeCompare(b.stallNo || ''))
    }
    return groups
  }, [stalls, statusFilter])

  // 区域统计
  const areaStats = useMemo(() => {
    const result: Record<string, { total: number; rented: number; vacant: number; maintenance: number; rate: number }> = {}
    for (const [area, areaStalls] of Object.entries(groupedByArea)) {
      const rented = areaStalls.filter(s => (s.effectiveStatus || s.status) === 'rented').length
      const vacant = areaStalls.filter(s => (s.effectiveStatus || s.status) === 'vacant').length
      const maintenance = areaStalls.filter(s => (s.effectiveStatus || s.status) === 'maintenance').length
      const total = areaStalls.length
      result[area] = { total, rented, vacant, maintenance, rate: total > 0 ? Math.round(rented / total * 100) : 0 }
    }
    return result
  }, [groupedByArea])

  // 点击摊位
  const handleStallClick = async (stall: Stall) => {
    setDetailStall(stall)
    setDetailLease(null)
    setDetailFees([])
    setDetailLoading(true)

    try {
      const res = await fetch(`/api/stalls/${stall.id}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        const detail = data.data
        const activeLease = (detail.leases || []).find(
          (l: any) => l.status === 'active' || l.status === 'expiring'
        )
        if (activeLease) {
          setDetailLease({
            id: activeLease.id,
            tenantId: activeLease.tenantId,
            tenantName: activeLease.tenantName,
            tenantPhone: activeLease.tenantPhone,
            startDate: activeLease.startDate,
            endDate: activeLease.endDate,
            monthlyRent: activeLease.monthlyRent,
            deposit: activeLease.deposit || 0,
            status: activeLease.status,
            remark: activeLease.remark,
          })
        }
        setDetailFees((detail.fees || []).map((f: any) => ({
          id: f.id,
          feeType: f.feeType || 'rent',
          month: f.month,
          amount: f.amount,
          paidAmount: f.paidAmount || 0,
          status: f.status,
          dueDate: f.dueDate,
          remark: f.remark,
        })))
      }
    } catch {
      // 忽略
    } finally {
      setDetailLoading(false)
    }
  }

  // 打开收费弹窗
  const openCharge = async () => {
    if (!detailStall) return
    setChargeOpen(true)
    setChargeError('')
    setChargeFeeType('rent')
    setChargeAmount('')
    setChargeMonth('')
    setChargeLoading(true)

    try {
      // 查询租金类型的最近收费月份
      const res = await fetch(
        `/api/fees/last-charge-month?stallId=${detailStall.id}&feeType=rent`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.success && data.data?.lastMonth) {
        setChargeMonth(getNextMonth(data.data.lastMonth))
      } else {
        const now = new Date()
        setChargeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      }
    } catch {
      const now = new Date()
      setChargeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    } finally {
      setChargeLoading(false)
    }
  }

  // 切换费用类型时，自动查询该类型的最近收费月份
  const handleFeeTypeChange = async (feeType: string) => {
    setChargeFeeType(feeType)
    setChargeAmount('')
    setChargeLoading(true)

    // 如果选了租金，自动填入月租金
    if (feeType === 'rent' && detailLease) {
      setChargeAmount(String(detailLease.monthlyRent))
    }

    try {
      const res = await fetch(
        `/api/fees/last-charge-month?stallId=${detailStall!.id}&feeType=${feeType}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.success && data.data?.lastMonth) {
        setChargeMonth(getNextMonth(data.data.lastMonth))
      } else {
        const now = new Date()
        setChargeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      }
    } catch {
      const now = new Date()
      setChargeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    } finally {
      setChargeLoading(false)
    }
  }

  // 提交收费
  const handleChargeSubmit = async () => {
    setChargeError('')
    if (!chargeAmount || Number(chargeAmount) <= 0) {
      setChargeError('请输入有效金额')
      return
    }
    if (!chargeMonth) {
      setChargeError('月份不能为空')
      return
    }

    setChargeSubmitting(true)
    try {
      const res = await fetch('/api/fees/create-by-stall', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallId: detailStall!.id,
          month: chargeMonth,
          feeType: chargeFeeType,
          amount: Number(chargeAmount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setChargeOpen(false)
        // 刷新摊位详情
        handleStallClick(detailStall!)
      } else {
        setChargeError(data.error || '操作失败')
      }
    } catch {
      setChargeError('网络错误，请稍后重试')
    } finally {
      setChargeSubmitting(false)
    }
  }

  // 删除摊位
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/stalls/${deleteId}`, { method: 'DELETE', credentials: 'include' })
    } catch { /* 忽略 */ }
    setDeleteId(null)
    fetchStalls()
  }

  // 获取下一个月份
  function getNextMonth(month: string): string {
    const [year, m] = month.split('-').map(Number)
    const nextMonth = m === 12 ? 1 : m + 1
    const nextYear = m === 12 ? year + 1 : year
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  }

  // 获取所有区域列表
  const allAreas = useMemo(() => {
    const areas = new Set(stalls.map(s => s.area))
    return Array.from(areas).sort()
  }, [stalls])

  const effectiveStatus = (stall: Stall) => stall.effectiveStatus || stall.status

  // 打开编辑弹窗
  const openEdit = () => {
    if (!detailStall) return
    setEditForm({
      stallNo: detailStall.stallNo || '',
      area: detailStall.area || '',
      size: String(detailStall.size || ''),
      pricePerMonth: String(detailStall.pricePerMonth || ''),
      status: detailStall.status || 'vacant',
      description: detailStall.description || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  // 提交编辑
  const handleEditSubmit = async () => {
    setEditError('')
    if (!editForm.stallNo || !editForm.area || !editForm.size || !editForm.pricePerMonth) {
      setEditError('摊位编号、区域、面积和月租金为必填项')
      return
    }
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/stalls/${detailStall!.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallNo: editForm.stallNo,
          area: editForm.area,
          size: Number(editForm.size),
          pricePerMonth: Number(editForm.pricePerMonth),
          status: editForm.status,
          description: editForm.description || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditOpen(false)
        fetchStalls()
        handleStallClick({ ...detailStall!, stallNo: editForm.stallNo, area: editForm.area, size: Number(editForm.size), pricePerMonth: Number(editForm.pricePerMonth), status: editForm.status, description: editForm.description })
      } else {
        setEditError(data.error || '编辑失败')
      }
    } catch {
      setEditError('网络错误，请稍后重试')
    } finally {
      setEditSubmitting(false)
    }
  }

  // 打开新增弹窗
  const openAdd = () => {
    setAddForm({ stallNo: '', area: '', size: '', pricePerMonth: '', status: 'vacant', description: '' })
    setAddError('')
    setAddOpen(true)
  }

  // 提交新增
  const handleAddSubmit = async () => {
    setAddError('')
    if (!addForm.stallNo || !addForm.area || !addForm.size || !addForm.pricePerMonth) {
      setAddError('摊位编号、区域、面积和月租金为必填项')
      return
    }
    setAddSubmitting(true)
    try {
      const res = await fetch('/api/stalls', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallNo: addForm.stallNo,
          area: addForm.area,
          size: Number(addForm.size),
          pricePerMonth: Number(addForm.pricePerMonth),
          status: addForm.status,
          description: addForm.description || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAddOpen(false)
        fetchStalls()
      } else {
        setAddError(data.error || '新增失败')
      }
    } catch {
      setAddError('网络错误，请稍后重试')
    } finally {
      setAddSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 顶部筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={areaFilter}
            onChange={(e) => { setAreaFilter(e.target.value) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部区域</option>
            {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部状态</option>
            <option value="vacant">空置</option>
            <option value="rented">已租</option>
            <option value="maintenance">维护中</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchStalls()}
              placeholder="搜索摊位编号..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={() => fetchStalls()} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增摊位
          </button>
        </div>
      </div>

      {/* 摊位可视化网格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-slate-800">摊位位置总览</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-slate-600">空置</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
              <span className="text-slate-600">已租</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
              <span className="text-slate-600">维护</span>
            </span>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-center text-slate-500 py-8">加载中...</p>
          ) : Object.keys(groupedByArea).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">暂无摊位数据</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByArea).sort(([a], [b]) => a.localeCompare(b)).map(([area, areaStalls]) => {
                const as = areaStats[area]
                return (
                  <div key={area}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-primary-600 rounded-full"></div>
                        <span className="text-sm font-semibold text-slate-800">{area}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>共 {as.total} 个</span>
                        <span className="text-blue-600">已租 {as.rented}</span>
                        <span className="text-emerald-600">空置 {as.vacant}</span>
                        {as.maintenance > 0 && <span className="text-amber-600">维护 {as.maintenance}</span>}
                        <span className="font-medium text-slate-700">出租率 {as.rate}%</span>
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${as.rate}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                      {areaStalls.map((stall) => {
                        const es = effectiveStatus(stall)
                        const config = stallStatusConfig[es] || stallStatusConfig.vacant
                        return (
                          <div
                            key={stall.id}
                            onClick={() => handleStallClick(stall)}
                            className={`relative border-2 rounded-lg p-2.5 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${config.bg} ${config.border}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`}></span>
                              <span className={`text-xs font-bold ${config.text}`}>{stall.stallNo}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {stall.size}㎡ · ¥{(stall.pricePerMonth || 0).toLocaleString('zh-CN')}
                            </div>
                            <div className={`text-[10px] mt-0.5 font-medium ${config.text}`}>
                              {config.label}
                            </div>
                            {/* 操作按钮 */}
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100" style={{ opacity: 0 }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/stalls/${stall.id}/edit`) }}
                                className="p-1 bg-white/80 rounded text-blue-600 hover:bg-white shadow-sm"
                                title="编辑"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteId(stall.id) }}
                                className="p-1 bg-white/80 rounded text-red-600 hover:bg-white shadow-sm"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 摊位详情弹窗 */}
      {detailStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* 标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  effectiveStatus(detailStall) === 'rented' ? 'bg-blue-100 text-blue-600' :
                  effectiveStatus(detailStall) === 'vacant' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">摊位 {detailStall.stallNo}</h3>
                  <p className="text-xs text-slate-500">{detailStall.area}</p>
                </div>
              </div>
              <button onClick={() => setDetailStall(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <p className="text-center text-slate-500 py-8">加载中...</p>
              ) : (
                <>
                  {/* 基本信息 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        基本信息
                      </span>
                      <button
                        onClick={openEdit}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        编辑
                      </button>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="摊位编号" value={detailStall.stallNo} />
                      <InfoItem label="所属区域" value={detailStall.area} />
                      <InfoItem label="面积" value={`${detailStall.size} ㎡`} />
                      <InfoItem label="月租金" value={`¥${(detailStall.pricePerMonth || 0).toLocaleString('zh-CN')}`} />
                      <InfoItem label="状态" value={
                        stallStatusConfig[effectiveStatus(detailStall)]?.label || detailStall.status
                      } valueColor={
                        effectiveStatus(detailStall) === 'rented' ? 'text-blue-600' :
                        effectiveStatus(detailStall) === 'vacant' ? 'text-emerald-600' : 'text-amber-600'
                      } />
                      {detailStall.description && <InfoItem label="描述" value={detailStall.description} />}
                    </div>
                  </div>

                  {/* 当前租赁信息 */}
                  {detailLease ? (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        当前租赁信息
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <InfoItem label="租户" value={detailLease.tenantName} />
                          {detailLease.tenantPhone && <InfoItem label="联系电话" value={detailLease.tenantPhone} />}
                          <InfoItem label="月租金" value={`¥${(detailLease.monthlyRent || 0).toLocaleString('zh-CN')}`} />
                          <InfoItem label="押金" value={`¥${(detailLease.deposit || 0).toLocaleString('zh-CN')}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">租期</p>
                              <p className="text-sm text-slate-800">
                                {new Date(detailLease.startDate).toLocaleDateString('zh-CN')} ~ {new Date(detailLease.endDate).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Banknote className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">合同状态</p>
                              <span className={`text-sm font-medium ${
                                detailLease.status === 'active' ? 'text-emerald-600' :
                                detailLease.status === 'expiring' ? 'text-orange-600' : 'text-slate-600'
                              }`}>
                                {detailLease.status === 'active' ? '生效中' :
                                 detailLease.status === 'expiring' ? '即将到期' : detailLease.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-emerald-700 font-medium">该摊位当前空置，可出租</p>
                    </div>
                  )}

                  {/* 近期费用 */}
                  {detailFees.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-accent-600" />
                        近期费用
                      </h4>
                      <div className="space-y-2">
                        {detailFees.slice(0, 6).map((fee) => {
                          const ft = feeTypeConfig[fee.feeType] || feeTypeConfig.rent
                          return (
                            <div key={fee.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded flex items-center justify-center ${ft.color} ${ft.bgColor}`}>{ft.icon}</span>
                                <div>
                                  <span className="font-medium text-slate-700">{fee.month}</span>
                                  <span className="text-slate-400 mx-1">·</span>
                                  <span className="text-slate-600">{ft.label}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-700">¥{(fee.amount || 0).toLocaleString('zh-CN')}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  fee.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                  fee.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  fee.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {fee.status === 'paid' ? '已缴' :
                                   fee.status === 'overdue' ? '逾期' :
                                   fee.status === 'partial' ? '部分' : '未缴'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 收费按钮 */}
                  {effectiveStatus(detailStall) === 'rented' && detailLease && (
                    <button
                      onClick={openCharge}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      收费
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新增摊位弹窗 */}
      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">新增摊位</h3>
              <button onClick={() => setAddOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">摊位编号 <span className="text-red-500">*</span></label>
                <input type="text" value={addForm.stallNo} onChange={(e) => setAddForm({ ...addForm, stallNo: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="如 A-005" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">所属区域 <span className="text-red-500">*</span></label>
                <select value={addForm.area} onChange={(e) => setAddForm({ ...addForm, area: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">请选择区域</option>
                  {areaOptions.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">面积(㎡) <span className="text-red-500">*</span></label>
                  <input type="number" value={addForm.size} onChange={(e) => setAddForm({ ...addForm, size: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" min="0" step="0.1" placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">月租金(元) <span className="text-red-500">*</span></label>
                  <input type="number" value={addForm.pricePerMonth} onChange={(e) => setAddForm({ ...addForm, pricePerMonth: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" min="0" step="0.01" placeholder="1500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="vacant">空置</option>
                  <option value="rented">已租</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="可选" />
              </div>
              {addError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{addError}</div>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={handleAddSubmit} disabled={addSubmitting} className="px-6 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-lg disabled:opacity-50">
                {addSubmitting ? '提交中...' : '确认新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editOpen && detailStall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">编辑摊位</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">摊位编号 <span className="text-red-500">*</span></label>
                <input type="text" value={editForm.stallNo} onChange={(e) => setEditForm({ ...editForm, stallNo: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">所属区域 <span className="text-red-500">*</span></label>
                <select value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">请选择区域</option>
                  {areaOptions.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">面积(㎡) <span className="text-red-500">*</span></label>
                  <input type="number" value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" min="0" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">月租金(元) <span className="text-red-500">*</span></label>
                  <input type="number" value={editForm.pricePerMonth} onChange={(e) => setEditForm({ ...editForm, pricePerMonth: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" min="0" step="0.01" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="vacant">空置</option>
                  <option value="rented">已租</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
              {editError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{editError}</div>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting} className="px-6 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-lg disabled:opacity-50">
                {editSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收费弹窗 */}
      {chargeOpen && detailStall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">收费</h3>
                  <p className="text-xs text-slate-500">{detailStall.stallNo} · {detailLease?.tenantName}</p>
                </div>
              </div>
              <button onClick={() => setChargeOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 费用类型单选 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  收费类型 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {feeTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleFeeTypeChange(opt.value)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        chargeFeeType === opt.value
                          ? `${opt.color} border-current shadow-sm`
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 收费月份 - 自动填入，不可更改 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  收费月份
                </label>
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                  {chargeLoading ? '计算中...' : chargeMonth || '-'}
                </div>
                <p className="text-xs text-slate-400 mt-1">根据上次收费月份自动计算，不可修改</p>
              </div>

              {/* 金额 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  金额(元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入金额"
                  min="0"
                  step="0.01"
                />
                {chargeFeeType === 'rent' && detailLease && (
                  <p className="text-xs text-slate-400 mt-1">参考月租金：¥{detailLease.monthlyRent.toLocaleString('zh-CN')}</p>
                )}
              </div>

              {chargeError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{chargeError}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button onClick={() => setChargeOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                取消
              </button>
              <button
                onClick={handleChargeSubmit}
                disabled={chargeSubmitting || chargeLoading}
                className="px-6 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-lg disabled:opacity-50"
              >
                {chargeSubmitting ? '提交中...' : '确认收费'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleteId !== null}
        title="确认删除"
        message="确定要删除该摊位吗？删除后不可恢复。"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function InfoItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-medium ${valueColor || 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
