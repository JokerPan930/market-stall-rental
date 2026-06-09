import { useState, useEffect, useMemo } from 'react'
import { X, MapPin, Grid2X2, Tag } from 'lucide-react'

// 摊位数据类型
interface Stall {
  id: number
  stallNo: string
  stallNumber?: string
  area: string
  size: number
  pricePerMonth: number
  status: string
  description?: string
}

interface StallPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (stall: Stall) => void
}

// 状态对应的样式
const statusStyle: Record<string, { bg: string; ring: string; label: string }> = {
  vacant: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 hover:ring-emerald-400 cursor-pointer', ring: 'ring-2 ring-emerald-500', label: '空置' },
  rented: { bg: 'bg-blue-100 text-blue-700 border-blue-300 opacity-70 cursor-not-allowed', ring: '', label: '已租' },
  maintenance: { bg: 'bg-amber-100 text-amber-700 border-amber-300 opacity-70 cursor-not-allowed', ring: '', label: '维护' },
}

export default function StallPicker({ open, onClose, onSelect }: StallPickerProps) {
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(false)
  const [activeArea, setActiveArea] = useState('')

  useEffect(() => {
    if (open) {
      fetchStalls()
    }
  }, [open])

  const fetchStalls = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stalls?pageSize=200', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        const list: Stall[] = (data.data || []).map((s: Stall) => ({
          ...s,
          stallNo: s.stallNo || s.stallNumber || '',
        }))
        setStalls(list)
      }
    } catch {
      // 使用模拟数据
      setStalls([
        { id: 1, stallNo: 'A-001', area: 'A区-水果区', size: 15, pricePerMonth: 3000, status: 'rented' },
        { id: 2, stallNo: 'A-002', area: 'A区-水果区', size: 20, pricePerMonth: 4000, status: 'vacant' },
        { id: 3, stallNo: 'A-003', area: 'A区-水果区', size: 18, pricePerMonth: 3500, status: 'vacant' },
        { id: 4, stallNo: 'B-001', area: 'B区-蔬菜区', size: 22, pricePerMonth: 2600, status: 'rented' },
        { id: 5, stallNo: 'B-002', area: 'B区-蔬菜区', size: 16, pricePerMonth: 2400, status: 'vacant' },
        { id: 6, stallNo: 'B-003', area: 'B区-蔬菜区', size: 14, pricePerMonth: 2200, status: 'maintenance' },
        { id: 7, stallNo: 'C-001', area: 'C区-熟食区', size: 25, pricePerMonth: 5000, status: 'rented' },
        { id: 8, stallNo: 'C-002', area: 'C区-熟食区', size: 30, pricePerMonth: 6000, status: 'vacant' },
        { id: 9, stallNo: 'C-003', area: 'C区-熟食区', size: 20, pricePerMonth: 4500, status: 'vacant' },
      ])
    } finally {
      setLoading(false)
    }
  }

  // 按区域分组
  const groupedByArea = useMemo(() => {
    const groups: Record<string, Stall[]> = {}
    for (const stall of stalls) {
      const area = stall.area || '未分类'
      if (!groups[area]) groups[area] = []
      groups[area].push(stall)
    }
    // 摊位按编号排序
    for (const area in groups) {
      groups[area].sort((a, b) => (a.stallNo || '').localeCompare(b.stallNo || ''))
    }
    return groups
  }, [stalls])

  // 获取所有区域列表
  const areas = useMemo(() => Object.keys(groupedByArea).sort(), [groupedByArea])

  // 统计每状态数量
  const stats = useMemo(() => {
    const s = { vacant: 0, rented: 0, maintenance: 0 }
    for (const stall of stalls) {
      if (stall.status in s) s[stall.status as keyof typeof s]++
    }
    return s
  }, [stalls])

  if (!open) return null

  // 获取选中区域显示的摊位
  const displayArea = activeArea || (areas.length > 0 ? areas[0] : '')
  const displayStalls = displayArea ? groupedByArea[displayArea] || [] : []

  const handlePick = (stall: Stall) => {
    if (stall.status !== 'vacant') return
    onSelect(stall)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
              <Grid2X2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">选择摊位</h3>
              <p className="text-xs text-slate-500 mt-0.5">绿色区域为可租摊位，点击即选中</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 统计和图例 */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-6 text-sm">
          <span className="font-medium text-slate-700">摊位总数：{stalls.length}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
            <span className="text-slate-600">可租 <span className="font-semibold text-emerald-700">{stats.vacant}</span></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
            <span className="text-slate-600">已租 <span className="font-semibold text-blue-700">{stats.rented}</span></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
            <span className="text-slate-600">维护 <span className="font-semibold text-amber-700">{stats.maintenance}</span></span>
          </span>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 overflow-hidden flex min-h-[400px]">
          {/* 左侧区域列表 */}
          <div className="w-48 border-r border-slate-200 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-400">加载中...</div>
            ) : areas.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">暂无区域数据</div>
            ) : (
              <div className="py-2">
                {areas.map((area) => {
                  const areaStalls = groupedByArea[area] || []
                  const vacantCount = areaStalls.filter((s) => s.status === 'vacant').length
                  const isActive = displayArea === area
                  return (
                    <button
                      key={area}
                      onClick={() => setActiveArea(area)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-4 ${
                        isActive
                          ? 'bg-primary-50 border-primary-600 text-primary-800'
                          : 'border-transparent hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium truncate">{area}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 pl-6">
                        共 {areaStalls.length} 个，可租 {vacantCount}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 右侧摊位网格 */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">加载中...</div>
            ) : displayStalls.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">该区域暂无摊位</div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary-600" />
                    {displayArea}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    点击绿色（空置）摊位即可选中
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displayStalls.map((stall) => {
                    const style = statusStyle[stall.status] || statusStyle.vacant
                    const selectable = stall.status === 'vacant'
                    return (
                      <div
                        key={stall.id}
                        onClick={() => handlePick(stall)}
                        className={`relative border-2 rounded-lg p-3 transition-all ${style.bg} ${
                          selectable ? 'hover:shadow-md hover:-translate-y-0.5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-bold">{stall.stallNo}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70">{style.label}</span>
                        </div>
                        <div className="mt-2 text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span className="opacity-70">面积</span>
                            <span className="font-medium">{stall.size} ㎡</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-70">月租</span>
                            <span className="font-semibold">¥{(stall.pricePerMonth || 0).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                        {selectable && (
                          <div className="mt-2 text-[11px] text-center text-emerald-700 font-medium">点击选择</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
