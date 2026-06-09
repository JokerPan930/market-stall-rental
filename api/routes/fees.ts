/**
 * 费用管理路由
 * 处理费用的生成、查询、缴费等操作
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 获取费用列表（支持分页、状态/租户/月份筛选）
 * GET /api/fees
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as string
    const tenantId = req.query.tenantId as string
    const month = req.query.month as string

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      whereClause += ' AND f.status = ?'
      params.push(status)
    }
    if (tenantId) {
      whereClause += ' AND f.tenant_id = ?'
      params.push(tenantId)
    }
    if (month) {
      whereClause += ' AND f.month = ?'
      params.push(month)
    }

    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM fees f ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const fees = db.prepare(`
      SELECT f.*, t.name as tenant_name, t.phone as tenant_phone, s.stall_no, s.area
      FROM fees f
      JOIN tenants t ON f.tenant_id = t.id
      JOIN leases l ON f.lease_id = l.id
      JOIN stalls s ON l.stall_id = s.id
      ${whereClause}
      ORDER BY f.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: fees,
      total: countResult.total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取费用列表失败' })
  }
})

/**
 * 费用统计
 * GET /api/fees/stats
 */
router.get('/stats', (req: Request, res: Response): void => {
  try {
    const month = req.query.month as string

    let monthCondition = ''
    const params: any[] = []

    if (month) {
      monthCondition = ' AND f.month = ?'
      params.push(month)
    } else {
      // 默认统计当前月份
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      monthCondition = ' AND f.month = ?'
      params.push(currentMonth)
    }

    // 总应收金额
    const totalAmount = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition}
    `).get(...params) as { total: number }

    // 总实收金额
    const totalPaid = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition}
    `).get(...params) as { total: number }

    // 未缴金额
    const unpaidAmount = db.prepare(`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition} AND f.status IN ('unpaid', 'partial', 'overdue')
    `).get(...params) as { total: number }

    // 各状态费用笔数
    const statusCounts = db.prepare(`
      SELECT f.status, COUNT(*) as count, COALESCE(SUM(f.amount), 0) as amount
      FROM fees f
      WHERE 1=1 ${monthCondition}
      GROUP BY f.status
    `).all(...params)

    // 欠费租户列表
    const overdueTenants = db.prepare(`
      SELECT DISTINCT t.id, t.name, t.phone, SUM(f.amount - f.paid_amount) as debt_amount
      FROM fees f
      JOIN tenants t ON f.tenant_id = t.id
      WHERE f.status IN ('unpaid', 'partial', 'overdue')
      GROUP BY t.id
      ORDER BY debt_amount DESC
    `).all()

    res.json({
      success: true,
      data: {
        totalAmount: totalAmount.total,
        totalPaid: totalPaid.total,
        unpaidAmount: unpaidAmount.total,
        statusCounts,
        overdueTenants,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取费用统计失败' })
  }
})

/**
 * 批量生成月度费用
 * POST /api/fees/generate
 */
router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { month } = req.body

    if (!month) {
      res.status(400).json({ success: false, error: '月份为必填项' })
      return
    }

    // 获取所有活跃的租赁合同
    const activeLeases = db.prepare(`
      SELECT l.id, l.stall_id, l.tenant_id, l.monthly_rent
      FROM leases l
      WHERE l.status IN ('active', 'expiring')
    `).all() as { id: number; stall_id: number; tenant_id: number; monthly_rent: number }[]

    let generated = 0
    let skipped = 0

    const insertFee = db.prepare(`
      INSERT INTO fees (lease_id, tenant_id, month, amount, status, due_date, remark)
      VALUES (?, ?, ?, ?, 'unpaid', ?, ?)
    `)

    // 应缴日期为当月10号
    const dueDate = `${month}-10`

    const transaction = db.transaction(() => {
      for (const lease of activeLeases) {
        // 检查该合同该月是否已生成费用
        const existing = db.prepare(
          'SELECT id FROM fees WHERE lease_id = ? AND month = ?'
        ).get(lease.id, month)

        if (existing) {
          skipped++
          continue
        }

        insertFee.run(lease.id, lease.tenant_id, month, lease.monthly_rent, dueDate, `${month}月租金`)
        generated++
      }
    })

    transaction()

    res.json({
      success: true,
      data: { generated, skipped },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '生成费用失败' })
  }
})

/**
 * 缴费登记
 * POST /api/fees/:id/pay
 */
router.post('/:id/pay', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { paid_amount, paid_date, remark } = req.body

    if (paid_amount === undefined || paid_amount === null) {
      res.status(400).json({ success: false, error: '缴费金额为必填项' })
      return
    }

    // 检查费用记录是否存在
    const fee = db.prepare('SELECT * FROM fees WHERE id = ?').get(id) as any
    if (!fee) {
      res.status(404).json({ success: false, error: '费用记录不存在' })
      return
    }

    // 计算新的已缴金额
    const newPaidAmount = fee.paid_amount + paid_amount
    // 判断缴费状态
    let newStatus: string
    if (newPaidAmount >= fee.amount) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    } else {
      newStatus = fee.status
    }

    db.prepare(`
      UPDATE fees SET
        paid_amount = ?,
        paid_date = ?,
        status = ?,
        remark = COALESCE(?, remark)
      WHERE id = ?
    `).run(newPaidAmount, paid_date || new Date().toISOString().split('T')[0], newStatus, remark || null, id)

    const updatedFee = db.prepare(`
      SELECT f.*, t.name as tenant_name, t.phone as tenant_phone, s.stall_no, s.area
      FROM fees f
      JOIN tenants t ON f.tenant_id = t.id
      JOIN leases l ON f.lease_id = l.id
      JOIN stalls s ON l.stall_id = s.id
      WHERE f.id = ?
    `).get(id)

    res.json({ success: true, data: updatedFee })
  } catch (error) {
    res.status(500).json({ success: false, error: '缴费登记失败' })
  }
})

export default router
