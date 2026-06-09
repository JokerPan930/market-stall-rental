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
router.get('/', (req: Request, res: Response): void => {
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
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM stalls s ${whereClause}`
    ).get(...params) as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const stalls = db.prepare(
      `SELECT s.* FROM stalls s ${whereClause} ORDER BY s.id DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: stalls,
      total: countResult.total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取摊位列表失败' })
  }
})

/**
 * 获取摊位详情（含租赁历史和费用记录）
 * GET /api/stalls/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    // 获取摊位信息
    const stall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(id) as any
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    // 获取租赁历史
    const leases = db.prepare(`
      SELECT l.*, t.name as tenant_name, t.phone as tenant_phone
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.stall_id = ?
      ORDER BY l.created_at DESC
    `).all(id)

    // 获取费用记录
    const fees = db.prepare(`
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
        ...stall,
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
router.post('/', (req: Request, res: Response): void => {
  try {
    const { stall_no, area, size, price_per_month, status, description } = req.body

    if (!stall_no || !area || !size || !price_per_month) {
      res.status(400).json({ success: false, error: '摊位编号、区域、面积和月租金为必填项' })
      return
    }

    // 检查摊位编号是否已存在
    const existing = db.prepare('SELECT id FROM stalls WHERE stall_no = ?').get(stall_no)
    if (existing) {
      res.status(400).json({ success: false, error: '摊位编号已存在' })
      return
    }

    const result = db.prepare(`
      INSERT INTO stalls (stall_no, area, size, price_per_month, status, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(stall_no, area, size, price_per_month, status || 'vacant', description || null)

    const newStall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: newStall })
  } catch (error) {
    res.status(500).json({ success: false, error: '新增摊位失败' })
  }
})

/**
 * 更新摊位
 * PUT /api/stalls/:id
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { stall_no, area, size, price_per_month, status, description } = req.body

    // 检查摊位是否存在
    const stall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(id)
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    // 如果修改了摊位编号，检查是否重复
    if (stall_no && stall_no !== (stall as any).stall_no) {
      const existing = db.prepare('SELECT id FROM stalls WHERE stall_no = ? AND id != ?').get(stall_no, id)
      if (existing) {
        res.status(400).json({ success: false, error: '摊位编号已存在' })
        return
      }
    }

    db.prepare(`
      UPDATE stalls SET
        stall_no = COALESCE(?, stall_no),
        area = COALESCE(?, area),
        size = COALESCE(?, size),
        price_per_month = COALESCE(?, price_per_month),
        status = COALESCE(?, status),
        description = COALESCE(?, description),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(stall_no || null, area || null, size || null, price_per_month || null, status || null, description !== undefined ? description : null, id)

    const updatedStall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(id)

    res.json({ success: true, data: updatedStall })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新摊位失败' })
  }
})

/**
 * 删除摊位（仅空置状态可删）
 * DELETE /api/stalls/:id
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const stall = db.prepare('SELECT * FROM stalls WHERE id = ?').get(id) as any
    if (!stall) {
      res.status(404).json({ success: false, error: '摊位不存在' })
      return
    }

    if (stall.status !== 'vacant') {
      res.status(400).json({ success: false, error: '只有空置状态的摊位才能删除' })
      return
    }

    db.prepare('DELETE FROM stalls WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除摊位失败' })
  }
})

export default router
