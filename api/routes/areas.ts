/**
 * 区域管理路由
 * 处理区域的增删改查操作
 */
import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

/**
 * 获取所有区域（用于下拉选择，不分页）
 * GET /api/areas/all
 */
router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const areas = await db.prepare(`
      SELECT * FROM areas ORDER BY sort_order ASC
    `).all()

    res.json({
      success: true,
      data: areas,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取区域列表失败' })
  }
})

/**
 * 获取区域列表（支持分页，按 sort_order 排序）
 * GET /api/areas
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    // 获取总数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM areas`
    ).get() as { total: number }

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const areas = await db.prepare(`
      SELECT * FROM areas ORDER BY sort_order ASC LIMIT ? OFFSET ?
    `).all(pageSize, offset)

    res.json({
      success: true,
      data: areas,
      total: countResult.total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取区域列表失败' })
  }
})

/**
 * 新增区域
 * POST /api/areas
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, sort_order } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: '区域名称为必填项' })
      return
    }

    // 检查区域名称是否已存在
    const existing = await db.prepare('SELECT id FROM areas WHERE name = ?').get(name)
    if (existing) {
      res.status(400).json({ success: false, error: '区域名称已存在' })
      return
    }

    const result = await db.prepare(`
      INSERT INTO areas (name, description, sort_order)
      VALUES (?, ?, ?)
      RETURNING id
    `).run(name, description || null, sort_order || 0)

    const newArea = await db.prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: newArea })
  } catch (error) {
    res.status(500).json({ success: false, error: '新增区域失败' })
  }
})

/**
 * 更新区域
 * PUT /api/areas/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, description, sort_order } = req.body

    // 检查区域是否存在
    const area = await db.prepare('SELECT * FROM areas WHERE id = ?').get(id)
    if (!area) {
      res.status(404).json({ success: false, error: '区域不存在' })
      return
    }

    // 如果修改了区域名称，检查是否重复
    if (name && name !== (area as any).name) {
      const existing = await db.prepare('SELECT id FROM areas WHERE name = ? AND id != ?').get(name, id)
      if (existing) {
        res.status(400).json({ success: false, error: '区域名称已存在' })
        return
      }
    }

    await db.prepare(`
      UPDATE areas SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name || null, description !== undefined ? description : null, sort_order !== undefined ? sort_order : null, id)

    const updatedArea = await db.prepare('SELECT * FROM areas WHERE id = ?').get(id)

    res.json({ success: true, data: updatedArea })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新区域失败' })
  }
})

/**
 * 删除区域（需检查是否有关联摊位）
 * DELETE /api/areas/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const area = await db.prepare('SELECT * FROM areas WHERE id = ?').get(id) as any
    if (!area) {
      res.status(404).json({ success: false, error: '区域不存在' })
      return
    }

    // 检查是否有关联摊位
    const stallCount = await db.prepare(
      'SELECT COUNT(*) as total FROM stalls WHERE area = ?'
    ).get(area.name) as { total: number }

    if (stallCount.total > 0) {
      res.status(400).json({
        success: false,
        error: `该区域下有 ${stallCount.total} 个摊位，无法删除`
      })
      return
    }

    await db.prepare('DELETE FROM areas WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除区域失败' })
  }
})

export default router
