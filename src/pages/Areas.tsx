import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, MapPin, X, GripVertical } from 'lucide-react'
import Pagination from '@/components/Pagination'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Area {
  id: number
  name: string
  description: string | null
  sortOrder: number
  stallCount?: number
}

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)

  // 弹窗状态
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', sortOrder: '0' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/areas?page=${page}&pageSize=${pageSize}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAreas(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      setAreas([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  // 打开新增弹窗
  const openAdd = () => {
    setEditId(null)
    setEditForm({ name: '', description: '', sortOrder: String((areas.length + 1) * 10) })
    setEditError('')
    setEditOpen(true)
  }

  // 打开编辑弹窗
  const openEdit = (area: Area) => {
    setEditId(area.id)
    setEditForm({
      name: area.name,
      description: area.description || '',
      sortOrder: String(area.sortOrder || 0),
    })
    setEditError('')
    setEditOpen(true)
  }

  // 提交
  const handleSubmit = async () => {
    setEditError('')
    if (!editForm.name.trim()) {
      setEditError('区域名称为必填项')
      return
    }
    setEditSubmitting(true)
    try {
      const url = editId ? `/api/areas/${editId}` : '/api/areas'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          sortOrder: Number(editForm.sortOrder) || 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditOpen(false)
        fetchAreas()
      } else {
        setEditError(data.error || '操作失败')
      }
    } catch {
      setEditError('网络错误，请稍后重试')
    } finally {
      setEditSubmitting(false)
    }
  }

  // 删除
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteError('')
    try {
      const res = await fetch(`/api/areas/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setDeleteId(null)
        fetchAreas()
      } else {
        setDeleteError(data.error || '删除失败')
        setTimeout(() => setDeleteError(''), 3000)
      }
    } catch {
      setDeleteError('网络错误')
      setTimeout(() => setDeleteError(''), 3000)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">区域管理</h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增区域
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-medium text-slate-600 w-12"></th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">区域名称</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">描述</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">排序</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">摊位数</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">加载中...</td>
              </tr>
            ) : areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">暂无数据</td>
              </tr>
            ) : (
              areas.map((area) => (
                <tr key={area.id} className="border-b border-slate-100 table-row-hover transition-colors">
                  <td className="px-5 py-3 text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      {area.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{area.description || '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{area.sortOrder}</td>
                  <td className="px-5 py-3 text-slate-600">{area.stallCount || 0}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(area)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(area.id)}
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

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {deleteError && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{deleteError}</div>
      )}

      {/* 新增/编辑弹窗 */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">{editId ? '编辑区域' : '新增区域'}</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  区域名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="如 A区-水果区"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">排序值</label>
                <input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
                <p className="text-xs text-slate-400 mt-1">数值越小越靠前</p>
              </div>
              {editError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{editError}</div>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={handleSubmit} disabled={editSubmitting} className="px-6 py-2 text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white rounded-lg disabled:opacity-50">
                {editSubmitting ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="确认删除"
        message="确定要删除该区域吗？如果该区域下有摊位，将无法删除。"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
