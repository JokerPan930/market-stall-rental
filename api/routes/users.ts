/**
 * 用户管理路由
 * 处理用户的增删改查操作
 */
import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const users = db.prepare(
      'SELECT id, username, role, display_name, enabled, created_at FROM users ORDER BY id ASC'
    ).all()

    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户列表失败' })
  }
})

/**
 * 新增用户（密码 MD5 加密）
 * POST /api/users
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { username, password, role, display_name, enabled } = req.body

    if (!username || !password || !role || !display_name) {
      res.status(400).json({ success: false, error: '用户名、密码、角色和显示名为必填项' })
      return
    }

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' })
      return
    }

    // 对密码进行 MD5 加密
    const md5Password = crypto.createHash('md5').update(password).digest('hex')

    const result = db.prepare(`
      INSERT INTO users (username, password, role, display_name, enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, md5Password, role, display_name, enabled !== undefined ? enabled : 1)

    const newUser = db.prepare(
      'SELECT id, username, role, display_name, enabled, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: newUser })
  } catch (error) {
    res.status(500).json({ success: false, error: '新增用户失败' })
  }
})

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { username, role, display_name, enabled } = req.body

    // 检查用户是否存在
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    // 如果修改了用户名，检查是否重复
    if (username && username !== (user as any).username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
      if (existing) {
        res.status(400).json({ success: false, error: '用户名已存在' })
        return
      }
    }

    db.prepare(`
      UPDATE users SET
        username = COALESCE(?, username),
        role = COALESCE(?, role),
        display_name = COALESCE(?, display_name),
        enabled = COALESCE(?, enabled)
      WHERE id = ?
    `).run(username || null, role || null, display_name || null, enabled !== undefined ? enabled : null, id)

    const updatedUser = db.prepare(
      'SELECT id, username, role, display_name, enabled, created_at FROM users WHERE id = ?'
    ).get(id)

    res.json({ success: true, data: updatedUser })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新用户失败' })
  }
})

/**
 * 修改密码
 * PUT /api/users/:id/password
 */
router.put('/:id/password', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { old_password, new_password } = req.body

    if (!old_password || !new_password) {
      res.status(400).json({ success: false, error: '旧密码和新密码为必填项' })
      return
    }

    // 检查用户是否存在
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    // 验证旧密码
    const oldMd5Password = crypto.createHash('md5').update(old_password).digest('hex')
    if (oldMd5Password !== user.password) {
      res.status(400).json({ success: false, error: '旧密码错误' })
      return
    }

    // 更新密码
    const newMd5Password = crypto.createHash('md5').update(new_password).digest('hex')
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newMd5Password, id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '修改密码失败' })
  }
})

export default router
