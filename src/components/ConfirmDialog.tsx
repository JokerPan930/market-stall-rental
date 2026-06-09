import { AlertTriangle } from 'lucide-react'

// 确认对话框组件
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  // 根据变体确定确认按钮样式
  const confirmBtnClass = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-accent-600 hover:bg-accent-700 text-white',
    info: 'bg-primary-700 hover:bg-primary-800 text-white',
  }[variant]

  // 图标颜色
  const iconClass = {
    danger: 'text-red-600',
    warning: 'text-accent-600',
    info: 'text-primary-700',
  }[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 animate-overlay-in"
        onClick={onCancel}
      />
      {/* 对话框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-modal-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${iconClass}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
