/**
 * 租户管理路由
 * 处理租户的增删改查操作
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 获取租户列表（支持分页、关键词/状态筛选）
 * GET /api/tenants
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const keyword = req.query.keyword as string
    const status = req.query.status as string

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (keyword) {
      whereClause += ' AND (t.name LIKE ? OR t.phone LIKE ? OR t.id_card LIKE ?)'
      const likeKeyword = `%${keyword}%`
      params.push(likeKeyword, likeKeyword, likeKeyword)
    }
    if (status) {
      whereClause += ' AND t.status = ?'
      params.push(status)
    }

    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM tenants t ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const tenants = db.prepare(
      `SELECT t.* FROM tenants t ${whereClause} ORDER BY t.id DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: tenants,
      total: countResult.total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取租户列表失败' })
  }
})

/**
 * 获取租户详情（含当前租赁和费用记录）
 * GET /api/tenants/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    // 获取租户信息
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any
    if (!tenant) {
      res.status(404).json({ success: false, error: '租户不存在' })
      return
    }

    // 获取当前租赁信息
    const leases = db.prepare(`
      SELECT l.*, s.stall_no, s.area, s.size
      FROM leases l
      JOIN stalls s ON l.stall_id = s.id
      WHERE l.tenant_id = ?
      ORDER BY l.created_at DESC
    `).all(id)

    // 获取费用记录
    const fees = db.prepare(`
      SELECT f.*, l.start_date, l.end_date, s.stall_no
      FROM fees f
      JOIN leases l ON f.lease_id = l.id
      JOIN stalls s ON l.stall_id = s.id
      WHERE f.tenant_id = ?
      ORDER BY f.created_at DESC
    `).all(id)

    res.json({
      success: true,
      data: {
        ...tenant,
        leases,
        fees,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取租户详情失败' })
  }
})

/**
 * 新增租户
 * POST /api/tenants
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, phone, id_card, address, remark, status } = req.body

    if (!name || !phone) {
      res.status(400).json({ success: false, error: '姓名和手机号为必填项' })
      return
    }

    const result = db.prepare(`
      INSERT INTO tenants (name, phone, id_card, address, remark, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, phone, id_card || null, address || null, remark || null, status || 'active')

    const newTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: newTenant })
  } catch (error) {
    res.status(500).json({ success: false, error: '新增租户失败' })
  }
})

/**
 * 更新租户
 * PUT /api/tenants/:id
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { name, phone, id_card, address, remark, status } = req.body

    // 检查租户是否存在
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id)
    if (!tenant) {
      res.status(404).json({ success: false, error: '租户不存在' })
      return
    }

    db.prepare(`
      UPDATE tenants SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        id_card = COALESCE(?, id_card),
        address = COALESCE(?, address),
        remark = COALESCE(?, remark),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(name || null, phone || null, id_card || null, address || null, remark !== undefined ? remark : null, status || null, id)

    const updatedTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id)

    res.json({ success: true, data: updatedTenant })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新租户失败' })
  }
})

export default router
