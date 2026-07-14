/**
 * 仪表盘路由
 * 返回系统统计数据
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 获取仪表盘统计数据
 * GET /api/dashboard/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    // 摊位总数
    const totalStalls = await db.prepare('SELECT COUNT(*) as total FROM stalls').get() as { total: number }

    // 已出租摊位数
    const rentedStalls = await db.prepare("SELECT COUNT(*) as total FROM stalls WHERE status = 'rented'").get() as { total: number }

    // 空置摊位数
    const vacantStalls = await db.prepare("SELECT COUNT(*) as total FROM stalls WHERE status = 'vacant'").get() as { total: number }

    // 维修中摊位数
    const maintenanceStalls = await db.prepare("SELECT COUNT(*) as total FROM stalls WHERE status = 'maintenance'").get() as { total: number }

    // 出租率
    const rentalRate = totalStalls.total > 0 ? (rentedStalls.total / totalStalls.total * 100).toFixed(1) : '0.0'

    // 本月应收/实收
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const monthlyReceivable = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM fees WHERE month = ?
    `).get(currentMonth) as { total: number }

    const monthlyReceived = await db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees WHERE month = ?
    `).get(currentMonth) as { total: number }

    // 即将到期合同（30天内）
    const expiringLeases = await db.prepare(`
      SELECT l.*, s.stall_no, s.area, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.status IN ('active', 'expiring')
      AND l.end_date::date <= CURRENT_DATE + INTERVAL '30 days'
      AND l.end_date::date > CURRENT_DATE
      ORDER BY l.end_date ASC
    `).all()

    // 欠费租户
    const overdueTenants = await db.prepare(`
      SELECT DISTINCT t.id, t.name, t.phone, SUM(f.amount - f.paid_amount) as debt_amount
      FROM fees f
      JOIN tenants t ON f.tenant_id = t.id
      WHERE f.status IN ('unpaid', 'partial', 'overdue')
      GROUP BY t.id
      ORDER BY debt_amount DESC
    `).all()

    // 出租率趋势（最近6个月）
    const trendData: { month: string; rate: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // 获取该月月底的出租摊位数（通过合同判断）
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      const monthEndStr = monthEnd.toISOString().split('T')[0]
      const monthStartStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

      const rentedCount = await db.prepare(`
        SELECT COUNT(DISTINCT stall_id) as total FROM leases
        WHERE start_date <= ? AND end_date >= ? AND status != 'terminated'
      `).get(monthEndStr, monthStartStr) as { total: number }

      const rate = totalStalls.total > 0 ? Math.round(rentedCount.total / totalStalls.total * 100) : 0

      trendData.push({
        month: monthStr,
        rate,
      })
    }

    res.json({
      success: true,
      data: {
        totalStalls: totalStalls.total,
        rentedStalls: rentedStalls.total,
        vacantStalls: vacantStalls.total,
        maintenanceStalls: maintenanceStalls.total,
        rentalRate: parseFloat(rentalRate),
        monthlyReceivable: monthlyReceivable.total,
        monthlyReceived: monthlyReceived.total,
        expiringLeases,
        overdueTenants,
        trendData,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取仪表盘数据失败' })
  }
})

export default router
