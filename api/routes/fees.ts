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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as string
    const tenantId = req.query.tenantId as string
    const month = req.query.month as string
    const feeType = req.query.feeType as string

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
    if (feeType) {
      whereClause += ' AND f.fee_type = ?'
      params.push(feeType)
    }

    // 获取总数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM fees f ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const fees = await db.prepare(`
      SELECT f.*, f.fee_type, f.water_electricity_amount, f.parking_fee, t.name as tenant_name, t.phone as tenant_phone, s.stall_no, s.area
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
 * 查询某摊位某费用类型最近一次收费月份
 * GET /api/fees/last-charge-month
 */
router.get('/last-charge-month', async (req: Request, res: Response): Promise<void> => {
  try {
    const stallId = parseInt(req.query.stallId as string)
    const feeType = req.query.feeType as string

    if (!stallId || !feeType) {
      res.status(400).json({ success: false, error: '摊位ID和费用类型为必填项' })
      return
    }

    if (!['rent', 'water_electricity', 'parking'].includes(feeType)) {
      res.status(400).json({ success: false, error: '费用类型无效' })
      return
    }

    // 通过 stall_id 找到活跃的 lease_id
    const lease = await db.prepare(`
      SELECT l.id
      FROM leases l
      WHERE l.stall_id = ? AND l.status IN ('active', 'expiring')
      ORDER BY l.id DESC LIMIT 1
    `).get(stallId) as { id: number } | undefined

    if (!lease) {
      res.json({ success: true, data: { lastMonth: null } })
      return
    }

    // 查找该 lease_id + fee_type 的最大 month 值
    const result = await db.prepare(`
      SELECT MAX(f.month) as last_month
      FROM fees f
      WHERE f.lease_id = ? AND f.fee_type = ?
    `).get(lease.id, feeType) as { last_month: string | null }

    res.json({ success: true, data: { lastMonth: result.last_month } })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询最近收费月份失败' })
  }
})

/**
 * 费用统计
 * GET /api/fees/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
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
    const totalAmount = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition}
    `).get(...params) as { total: number }

    // 总实收金额
    const totalPaid = await db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition}
    `).get(...params) as { total: number }

    // 未缴金额
    const unpaidAmount = await db.prepare(`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM fees f WHERE 1=1 ${monthCondition} AND f.status IN ('unpaid', 'partial', 'overdue')
    `).get(...params) as { total: number }

    // 各状态费用笔数
    const statusCounts = await db.prepare(`
      SELECT f.status, COUNT(*) as total, COALESCE(SUM(f.amount), 0) as amount
      FROM fees f
      WHERE 1=1 ${monthCondition}
      GROUP BY f.status
    `).all(...params)

    // 按费用类型分组统计
    const feeTypeStats = await db.prepare(`
      SELECT f.fee_type, COUNT(*) as total, COALESCE(SUM(f.amount), 0) as amount, COALESCE(SUM(f.paid_amount), 0) as paid_amount
      FROM fees f
      WHERE 1=1 ${monthCondition}
      GROUP BY f.fee_type
    `).all(...params)

    // 欠费租户列表
    const overdueTenants = await db.prepare(`
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
        feeTypeStats,
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
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.body

    if (!month) {
      res.status(400).json({ success: false, error: '月份为必填项' })
      return
    }

    // 获取所有活跃的租赁合同
    const activeLeases = await db.prepare(`
      SELECT l.id, l.stall_id, l.tenant_id, l.monthly_rent
      FROM leases l
      WHERE l.status IN ('active', 'expiring')
    `).all() as { id: number; stall_id: number; tenant_id: number; monthly_rent: number }[]

    let generated = 0
    let skipped = 0

    const insertFee = db.prepare(`
      INSERT INTO fees (lease_id, tenant_id, month, amount, status, due_date, fee_type, water_electricity_amount, parking_fee, remark)
      VALUES (?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?)
    `)

    // 应缴日期为当月10号
    const dueDate = `${month}-10`

    const transaction = db.transaction(() => {
      for (const lease of activeLeases) {
        // 检查该合同该月是否已生成租金费用
        const existingRent = db.prepare(
          'SELECT id FROM fees WHERE lease_id = ? AND month = ? AND fee_type = ?'
        ).get(lease.id, month, 'rent')

        if (existingRent) {
          skipped++
          continue
        }

        // 生成租金费用
        insertFee.run(lease.id, lease.tenant_id, month, lease.monthly_rent, dueDate, 'rent', 0, 0, `${month}月租金`)
        generated++

        // 生成水电费（金额为0，待后续录入实际金额）
        insertFee.run(lease.id, lease.tenant_id, month, 0, dueDate, 'water_electricity', 0, 0, `${month}月水电费`)
        generated++

        // 生成停车费（金额为0，待后续录入实际金额）
        insertFee.run(lease.id, lease.tenant_id, month, 0, dueDate, 'parking', 0, 0, `${month}月停车费`)
        generated++
      }
    })

    await transaction()

    res.json({
      success: true,
      data: { generated, skipped },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '生成费用失败' })
  }
})

/**
 * 按摊位创建费用（单类型）
 * POST /api/fees/create-by-stall
 */
