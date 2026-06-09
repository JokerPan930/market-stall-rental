/**
 * 数据库初始化模块
 * 使用 better-sqlite3 创建并初始化市场摊位租赁管理系统数据库
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// ESM 模式下获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 确保数据目录存在
const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 创建数据库连接
const dbPath = path.join(dataDir, 'market.db')
const db = new Database(dbPath)

// 启用外键约束
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 创建所有表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'finance')),
    display_name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stall_no TEXT NOT NULL UNIQUE,
    area TEXT NOT NULL,
    size REAL NOT NULL,
    price_per_month REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'vacant' CHECK(status IN ('vacant', 'rented', 'maintenance')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    id_card TEXT,
    address TEXT,
    remark TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stall_id INTEGER NOT NULL REFERENCES stalls(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rent REAL NOT NULL,
    deposit REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expiring', 'expired', 'terminated')),
    remark TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lease_id INTEGER NOT NULL REFERENCES leases(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    month TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    paid_date TEXT,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')),
    due_date TEXT NOT NULL,
    remark TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// 插入初始管理员账号（仅在 users 表为空时插入）
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
if (userCount.count === 0) {
  // 插入管理员账号，密码 123456 的 MD5 值
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)
  `)
  insertUser.run('admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin', '系统管理员')

  // 插入示例摊位数据（3个区域、10个摊位）
  const insertStall = db.prepare(`
    INSERT INTO stalls (stall_no, area, size, price_per_month, status, description) VALUES (?, ?, ?, ?, ?, ?)
  `)

  // A区 - 水果区
  insertStall.run('A-001', 'A区-水果区', 20, 1500, 'rented', '靠近入口，位置优越')
  insertStall.run('A-002', 'A区-水果区', 18, 1350, 'vacant', '标准摊位')
  insertStall.run('A-003', 'A区-水果区', 25, 1875, 'rented', '大型摊位，含冷藏设备')
  insertStall.run('A-004', 'A区-水果区', 15, 1125, 'maintenance', '维修中，水管问题')

  // B区 - 蔬菜区
  insertStall.run('B-001', 'B区-蔬菜区', 22, 1320, 'rented', '标准摊位')
  insertStall.run('B-002', 'B区-蔬菜区', 22, 1320, 'vacant', '标准摊位')
  insertStall.run('B-003', 'B区-蔬菜区', 30, 1800, 'rented', '大型摊位')

  // C区 - 熟食区
  insertStall.run('C-001', 'C区-熟食区', 20, 2000, 'rented', '含排烟设施')
  insertStall.run('C-002', 'C区-熟食区', 20, 2000, 'vacant', '含排烟设施')
  insertStall.run('C-003', 'C区-熟食区', 25, 2500, 'vacant', '大型摊位，含全套设备')

  // 插入示例租户数据（5个租户）
  const insertTenant = db.prepare(`
    INSERT INTO tenants (name, phone, id_card, address, remark, status) VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertTenant.run('张三', '13800138001', '110101199001011234', '北京市朝阳区建国路1号', '老客户', 'active')
  insertTenant.run('李四', '13800138002', '110101199202022345', '北京市海淀区中关村大街2号', '', 'active')
  insertTenant.run('王五', '13800138003', '110101199303033456', '北京市东城区王府井大街3号', '优质租户', 'active')
  insertTenant.run('赵六', '13800138004', '110101199404044567', '北京市西城区金融街4号', '', 'active')
  insertTenant.run('钱七', '13800138005', '110101199505055678', '北京市丰台区南三环5号', '已退租', 'inactive')

  // 插入示例租赁合同（3个合同）
  const insertLease = db.prepare(`
    INSERT INTO leases (stall_id, tenant_id, start_date, end_date, monthly_rent, deposit, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertLease.run(1, 1, '2025-01-01', '2026-06-30', 1500, 3000, 'active', '年度合同')
  insertLease.run(5, 2, '2025-03-01', '2026-02-28', 1320, 2640, 'active', '标准合同')
  insertLease.run(8, 3, '2025-06-01', '2026-05-31', 2000, 4000, 'active', '熟食区合同')

  // 插入示例费用记录
  const insertFee = db.prepare(`
    INSERT INTO fees (lease_id, tenant_id, month, amount, paid_amount, paid_date, status, due_date, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  // 张三的费用
  insertFee.run(1, 1, '2025-01', 1500, 1500, '2025-01-05', 'paid', '2025-01-10', '1月租金')
  insertFee.run(1, 1, '2025-02', 1500, 1500, '2025-02-03', 'paid', '2025-02-10', '2月租金')
  insertFee.run(1, 1, '2025-03', 1500, 1500, '2025-03-05', 'paid', '2025-03-10', '3月租金')
  insertFee.run(1, 1, '2025-04', 1500, 1500, '2025-04-02', 'paid', '2025-04-10', '4月租金')
  insertFee.run(1, 1, '2025-05', 1500, 1500, '2025-05-05', 'paid', '2025-05-10', '5月租金')
  insertFee.run(1, 1, '2025-06', 1500, 0, null, 'unpaid', '2025-06-10', '6月租金')

  // 李四的费用
  insertFee.run(2, 2, '2025-03', 1320, 1320, '2025-03-08', 'paid', '2025-03-10', '3月租金')
  insertFee.run(2, 2, '2025-04', 1320, 1320, '2025-04-05', 'paid', '2025-04-10', '4月租金')
  insertFee.run(2, 2, '2025-05', 1320, 660, '2025-05-15', 'partial', '2025-05-10', '5月租金，部分缴纳')
  insertFee.run(2, 2, '2025-06', 1320, 0, null, 'unpaid', '2025-06-10', '6月租金')

  // 王五的费用
  insertFee.run(3, 3, '2025-06', 2000, 0, null, 'overdue', '2025-06-05', '6月租金，已逾期')
}

export default db
