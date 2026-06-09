/**
 * 租赁管理路由
 * 处理租赁合同的签订、续租、退租等操作
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 检查并更新即将到期的合同状态（30天内到期更新为 expiring）
 */
function checkExpiringLeases(): void {
  db.prepare(`
    UPDATE leases SET status = 'expiring', updated_at = datetime('now')
    WHERE status = 'active'
    AND date(end_date) <= date('now', '+30 days')
    AND date(end_date) > date('now')
  `).run()
}

/**
 * 检查并更新已过期的合同状态
 */
function checkExpiredLeases(): void {
  db.prepare(`
    UPDATE leases SET status = 'expired', updated_at = datetime('now')
    WHERE status IN ('active', 'expiring')
    AND date(end_date) <= date('now')
  `).run()
}

/**
 * 获取租赁列表（支持分页、状态筛选）
 * GET /api/leases
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    // 每次查询时自动检查合同状态
    checkExpiringLeases()
    checkExpiredLeases()

    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as string

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      whereClause += ' AND l.status = ?'
      params.push(status)
    }

    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM leases l ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const leases = db.prepare(`
      SELECT l.*, s.stall_no, s.area, s.size, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      ${whereClause}
      ORDER BY l.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: leases,
      total: countResult.total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取租赁列表失败' })
  }
})

/**
 * 获取租赁详情
 * GET /api/leases/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const lease = db.prepare(`
      SELECT l.*, s.stall_no, s.area, s.size, s.price_per_month, t.name as tenant_name, t.phone as tenant_phone, t.id_card
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(id) as any

    if (!lease) {
      res.status(404).json({ success: false, error: '租赁合同不存在' })
      return
    }

    // 获取费用记录
    const fees = db.prepare(
      'SELECT * FROM fees WHERE lease_id = ? ORDER BY month DESC'
    ).all(id)

    res.json({
      success: true,
      data: {
        ...lease,
        fees,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取租赁详情失败' })
  }
})

/**
 * 签订合同（同时更新摊位状态为 rented，生成首月费用）
 * POST /api/leases
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { stall_id, tenant_id, start_date, end_date, monthly_rent, deposit, remark } = req.body

    if (!stall_id || !tenant_id || !start_date || !end_date || !monthly_rent) {
      res.status(400).json({ success: false, error: '摊位、租户、起止日期和月租金为必填项' })
      return
    }

    // 检查摊位是否存在且为空置状态
    const stall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(stall_id) as any
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }
    if (stall.status === 'rented') {
      res.status(400).json({ success: false, error: '该摊位已被出租' })
      return
    }

    // 检查租户是否存在
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id) as any
    if (!tenant) {
      res.status(404).json({ success: false, error: '租户不存在' })
      return
    }

    // 使用事务确保数据一致性
    const transaction = db.transaction(() => {
      // 创建租赁合同
      const leaseResult = db.prepare(`
        INSERT INTO leases (stall_id, tenant_id, start_date, end_date, monthly_rent, deposit, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(stall_id, tenant_id, start_date, end_date, monthly_rent, deposit || 0, remark || null)

      // 更新摊位状态为已出租
      db.prepare("UPDATE stalls SET status = 'rented', updated_at = datetime('now') WHERE id = ?").run(stall_id)

      // 生成首月费用
      const leaseId = leaseResult.lastInsertRowid
      const startDate = new Date(start_date)
      const month = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
      // 应缴日期为当月10号
      const dueDate = `${month}-10`

      db.prepare(`
        INSERT INTO fees (lease_id, tenant_id, month, amount, status, due_date, remark)
        VALUES (?, ?, ?, ?, 'unpaid', ?, ?)
      `).run(leaseId, tenant_id, month, monthly_rent, dueDate, '首月租金')

      return leaseId
    })

    const leaseId = transaction()

    // 检查合同是否即将到期
    checkExpiringLeases()

    const newLease = db.prepare(`
      SELECT l.*, s.stall_no, s.area, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(leaseId)

    res.status(201).json({ success: true, data: newLease })
  } catch (error) {
    res.status(500).json({ success: false, error: '签订合同失败' })
  }
})

/**
 * 续租
 * POST /api/leases/:id/renew
 */
router.post('/:id/renew', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { end_date, monthly_rent, remark } = req.body

    if (!end_date) {
      res.status(400).json({ success: false, error: '新的结束日期为必填项' })
      return
    }

    // 检查合同是否存在
    const lease = db.prepare('SELECT * FROM leases WHERE id = ?').get(id) as any
    if (!lease) {
      res.status(404).json({ success: false, error: '租赁合同不存在' })
      return
    }

    if (lease.status === 'terminated') {
      res.status(400).json({ success: false, error: '已终止的合同不能续租' })
      return
    }

    // 更新合同
    db.prepare(`
      UPDATE leases SET
        end_date = ?,
        monthly_rent = COALESCE(?, monthly_rent),
        status = 'active',
        remark = COALESCE(?, remark),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(end_date, monthly_rent || null, remark || null, id)

    // 检查合同是否即将到期
    checkExpiringLeases()

    const updatedLease = db.prepare(`
      SELECT l.*, s.stall_no, s.area, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(id)

    res.json({ success: true, data: updatedLease })
  } catch (error) {
    res.status(500).json({ success: false, error: '续租失败' })
  }
})

/**
 * 退租（同时更新摊位状态为 vacant）
 * POST /api/leases/:id/terminate
 */
router.post('/:id/terminate', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { remark } = req.body

    // 检查合同是否存在
    const lease = db.prepare('SELECT * FROM leases WHERE id = ?').get(id) as any
    if (!lease) {
      res.status(404).json({ success: false, error: '租赁合同不存在' })
      return
    }

    if (lease.status === 'terminated') {
      res.status(400).json({ success: false, error: '合同已经终止' })
      return
    }

    // 使用事务确保数据一致性
    const transaction = db.transaction(() => {
      // 更新合同状态为已终止
      db.prepare(`
        UPDATE leases SET status = 'terminated', remark = COALESCE(?, remark), updated_at = datetime('now')
        WHERE id = ?
      `).run(remark || null, id)

      // 更新摊位状态为空置
      db.prepare("UPDATE stalls SET status = 'vacant', updated_at = datetime('now') WHERE id = ?").run(lease.stall_id)
    })

    transaction()

    const updatedLease = db.prepare(`
      SELECT l.*, s.stall_no, s.area, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(id)

    res.json({ success: true, data: updatedLease })
  } catch (error) {
    res.status(500).json({ success: false, error: '退租失败' })
  }
})

export default router
