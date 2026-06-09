import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, RotateCcw, LogOut } from 'lucide-react'
import Pagination from '@/components/Pagination'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'

// 租赁合同数据类型
interface Lease {
  id: number
  stallNo: string
  tenantName: string
  startDate: string
  endDate: string
  monthlyRent: number
  deposit: number
  status: string
  remark?: string
}

// 状态筛选Tab
const statusTabs = [
  { key: '', label: '全部' },
  { key: 'active', label: '生效中' },
  { key: 'expiring', label: '即将到期' },
  { key: 'expired', label: '已到期' },
  { key: 'terminated', label: '已退租' },
]

export default function Leases() {
  const navigate = useNavigate()
  const [leases, setLeases] = useState<Lease[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  // 退租确认
  const [terminateId, setTerminateId] = useState<number | null>(null)

  // 获取租赁合同列表
  const fetchLeases = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (activeTab) params.set('status', activeTab)

      const res = await fetch(`/api/leases?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setLeases(data.data || [])
        setTotal(data.total || 0)
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setLeases([
      { id: 1, stallNo: 'A-001', tenantName: '张三', startDate: '2025-01-01', endDate: '2026-12-31', monthlyRent: 3000, deposit: 6000, status: 'active' },
      { id: 2, stallNo: 'B-015', tenantName: '李四', startDate: '2025-03-01', endDate: '2026-06-30', monthlyRent: 2800, deposit: 5600, status: 'expiring' },
      { id: 3, stallNo: 'C-008', tenantName: '王五', startDate: '2024-01-01', endDate: '2025-12-31', monthlyRent: 3500, deposit: 7000, status: 'expired' },
      { id: 4, stallNo: 'D-012', tenantName: '赵六', startDate: '2024-06-01', endDate: '2025-05-31', monthlyRent: 2500, deposit: 5000, status: 'terminated' },
    ])
    setTotal(4)
    setLoading(false)
  }, [page, pageSize, activeTab])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  // 退租
  const handleTerminate = async () => {
    if (!terminateId) return
    try {
      await fetch(`/api/leases/${terminateId}/terminate`, { method: 'POST', credentials: 'include' })
    } catch {
      // 忽略错误
    }
    setTerminateId(null)
    fetchLeases()
  }

  const totalPages = Math.ceil(total / pageSize)

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

          {/* 签订合同按钮 */}
          <button
            onClick={() => navigate('/leases/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            签订合同
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">摊位号</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">租户名</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">租期</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">月租金</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">加载中...</td>
              </tr>
              ) : leases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">暂无数据</td>
                </tr>
              ) : (
                leases.map((lease) => (
                  <tr key={lease.id} className="border-b border-slate-100 table-row-hover transition-colors">
                    <td className="px-5 py-3 text-slate-600">{lease.stallNo}</td>
                    <td className="px-5 py-3 text-slate-600">{lease.tenantName}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(lease.startDate).toLocaleDateString('zh-CN')} ~ {new Date(lease.endDate).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-5 py-3 text-slate-600">¥{(lease.monthlyRent ?? 0).toLocaleString('zh-CN')}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lease.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-primary-700 hover:text-primary-800 transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(lease.status === 'active' || lease.status === 'expiring') && (
                          <button
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="续租"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {(lease.status === 'active' || lease.status === 'expiring') && (
                          <button
                            onClick={() => setTerminateId(lease.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                            title="退租"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

      {/* 退租确认对话框 */}
      <ConfirmDialog
        open={terminateId !== null}
        title="确认退租"
        message="确定要办理退租吗？退租后该摊位将变为空置状态。"
        confirmText="确认退租"
        variant="warning"
        onConfirm={handleTerminate}
        onCancel={() => setTerminateId(null)}
      />
    </div>
  )
}
