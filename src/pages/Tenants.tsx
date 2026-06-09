import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil } from 'lucide-react'
import Pagination from '@/components/Pagination'
import StatusBadge from '@/components/StatusBadge'

// 租户数据类型
interface Tenant {
  id: number
  name: string
  phone: string
  idCard: string
  leaseCount: number
  status: string
}

export default function Tenants() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 获取租户列表
  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/tenants?${params}`)
      const data = await res.json()
      if (data.success) {
        setTenants(data.data || [])
        setTotal(data.total || 0)
        setLoading(false)
        return
      }
    } catch {
      // 使用模拟数据
    }
    setTenants([
      { id: 1, name: '张三', phone: '13800138001', idCard: '110101199001011234', leaseCount: 2, status: 'active_tenant' },
      { id: 2, name: '李四', phone: '13800138002', idCard: '110101199002021234', leaseCount: 1, status: 'active_tenant' },
      { id: 3, name: '王五', phone: '13800138003', idCard: '110101199003031234', leaseCount: 1, status: 'active_tenant' },
      { id: 4, name: '赵六', phone: '13800138004', idCard: '110101199004041234', leaseCount: 0, status: 'inactive_tenant' },
    ])
    setTotal(4)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    fetchTenants()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索租户姓名或电话..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => navigate('/tenants/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增租户
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">姓名</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">电话</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">身份证号</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">租赁摊位数</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">加载中...</td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">暂无数据</td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-100 table-row-hover transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{tenant.name}</td>
                    <td className="px-5 py-3 text-slate-600">{tenant.phone}</td>
                    <td className="px-5 py-3 text-slate-600">{tenant.idCard}</td>
                    <td className="px-5 py-3 text-slate-600">{tenant.leaseCount}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          className="text-primary-700 hover:text-primary-800 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
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
    </div>
  )
}
