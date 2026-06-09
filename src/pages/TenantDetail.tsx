import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'

// 租户详情类型
interface TenantDetail {
  id: number
  name: string
  phone: string
  idCard: string
  address: string
  notes: string
  status: string
  currentStalls: Array<{
    id: number
    stallNumber: string
    area: string
    monthlyRent: number
    leaseEnd: string
  }>
  feeRecords: Array<{
    id: number
    stallNumber: string
    month: string
    amount: number
    paidAmount: number
    status: string
    dueDate: string
  }>
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // 获取租户详情
  const fetchTenantDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tenants/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setTenant(data.data)
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setTenant({
      id: Number(id),
      name: '张三',
      phone: '13800138001',
      idCard: '110101199001011234',
      address: '北京市朝阳区某某街道',
      notes: '老客户，信誉良好',
      status: 'active_tenant',
      currentStalls: [
        { id: 1, stallNumber: 'A-001', area: 'A区', monthlyRent: 3000, leaseEnd: '2026-12-31' },
        { id: 2, stallNumber: 'A-005', area: 'A区', monthlyRent: 3500, leaseEnd: '2026-06-30' },
      ],
      feeRecords: [
        { id: 1, stallNumber: 'A-001', month: '2026-06', amount: 3000, paidAmount: 3000, status: 'paid', dueDate: '2026-06-05' },
        { id: 2, stallNumber: 'A-005', month: '2026-06', amount: 3500, paidAmount: 0, status: 'unpaid', dueDate: '2026-06-05' },
        { id: 3, stallNumber: 'A-001', month: '2026-05', amount: 3000, paidAmount: 3000, status: 'paid', dueDate: '2026-05-05' },
      ],
    })
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchTenantDetail()
  }, [fetchTenantDetail])

  if (loading) {
    return <div className="text-center py-12 text-slate-500">加载中...</div>
  }

  if (!tenant) return <div className="text-center py-12 text-slate-500">未找到租户信息</div>

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <button
          onClick={() => navigate(`/tenants/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">基本信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem label="姓名" value={tenant.name} />
          <InfoItem label="电话" value={tenant.phone} />
          <InfoItem label="身份证号" value={tenant.idCard} />
          <InfoItem label="地址" value={tenant.address || '无'} />
          <InfoItem label="状态" value={<StatusBadge status={tenant.status} />} />
          <InfoItem label="备注" value={tenant.notes || '无'} />
        </div>
      </div>

      {/* 当前租赁摊位 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">当前租赁摊位</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">摊位编号</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">区域</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">月租金</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">到期日期</th>
              </tr>
            </thead>
            <tbody>
              {tenant.currentStalls.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">暂无租赁摊位</td></tr>
              ) : (
                tenant.currentStalls.map((stall) => (
                  <tr key={stall.id} className="border-b border-slate-100 table-row-hover">
                    <td className="px-5 py-2.5 font-medium text-primary-700 cursor-pointer hover:underline" onClick={() => navigate(`/stalls/${stall.id}`)}>{stall.stallNumber}</td>
                    <td className="px-5 py-2.5 text-slate-600">{stall.area}</td>
                    <td className="px-5 py-2.5 text-slate-600">¥{stall.monthlyRent.toLocaleString('zh-CN')}</td>
                    <td className="px-5 py-2.5 text-slate-600">{new Date(stall.leaseEnd).toLocaleDateString('zh-CN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 缴费记录 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">缴费记录</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">摊位编号</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">月份</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">应缴金额</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">已缴金额</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-600">到期日</th>
              </tr>
            </thead>
            <tbody>
              {tenant.feeRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-500">暂无缴费记录</td></tr>
              ) : (
                tenant.feeRecords.map((fee) => (
                  <tr key={fee.id} className="border-b border-slate-100 table-row-hover">
                    <td className="px-5 py-2.5 text-slate-700">{fee.stallNumber}</td>
                    <td className="px-5 py-2.5 text-slate-600">{fee.month}</td>
                    <td className="px-5 py-2.5 text-slate-600">¥{fee.amount.toLocaleString('zh-CN')}</td>
                    <td className="px-5 py-2.5 text-slate-600">¥{fee.paidAmount.toLocaleString('zh-CN')}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={fee.status} /></td>
                    <td className="px-5 py-2.5 text-slate-600">{new Date(fee.dueDate).toLocaleDateString('zh-CN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
