/**
 * 认证路由
 * 处理用户登录、登出和获取当前用户信息
 */
import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password, remember } = req.body

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    // 对密码进行 MD5 加密
    const md5Password = crypto.createHash('md5').update(password).digest('hex')

    // 查询用户
    const user = db.prepare(
      'SELECT id, username, role, display_name, enabled FROM users WHERE username = ? AND password = ?'
    ).get(username, md5Password) as {
      id: number
      username: string
      role: string
      display_name: string
      enabled: number
    } | undefined

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    if (!user.enabled) {
      res.status(403).json({ success: false, error: '账号已被禁用' })
      return
    }

    // 创建会话
    const sessionId = uuidv4()
    // 根据 remember 参数决定会话过期时间：7天或24小时
    const maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + maxAge).toISOString()

    db.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).run(sessionId, user.id, expiresAt)

    // 设置 cookie
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge,
      sameSite: 'lax',
    })

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response): void => {
  try {
    const sessionId = req.cookies?.session_id

    if (sessionId) {
      // 删除会话记录
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    }

    // 清除 cookie
    res.clearCookie('session_id')

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '登出失败' })
  }
})

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response): void => {
  try {
    // req.user 由 authMiddleware 设置
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' })
      return
    }

    const user = db.prepare(
      'SELECT id, username, role, display_name, enabled, created_at FROM users WHERE id = ?'
    ).get(req.user.id) as {
      id: number
      username: string
      role: string
      display_name: string
      enabled: number
      created_at: string
    } | undefined

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