router.post('/create-by-stall', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stall_id, month, fee_type, amount } = req.body

    if (!stall_id || !month || !fee_type || amount === undefined || amount === null) {
      res.status(400).json({ success: false, error: '摊位、月份、费用类型和金额为必填项' })
      return
    }

    if (!['rent', 'water_electricity', 'parking'].includes(fee_type)) {
      res.status(400).json({ success: false, error: '费用类型无效' })
      return
    }

    // 查找该摊位当前活跃的租赁合同
    const lease = await db.prepare(`
      SELECT l.id, l.tenant_id
      FROM leases l
      WHERE l.stall_id = ? AND l.status IN ('active', 'expiring')
      ORDER BY l.id DESC LIMIT 1
    `).get(stall_id) as { id: number; tenant_id: number } | undefined

    if (!lease) {
      res.status(400).json({ success: false, error: '该摊位没有活跃的租赁合同' })
      return
    }

    // 检查该合同该月该类型是否已有费用记录
    const existing = await db.prepare(
      'SELECT id FROM fees WHERE lease_id = ? AND month = ? AND fee_type = ?'
    ).get(lease.id, month, fee_type)

    if (existing) {
      res.status(400).json({ success: false, error: '该月该类型费用已存在' })
      return
    }

    // 费用类型标签映射
    const feeTypeLabels: Record<string, string> = {
      rent: '租金',
      water_electricity: '水电费',
      parking: '停车费',
    }

    // 根据费用类型设置 water_electricity_amount 和 parking_fee
    let waterElectricityAmount = 0
    let parkingFee = 0
    if (fee_type === 'water_electricity') {
      waterElectricityAmount = Number(amount)
    } else if (fee_type === 'parking') {
      parkingFee = Number(amount)
    }

    const dueDate = `${month}-10`
    const remark = `${month}月${feeTypeLabels[fee_type]}`

    await db.prepare(`
      INSERT INTO fees (lease_id, tenant_id, month, amount, status, due_date, fee_type, water_electricity_amount, parking_fee, remark)
      VALUES (?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?)
    `).run(lease.id, lease.tenant_id, month, Number(amount), dueDate, fee_type, waterElectricityAmount, parkingFee, remark)

    res.json({ success: true, data: { created: 1 } })
  } catch (error) {
    res.status(500).json({ success: false, error: '按摊位创建费用失败' })
  }
})

/**
 * 缴费登记
 * POST /api/fees/:id/pay
 */
router.post('/:id/pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { paid_amount, paid_date, remark } = req.body

    if (paid_amount === undefined || paid_amount === null) {
      res.status(400).json({ success: false, error: '缴费金额为必填项' })
      return
    }

    // 检查费用记录是否存在
    const fee = await db.prepare('SELECT * FROM fees WHERE id = ?').get(id) as any
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

    await db.prepare(`
      UPDATE fees SET
        paid_amount = ?,
        paid_date = ?,
        status = ?,
        remark = COALESCE(?, remark)
      WHERE id = ?
    `).run(newPaidAmount, paid_date || new Date().toISOString().split('T')[0], newStatus, remark || null, id)

    const updatedFee = await db.prepare(`
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
