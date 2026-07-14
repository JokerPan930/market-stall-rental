import { useState, useEffect, useMemo } from 'react'
import { Store, CheckCircle, XCircle, TrendingUp, AlertTriangle, DollarSign, Wrench, MapPin, X, User, Calendar, Banknote, Zap, Car } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

// 仪表盘统计数据类型
interface DashboardStats {
  totalStalls: number
  rentedStalls: number
  vacantStalls: number
  maintenanceStalls?: number
  rentalRate: number
  monthlyReceivable?: number
  monthlyReceived?: number
  monthlyExpected?: number
  expiringLeases: Array<{
    id: number
    tenantName: string
    stallNo: string
    stallNumber?: string
    endDate: string
  }>
  overdueTenants: Array<{
    id: number
    name?: string
    tenantName: string
    stallNo: string
    stallNumber?: string
    overdueAmount?: number
    debtAmount?: number
  }>
  trendData?: Array<{ month: string; rate: number }>
  rentalTrend?: Array<{ month: string; rate: number }>
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(true)

  // 摊位详情弹窗状态
  const [detailStall, setDetailStall] = useState<Stall | null>(null)
  const [detailLease, setDetailLease] = useState<LeaseInfo | null>(null)
  const [detailFees, setDetailFees] = useState<FeeInfo[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchStalls()])
  }, [])

  // 获取仪表盘数据
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch {
      // 使用模拟数据
      setStats({
        totalStalls: 10,
        rentedStalls: 5,
        vacantStalls: 4,
        maintenanceStalls: 1,
        rentalRate: 50,
        monthlyExpected: 15000,
        monthlyReceived: 12000,
        expiringLeases: [
          { id: 1, tenantName: '张三', stallNo: 'A-001', endDate: '2026-06-30' },
          { id: 2, tenantName: '李四', stallNo: 'B-001', endDate: '2026-07-05' },
        ],
        overdueTenants: [
          { id: 1, tenantName: '王五', stallNo: 'C-001', overdueAmount: 6000 },
        ],
        trendData: [
          { month: '1月', rate: 75 },
          { month: '2月', rate: 78 },
          { month: '3月', rate: 82 },
          { month: '4月', rate: 79 },
          { month: '5月', rate: 85 },
          { month: '6月', rate: 80 },
        ],
      })
    }
  }

  // 获取所有摊位（用于位置可视化）
  const fetchStalls = async () => {
    try {
      const res = await fetch('/api/stalls?pageSize=200', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStalls(data.data || [])
      }
    } catch {
      setStalls([
        { id: 1, stallNo: 'A-001', area: 'A区-水果区', size: 20, pricePerMonth: 1500, status: 'rented', effectiveStatus: 'rented' },
        { id: 2, stallNo: 'A-002', area: 'A区-水果区', size: 18, pricePerMonth: 1350, status: 'vacant', effectiveStatus: 'vacant' },
        { id: 3, stallNo: 'A-003', area: 'A区-水果区', size: 25, pricePerMonth: 1875, status: 'rented', effectiveStatus: 'rented' },
        { id: 4, stallNo: 'A-004', area: 'A区-水果区', size: 15, pricePerMonth: 1125, status: 'maintenance', effectiveStatus: 'maintenance' },
        { id: 5, stallNo: 'B-001', area: 'B区-蔬菜区', size: 22, pricePerMonth: 1320, status: 'rented', effectiveStatus: 'rented' },
        { id: 6, stallNo: 'B-002', area: 'B区-蔬菜区', size: 22, pricePerMonth: 1320, status: 'vacant', effectiveStatus: 'vacant' },
        { id: 7, stallNo: 'B-003', area: 'B区-蔬菜区', size: 30, pricePerMonth: 1800, status: 'rented', effectiveStatus: 'rented' },
        { id: 8, stallNo: 'C-001', area: 'C区-熟食区', size: 20, pricePerMonth: 2000, status: 'rented', effectiveStatus: 'rented' },
        { id: 9, stallNo: 'C-002', area: 'C区-熟食区', size: 20, pricePerMonth: 2000, status: 'vacant', effectiveStatus: 'vacant' },
        { id: 10, stallNo: 'C-003', area: 'C区-熟食区', size: 25, pricePerMonth: 2500, status: 'vacant', effectiveStatus: 'vacant' },
      ])
    } finally {
      setLoading(false)
    }
  }

  // 点击摊位，获取详情和租赁信息
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
        // 从租赁历史中找到当前生效的合同
        const activeLease = (detail.leaseHistory || detail.leases || []).find(
          (l: any) => l.status === 'active' || l.status === 'expiring'
        )
        if (activeLease) {
          setDetailLease({
            id: activeLease.id,
            tenantId: activeLease.tenantId || activeLease.tenant_id,
            tenantName: activeLease.tenantName || activeLease.tenant_name,
            tenantPhone: activeLease.tenantPhone || activeLease.tenant_phone,
            startDate: activeLease.startDate || activeLease.start_date,
            endDate: activeLease.endDate || activeLease.end_date,
            monthlyRent: activeLease.monthlyRent || activeLease.monthly_rent,
            deposit: activeLease.deposit || 0,
            status: activeLease.status,
            remark: activeLease.remark,
          })
        }
        setDetailFees((detail.feeRecords || detail.fees || []).map((f: any) => ({
          id: f.id,
          feeType: f.feeType || f.fee_type || 'rent',
          month: f.month,
          amount: f.amount,
          paidAmount: f.paidAmount || f.paid_amount || 0,
          status: f.status,
          dueDate: f.dueDate || f.due_date,
          remark: f.remark,
        })))
      }
    } catch {
      // 模拟数据
      if (stall.status === 'rented') {
        setDetailLease({
          id: 1,
          tenantId: 1,
          tenantName: '张三',
          tenantPhone: '13800138001',
          startDate: '2025-01-01',
          endDate: '2026-06-30',
          monthlyRent: stall.pricePerMonth,
          deposit: stall.pricePerMonth * 2,
          status: 'active',
        })
        setDetailFees([
          { id: 1, feeType: 'rent', month: '2025-06', amount: stall.pricePerMonth, paidAmount: 0, status: 'unpaid', dueDate: '2025-06-10' },
          { id: 2, feeType: 'water_electricity', month: '2025-06', amount: 350, paidAmount: 0, status: 'unpaid', dueDate: '2025-06-10' },
          { id: 3, feeType: 'parking', month: '2025-06', amount: 200, paidAmount: 0, status: 'unpaid', dueDate: '2025-06-10' },
        ])
      }
    } finally {
      setDetailLoading(false)
    }
  }

  // 按区域分组摊位
  const groupedByArea = useMemo(() => {
    const groups: Record<string, Stall[]> = {}
    for (const stall of stalls) {
      const area = stall.area || '未分类'
      if (!groups[area]) groups[area] = []
      groups[area].push(stall)
    }
    for (const area in groups) {
      groups[area].sort((a, b) => (a.stallNo || '').localeCompare(b.stallNo || ''))
    }
    return groups
  }, [stalls])

  // 每个区域的统计
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

  if (loading) {
    return <div className="text-center py-12 text-slate-500">加载中...</div>
  }

  if (!stats) return null

  // 金额格式化
  const formatAmount = (amount: number) => (amount || 0).toLocaleString('zh-CN')

  // 兼容后端不同字段名
  const monthlyExpected = stats.monthlyExpected || stats.monthlyReceivable || 0
  const monthlyReceived = stats.monthlyReceived || 0
  const trendData = stats.trendData || stats.rentalTrend || []
  const maintenanceStalls = stats.maintenanceStalls || (stats.totalStalls - stats.rentedStalls - stats.vacantStalls)

  return (
    <div className="space-y-6">
      {/* 摊位统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Store className="w-6 h-6" />} label="摊位总数" value={stats.totalStalls} color="bg-primary-700" />
        <StatCard icon={<CheckCircle className="w-6 h-6" />} label="已出租" value={stats.rentedStalls} color="bg-blue-600" />
        <StatCard icon={<XCircle className="w-6 h-6" />} label="空置数" value={stats.vacantStalls} color="bg-emerald-600" />
        <StatCard icon={<TrendingUp className="w-6 h-6" />} label="出租率" value={`${stats.rentalRate}%`} color="bg-accent-600" />
      </div>

      {/* 摊位位置可视化 - 按区域显示租赁状态 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-slate-800">摊位位置总览</h3>
          </div>
          {/* 图例 */}
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
          {Object.keys(groupedByArea).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">暂无摊位数据</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByArea).sort(([a], [b]) => a.localeCompare(b)).map(([area, areaStalls]) => {
                const as = areaStats[area]
                return (
                  <div key={area}>
                    {/* 区域标题和统计 */}
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
                        {/* 出租率进度条 */}
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${as.rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* 摊位网格 */}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(100px, 1fr))` }}>
                      {areaStalls.map((stall) => {
                        const effectiveStatus = stall.effectiveStatus || stall.status
                        const config = stallStatusConfig[effectiveStatus] || stallStatusConfig.vacant
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

      {/* 金额统计 + 即将到期/欠费 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 金额统计 */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">本月应收</p>
                <p className="text-xl font-bold text-slate-800">¥{formatAmount(monthlyExpected)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">本月实收</p>
                <p className="text-xl font-bold text-slate-800">¥{formatAmount(monthlyReceived)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">维护中摊位</p>
                <p className="text-xl font-bold text-slate-800">{maintenanceStalls}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 即将到期合同 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">即将到期合同</h3>
          </div>
          <div className="p-5">
            {stats.expiringLeases.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">暂无即将到期的合同</p>
            ) : (
              <div className="space-y-3">
                {stats.expiringLeases.map((lease) => (
                  <div key={lease.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-accent-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{lease.tenantName}</p>
                        <p className="text-xs text-slate-500">摊位 {lease.stallNo || lease.stallNumber}</p>
                      </div>
                    </div>
                    <span className="text-xs text-accent-600 font-medium">
                      {new Date(lease.endDate).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 欠费租户 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">欠费租户</h3>
          </div>
          <div className="p-5">
            {stats.overdueTenants.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">暂无欠费租户</p>
            ) : (
              <div className="space-y-3">
                {stats.overdueTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{tenant.tenantName || tenant.name}</p>
                        <p className="text-xs text-slate-500">摊位 {tenant.stallNo || tenant.stallNumber}</p>
                      </div>
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      ¥{formatAmount(tenant.overdueAmount || tenant.debtAmount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 出租率趋势图 */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">出租率趋势</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, '出租率']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#0F766E"
                  fill="#0F766E"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 摊位详情弹窗 */}
      {detailStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  (detailStall.effectiveStatus || detailStall.status) === 'rented' ? 'bg-blue-100 text-blue-600' :
                  (detailStall.effectiveStatus || detailStall.status) === 'vacant' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">摊位 {detailStall.stallNo}</h3>
                  <p className="text-xs text-slate-500">{detailStall.area}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailStall(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <p className="text-center text-slate-500 py-8">加载中...</p>
              ) : (
                <>
                  {/* 摊位基本信息 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      基本信息
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="摊位编号" value={detailStall.stallNo} />
                      <InfoItem label="所属区域" value={detailStall.area} />
                      <InfoItem label="面积" value={`${detailStall.size} ㎡`} />
                      <InfoItem label="月租金" value={`¥${(detailStall.pricePerMonth || 0).toLocaleString('zh-CN')}`} />
                      <InfoItem label="状态" value={
                        stallStatusConfig[detailStall.effectiveStatus || detailStall.status]?.label || detailStall.status
                      } valueColor={
                        (detailStall.effectiveStatus || detailStall.status) === 'rented' ? 'text-blue-600' :
                        (detailStall.effectiveStatus || detailStall.status) === 'vacant' ? 'text-emerald-600' : 'text-amber-600'
                      } />
                      {detailStall.description && (
                        <InfoItem label="描述" value={detailStall.description} />
                      )}
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
                          {detailLease.tenantPhone && (
                            <InfoItem label="联系电话" value={detailLease.tenantPhone} />
                          )}
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
                        {detailLease.remark && (
                          <p className="text-xs text-slate-500">备注：{detailLease.remark}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-emerald-700 font-medium">该摊位当前空置，可出租</p>
                    </div>
                  )}

                  {/* 费用记录 */}
                  {detailFees.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-accent-600" />
                        近期费用
                      </h4>
                      <div className="space-y-2">
                        {detailFees.slice(0, 6).map((fee) => {
                          const feeTypeLabel: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                            rent: { label: '租金', icon: <Banknote className="w-3.5 h-3.5" />, color: 'text-blue-600 bg-blue-50' },
                            water_electricity: { label: '水电费', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-50' },
                            parking: { label: '停车费', icon: <Car className="w-3.5 h-3.5" />, color: 'text-purple-600 bg-purple-50' },
                          }
                          const ft = feeTypeLabel[fee.feeType] || feeTypeLabel.rent
                          return (
                            <div key={fee.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded flex items-center justify-center ${ft.color}`}>{ft.icon}</span>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 信息项子组件
function InfoItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-medium ${valueColor || 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

// 统计卡片子组件
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} text-white flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  )
}
