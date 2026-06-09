import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react'
import Pagination from '@/components/Pagination'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'

// 摊位数据类型
interface Stall {
  id: number
  stallNumber: string
  area: string
  size: number
  pricePerMonth: number
  status: string
  currentTenant: string | null
}

export default function Stalls() {
  const navigate = useNavigate()
  const [stalls, setStalls] = useState<Stall[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)

  // 筛选条件
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // 获取摊位列表
  const fetchStalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (areaFilter) params.set('area', areaFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/stalls?${params}`)
      const data = await res.json()
      if (data.success) {
        setStalls(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      // 模拟数据
      setStalls([
        { id: 1, stallNumber: 'A-001', area: 'A区', size: 15, pricePerMonth: 3000, status: 'rented', currentTenant: '张三' },
        { id: 2, stallNumber: 'A-002', area: 'A区', size: 20, pricePerMonth: 4000, status: 'available', currentTenant: null },
        { id: 3, stallNumber: 'B-001', area: 'B区', size: 12, pricePerMonth: 2500, status: 'rented', currentTenant: '李四' },
        { id: 4, stallNumber: 'B-002', area: 'B区', size: 18, pricePerMonth: 3500, status: 'maintenance', currentTenant: null },
        { id: 5, stallNumber: 'C-001', area: 'C区', size: 25, pricePerMonth: 5000, status: 'rented', currentTenant: '王五' },
      ])
      setTotal(5)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, areaFilter, statusFilter, search])

  useEffect(() => {
    fetchStalls()
  }, [fetchStalls])

  // 删除摊位
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/stalls/${deleteId}`, { method: 'DELETE' })
    } catch {
      // 忽略错误
    }
    setDeleteId(null)
    fetchStalls()
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
    fetchStalls()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 顶部筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 区域筛选 */}
          <select
            value={areaFilter}
            onChange={(e) => { setAreaFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部区域</option>
            <option value="A区">A区</option>
            <option value="B区">B区</option>
            <option value="C区">C区</option>
            <option value="D区">D区</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部状态</option>
            <option value="available">空置</option>
            <option value="rented">已租</option>
            <option value="maintenance">维护中</option>
          </select>

          {/* 搜索框 */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索摊位编号..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* 新增按钮 */}
          <button
            onClick={() => navigate('/stalls/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增摊位
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">摊位编号</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">区域</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">面积(㎡)</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">月租金(元)</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">当前租户</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">加载中...</td>
                </tr>
              ) : stalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">暂无数据</td>
                </tr>
              ) : (
                stalls.map((stall) => (
                  <tr key={stall.id} className="border-b border-slate-100 table-row-hover transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{stall.stallNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{stall.area}</td>
                    <td className="px-5 py-3 text-slate-600">{stall.size}</td>
                    <td className="px-5 py-3 text-slate-600">¥{stall.pricePerMonth.toLocaleString('zh-CN')}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={stall.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{stall.currentTenant || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/stalls/${stall.id}`)}
                          className="text-primary-700 hover:text-primary-800 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/stalls/${stall.id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(stall.id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      {/* 删除确认对话框 */}
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
