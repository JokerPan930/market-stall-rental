/**
 * 认证中间件
 * 从 cookie 中读取 session_id，验证会话有效性，将用户信息挂载到 req.user
 */
import { type Request, type Response, type NextFunction } from 'express'
import db from '../db.js'

// 扩展 Express Request 类型，添加 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        role: string
        display_name: string
      }
    }
  }
}

/**
 * 认证中间件：验证用户会话
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.session_id

  if (!sessionId) {
    res.status(401).json({ success: false, error: '未登录，请先登录' })
    return
  }

  // 查询会话信息
  const session = db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.username, u.role, u.display_name, u.enabled
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(sessionId) as {
    id: string
    user_id: number
    expires_at: string
    username: string
    role: string
    display_name: string
    enabled: number
  } | undefined

  if (!session) {
    res.status(401).json({ success: false, error: '会话无效，请重新登录' })
    return
  }

  // 检查用户是否被禁用
  if (!session.enabled) {
    res.status(403).json({ success: false, error: '账号已被禁用' })
    return
  }

  // 检查会话是否过期
  const expiresAt = new Date(session.expires_at)
  if (expiresAt <= new Date()) {
    // 清除过期会话
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    res.status(401).json({ success: false, error: '会话已过期，请重新登录' })
    return
  }

  // 将用户信息挂载到 req.user
  req.user = {
    id: session.user_id,
    username: session.username,
    role: session.role,
    display_name: session.display_name,
  }

  next()
}

/**
 * 角色权限中间件：验证用户是否具有指定角色
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录，请先登录' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    next()
  }
}
