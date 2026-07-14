/**
 * 摊位管理路由
 * 处理摊位的增删改查操作
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 获取摊位列表（支持分页、按区域/状态/关键词筛选）
 * GET /api/stalls
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const area = req.query.area as string
    const status = req.query.status as string
    const keyword = req.query.keyword as string

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (area) {
      whereClause += ' AND s.area = ?'
      params.push(area)
    }
    if (status) {
      whereClause += ' AND s.status = ?'
      params.push(status)
    }
    if (keyword) {
      whereClause += ' AND (s.stall_no LIKE ? OR s.description LIKE ? OR s.area LIKE ?)'
      const likeKeyword = `%${keyword}%`
      params.push(likeKeyword, likeKeyword, likeKeyword)
    }

    // 获取总数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM stalls s ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据（关联当前活跃租赁合同的租户信息）
    const offset = (page - 1) * pageSize
    const stalls = await db.prepare(
      `SELECT s.*,
        CASE
          WHEN active_lease.id IS NOT NULL THEN 'rented'
          WHEN s.status = 'maintenance' THEN 'maintenance'
          ELSE 'vacant'
        END AS effective_status,
        active_lease.id AS current_lease_id,
        active_tenant.name AS current_tenant_name,
        active_tenant.phone AS current_tenant_phone
      FROM stalls s
      LEFT JOIN (
        SELECT l1.id, l1.stall_id, l1.tenant_id
        FROM leases l1
        WHERE l1.status IN ('active', 'expiring')
        AND l1.end_date::date >= CURRENT_DATE
        AND l1.start_date::date <= CURRENT_DATE
        AND l1.id = (
          SELECT l2.id FROM leases l2
          WHERE l2.stall_id = l1.stall_id AND l2.status IN ('active', 'expiring')
          AND l2.end_date::date >= CURRENT_DATE
          AND l2.start_date::date <= CURRENT_DATE
          ORDER BY l2.id DESC LIMIT 1
        )
      ) active_lease ON active_lease.stall_id = s.id
      LEFT JOIN tenants active_tenant ON active_tenant.id = active_lease.tenant_id
      ${whereClause}
      ORDER BY s.id ASC
      LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: stalls,
      total: countResult.total,
    })
  } catch (error: any) {
    console.error('Stalls list error:', error?.message, error?.code)
    res.status(500).json({ success: false, error: '获取摊位列表失败' })
  }
})

/**
 * 获取摊位详情（含租赁历史和费用记录）
 * GET /api/stalls/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // 获取摊位信息（含有效租赁状态）
    const stallRow = await db.prepare(`
      SELECT s.*,
        CASE
          WHEN active_lease.id IS NOT NULL THEN 'rented'
          WHEN s.status = 'maintenance' THEN 'maintenance'
          ELSE 'vacant'
        END AS effective_status,
        active_lease.id AS current_lease_id,
        active_tenant.name AS current_tenant_name,
        active_tenant.phone AS current_tenant_phone
      FROM stalls s
      LEFT JOIN (
        SELECT l1.id, l1.stall_id, l1.tenant_id
        FROM leases l1
        WHERE l1.status IN ('active', 'expiring')
        AND l1.end_date >= CURRENT_DATE
        AND l1.start_date <= CURRENT_DATE
        AND l1.id = (
          SELECT l2.id FROM leases l2
          WHERE l2.stall_id = l1.stall_id AND l2.status IN ('active', 'expiring')
          AND l2.end_date >= CURRENT_DATE
          AND l2.start_date <= CURRENT_DATE
          ORDER BY l2.id DESC LIMIT 1
        )
      ) active_lease ON active_lease.stall_id = s.id
      LEFT JOIN tenants active_tenant ON active_tenant.id = active_lease.tenant_id
      WHERE s.id = ?
    `).get(id) as any
    if (!stallRow) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    // 获取租赁历史
    const leases = await db.prepare(`
      SELECT l.*, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.stall_id = ?
      ORDER BY l.created_at DESC
    `).all(id)

    // 获取费用记录
    const fees = await db.prepare(`
      SELECT f.*, t.name as tenant_name
      FROM fees f
      JOIN tenants t ON f.tenant_id = t.id
      JOIN leases l ON f.lease_id = l.id
      WHERE l.stall_id = ?
      ORDER BY f.created_at DESC
    `).all(id)

    res.json({
      success: true,
      data: {
        ...stallRow,
        leases,
        fees,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取摊位详情失败' })
  }
})

/**
 * 新增摊位
 * POST /api/stalls
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stall_no, area, size, price_per_month, status, description } = req.body

    if (!stall_no || !area || !size || !price_per_month) {
      res.status(400).json({ success: false, error: '摊位编号、区域、面积和月租金为必填项' })
      return
    }

    // 检查摊位编号是否已存在
    const existing = await db.prepare('SELECT id FROM stalls WHERE stall_no = ?').get(stall_no)
    if (existing) {
      res.status(400).json({ success: false, error: '摊位编号已存在' })
      return
    }

    const result = await db.prepare(`
      INSERT INTO stalls (stall_no, area, size, price_per_month, status, description)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `).run(stall_no, area, size, price_per_month, status || 'vacant', description || null)

    const newStall = await db.prepare('SELECT * FROM stalls WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: newStall })
  } catch (error) {
    res.status(500).json({ success: false, error: '新增摊位失败' })
  }
})

/**
 * 更新摊位
 * PUT /api/stalls/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { stall_no, area, size, price_per_month, status, description } = req.body

    // 检查摊位是否存在
    const stall = await db.prepare('SELECT * FROM stalls WHERE id = ?').get(id)
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    // 如果修改了摊位编号，检查是否重复
    if (stall_no && stall_no !== (stall as any).stall_no) {
      const existing = await db.prepare('SELECT id FROM stalls WHERE stall_no = ? AND id != ?').get(stall_no, id)
      if (existing) {
        res.status(400).json({ success: false, error: '摊位编号已存在' })
        return
      }
    }

    await db.prepare(`
      UPDATE stalls SET
        stall_no = COALESCE(?, stall_no),
        area = COALESCE(?, area),
        size = COALESCE(?, size),
        price_per_month = COALESCE(?, price_per_month),
        status = COALESCE(?, status),
        description = COALESCE(?, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(stall_no || null, area || null, size || null, price_per_month || null, status || null, description !== undefined ? description : null, id)

    const updatedStall = await db.prepare('SELECT * FROM stalls WHERE id = ?').get(id)

    res.json({ success: true, data: updatedStall })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新摊位失败' })
  }
})

/**
 * 删除摊位（仅空置状态可删）
 * DELETE /api/stalls/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const stall = await db.prepare('SELECT * FROM stalls WHERE id = ?').get(id) as any
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    if (stall.status !== 'vacant') {
      res.status(400).json({ success: false, error: '只有空置状态的摊位才能删除' })
      return
    }

    await db.prepare('DELETE FROM stalls WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除摊位失败' })
  }
})

export default router
