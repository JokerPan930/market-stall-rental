import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'

// 摊位详情类型
interface StallDetail {
  id: number
  stallNumber: string
  area: string
  size: number
  pricePerMonth: number
  status: string
  description: string
  currentTenant: string | null
  leaseHistory: Array<{
    id: number
    tenantName: string
    startDate: string
    endDate: string
    monthlyRent: number
    status: string
  }>
  feeRecords: Array<{
    id: number
    month: string
    amount: number
    paidAmount: number
    status: string
    paidDate: string | null
  }>
}

export default function StallDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [stall, setStall] = useState<StallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lease' | 'fee'>('lease')

  // 获取摊位详情
  const fetchStallDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stalls/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStall(data.data)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setStall({
      id: Number(id),
      stallNumber: 'A-001',
      area: 'A区',
      size: 15,
      pricePerMonth: 3000,
      status: 'rented',
      description: '位于A区入口处，人流量大',
      currentTenant: '张三',
      leaseHistory: [
        { id: 1, tenantName: '张三', startDate: '2025-01-01', endDate: '2026-12-31', monthlyRent: 3000, status: 'active' },
        { id: 2, tenantName: '李四', startDate: '2023-06-01', endDate: '2024-12-31', monthlyRent: 2800, status: 'expired' },
      ],
      feeRecords: [
        { id: 1, month: '2026-06', amount: 3000, paidAmount: 3000, status: 'paid', paidDate: '2026-06-01' },
        { id: 2, month: '2026-05', amount: 3000, paidAmount: 3000, status: 'paid', paidDate: '2026-05-03' },
        { id: 3, month: '2026-04', amount: 3000, paidAmount: 3000, status: 'paid', paidDate: '2026-04-02' },
      ],
    })
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchStallDetail()
  }, [fetchStallDetail])

  if (loading) {
    return <div className="text-center py-12 text-slate-500">加载中...</div>
  }

  if (!stall) return <div className="text-center py-12 text-slate-500">未找到摊位信息</div>

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/stalls')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <button
          onClick={() => navigate(`/stalls/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">基本信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoItem label="摊位编号" value={stall.stallNumber} />
          <InfoItem label="区域" value={stall.area} />
          <InfoItem label="面积" value={`${stall.size} ㎡`} />
          <InfoItem label="月租金" value={`¥${stall.pricePerMonth.toLocaleString('zh-CN')}`} />
          <InfoItem label="状态" value={<StatusBadge status={stall.status} />} />
          <InfoItem label="当前租户" value={stall.currentTenant || '无'} />
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <InfoItem label="描述" value={stall.description || '无'} />
          </div>
        </div>
      </div>

      {/* Tab切换区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Tab头部 */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('lease')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'lease'
                ? 'text-primary-700 border-b-2 border-primary-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            租赁历史
          </button>
          <button
            onClick={() => setActiveTab('fee')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'fee'
                ? 'text-primary-700 border-b-2 border-primary-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            费用记录
          </button>
        </div>

        {/* Tab内容 */}
        <div className="p-5">
          {activeTab === 'lease' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">租户名</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">开始日期</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">结束日期</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">月租金</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {stall.leaseHistory.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-slate-500">暂无租赁记录</td></tr>
                ) : (
                  stall.leaseHistory.map((lease) => (
                    <tr key={lease.id} className="border-b border-slate-100 table-row-hover">
                      <td className="px-4 py-2.5 text-slate-700">{lease.tenantName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{new Date(lease.startDate).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-2.5 text-slate-600">{new Date(lease.endDate).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-2.5 text-slate-600">¥{lease.monthlyRent.toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={lease.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">月份</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">应缴金额</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">已缴金额</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">缴费日期</th>
                </tr>
              </thead>
              <tbody>
                {stall.feeRecords.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-slate-500">暂无费用记录</td></tr>
                ) : (
                  stall.feeRecords.map((fee) => (
                    <tr key={fee.id} className="border-b border-slate-100 table-row-hover">
                      <td className="px-4 py-2.5 text-slate-700">{fee.month}</td>
                      <td className="px-4 py-2.5 text-slate-600">¥{fee.amount.toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-2.5 text-slate-600">¥{fee.paidAmount.toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={fee.status} /></td>
                      <td className="px-4 py-2.5 text-slate-600">{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('zh-CN') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// 信息项子组件
function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="text-sm text-slate-800 font-medium">{value}</div>
    </div>
  )
}
