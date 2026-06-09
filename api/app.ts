/**
 * Express 应用主入口
 * 配置中间件和路由
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// 导入数据库（确保初始化）
import './db.js'

// 导入认证中间件
import { authMiddleware } from './middleware/auth.js'

// 导入路由
import authRoutes from './routes/auth.js'
import stallsRoutes from './routes/stalls.js'
import tenantsRoutes from './routes/tenants.js'
import leasesRoutes from './routes/leases.js'
import feesRoutes from './routes/fees.js'
import dashboardRoutes from './routes/dashboard.js'
import usersRoutes from './routes/users.js'

// ESM 模式下获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config()

const app: express.Application = express()

// 基础中间件
app.use(cors())
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API 路由
 */

// 认证路由（不需要认证）
app.use('/api/auth', authRoutes)

// 以下路由需要认证
app.use('/api/stalls', authMiddleware, stallsRoutes)
app.use('/api/tenants', authMiddleware, tenantsRoutes)
app.use('/api/leases', authMiddleware, leasesRoutes)
app.use('/api/fees', authMiddleware, feesRoutes)
app.use('/api/dashboard', authMiddleware, dashboardRoutes)
app.use('/api/users', authMiddleware, usersRoutes)

/**
 * 健康检查
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * 错误处理中间件
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', error)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

/**
 * 404 处理
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API 不存在',
  })
})

export default app
