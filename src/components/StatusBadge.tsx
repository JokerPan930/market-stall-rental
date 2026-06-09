// 通用状态标签组件

// 状态颜色映射配置
const statusConfig: Record<string, { label: string; className: string }> = {
  // 摊位状态
  available: { label: '空置', className: 'bg-emerald-100 text-emerald-700' },
  rented: { label: '已租', className: 'bg-blue-100 text-blue-700' },
  maintenance: { label: '维护中', className: 'bg-slate-100 text-slate-600' },
  // 租赁状态
  active: { label: '生效中', className: 'bg-emerald-100 text-emerald-700' },
  expiring: { label: '即将到期', className: 'bg-amber-100 text-amber-700' },
  expired: { label: '已到期', className: 'bg-red-100 text-red-700' },
  terminated: { label: '已退租', className: 'bg-slate-100 text-slate-600' },
  // 费用状态
  paid: { label: '已缴', className: 'bg-emerald-100 text-emerald-700' },
  unpaid: { label: '未缴', className: 'bg-amber-100 text-amber-700' },
  overdue: { label: '逾期', className: 'bg-red-100 text-red-700' },
  partial: { label: '部分缴纳', className: 'bg-orange-100 text-orange-700' },
  // 用户状态
  enabled: { label: '启用', className: 'bg-emerald-100 text-emerald-700' },
  disabled: { label: '禁用', className: 'bg-slate-100 text-slate-600' },
  // 租户状态
  active_tenant: { label: '在租', className: 'bg-emerald-100 text-emerald-700' },
  inactive_tenant: { label: '退租', className: 'bg-slate-100 text-slate-600' },
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  const displayLabel = label || config?.label || status
  const className = config?.className || 'bg-slate-100 text-slate-600'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {displayLabel}
    </span>
  )
}
