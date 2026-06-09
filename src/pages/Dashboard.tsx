import { useState, useEffect } from 'react'
import { Store, CheckCircle, XCircle, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// 仪表盘统计数据类型
interface DashboardStats {
  totalStalls: number
  rentedStalls: number
  vacantStalls: number
  rentalRate: number
  monthlyExpected: number
  monthlyReceived: number
  expiringLeases: Array<{
    id: number
    tenantName: string
    stallNumber: string
    endDate: string
  }>
  overdueTenants: Array<{
    id: number
    tenantName: string
    stallNumber: string
    overdueAmount: number
  }>
  rentalTrend: Array<{
    month: string
    rate: number
  }>
}

// 仪表盘页面
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  // 获取仪表盘数据
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch {
      // 使用模拟数据
      setStats({
        totalStalls: 120,
        rentedStalls: 96,
        vacantStalls: 24,
        rentalRate: 80,
        monthlyExpected: 288000,
        monthlyReceived: 256000,
        expiringLeases: [
          { id: 1, tenantName: '张三', stallNumber: 'A-001', endDate: '2026-06-30' },
          { id: 2, tenantName: '李四', stallNumber: 'B-015', endDate: '2026-07-05' },
          { id: 3, tenantName: '王五', stallNumber: 'C-008', endDate: '2026-07-12' },
        ],
        overdueTenants: [
          { id: 1, tenantName: '赵六', stallNumber: 'A-003', overdueAmount: 6000 },
          { id: 2, tenantName: '钱七', stallNumber: 'B-022', overdueAmount: 3000 },
        ],
        rentalTrend: [
          { month: '1月', rate: 75 },
          { month: '2月', rate: 78 },
          { month: '3月', rate: 82 },
          { month: '4月', rate: 79 },
          { month: '5月', rate: 85 },
          { month: '6月', rate: 80 },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-500">加载中...</div>
  }

  if (!stats) return null

  // 金额格式化
  const formatAmount = (amount: number) => amount.toLocaleString('zh-CN')

  return (
    <div className="space-y-6">
      {/* 摊位统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Store className="w-6 h-6" />}
          label="摊位总数"
          value={stats.totalStalls}
          color="bg-primary-700"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="已出租"
          value={stats.rentedStalls}
          color="bg-blue-600"
        />
        <StatCard
          icon={<XCircle className="w-6 h-6" />}
          label="空置数"
          value={stats.vacantStalls}
          color="bg-emerald-600"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="出租率"
          value={`${stats.rentalRate}%`}
          color="bg-accent-600"
        />
      </div>

      {/* 金额统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">本月应收</p>
              <p className="text-xl font-bold text-slate-800">¥{formatAmount(stats.monthlyExpected)}</p>
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
              <p className="text-xl font-bold text-slate-800">¥{formatAmount(stats.monthlyReceived)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 列表和图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <p className="text-xs text-slate-500">摊位 {lease.stallNumber}</p>
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
                        <p className="text-sm font-medium text-slate-700">{tenant.tenantName}</p>
                        <p className="text-xs text-slate-500">摊位 {tenant.stallNumber}</p>
                      </div>
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      ¥{formatAmount(tenant.overdueAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 出租率趋势图 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">出租率趋势</h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.rentalTrend}>
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
