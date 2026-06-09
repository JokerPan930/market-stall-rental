// 通用分页组件
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  // 计算显示的页码范围
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      // 始终显示第一页
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // 显示当前页附近的页码
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // 始终显示最后一页
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      {/* 上一页按钮 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        上一页
      </button>

      {/* 页码 */}
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              currentPage === page
                ? 'bg-primary-700 text-white border-primary-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 py-1.5 text-sm text-slate-400">
            ...
          </span>
        )
      ))}

      {/* 下一页按钮 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        下一页
      </button>
    </div>
  )
}
