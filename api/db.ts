/**
 * 数据库初始化模块
 * 使用 PostgreSQL (pg) 适配 Vercel Serverless 环境
 */
import { Pool, PoolClient } from 'pg'
import { AsyncLocalStorage } from 'async_hooks'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 加载环境变量（必须在创建 Pool 之前）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const connectionString = process.env.DATABASE_URL || 'postgresql://market:market@127.0.0.1:5432/market'

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') || connectionString.includes('pooler') ? { rejectUnauthorized: false } : false,
  max: 10,
})

const transactionStorage = new AsyncLocalStorage<PoolClient>()

function convertParams(sql: string): string {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

class PreparedStatement {
  constructor(private sql: string) {}

  async get(...params: any[]) {
    const client = transactionStorage.getStore() || pool
    const converted = convertParams(this.sql)
    const result = await client.query(converted, params)
    return result.rows[0] || null
  }

  async all(...params: any[]) {
    const client = transactionStorage.getStore() || pool
    const converted = convertParams(this.sql)
    const result = await client.query(converted, params)
    return result.rows
  }

  async run(...params: any[]) {
    const client = transactionStorage.getStore() || pool
    const converted = convertParams(this.sql)
    const result = await client.query(converted, params)
    return {
      lastInsertRowid: result.rows[0]?.id,
      changes: result.rowCount || 0,
    }
  }
}

const db = {
  prepare(sql: string) {
    return new PreparedStatement(sql)
  },

  transaction(fn: () => any) {
    return async () => {
      const client = await pool.connect()
      await client.query('BEGIN')
      try {
        const result = await transactionStorage.run(client, fn)
        await client.query('COMMIT')
        return result
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    }
  },

  async exec(sql: string) {
    await pool.query(sql)
  },

  pool,
}

// 初始化数据库
async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'finance')),
      display_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stalls (
      id SERIAL PRIMARY KEY,
      stall_no TEXT NOT NULL UNIQUE,
      area TEXT NOT NULL,
      size NUMERIC NOT NULL,
      price_per_month NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'vacant' CHECK(status IN ('vacant', 'rented', 'maintenance')),
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      id_card TEXT,
      address TEXT,
      remark TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leases (
      id SERIAL PRIMARY KEY,
      stall_id INTEGER NOT NULL REFERENCES stalls(id),
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      monthly_rent NUMERIC NOT NULL,
      deposit NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expiring', 'expired', 'terminated')),
      remark TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fees (
      id SERIAL PRIMARY KEY,
      lease_id INTEGER NOT NULL REFERENCES leases(id),
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      month TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      paid_amount NUMERIC NOT NULL DEFAULT 0,
      paid_date TEXT,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')),
      due_date TEXT NOT NULL,
      fee_type TEXT NOT NULL DEFAULT 'rent' CHECK(fee_type IN ('rent', 'water_electricity', 'parking')),
      water_electricity_amount NUMERIC NOT NULL DEFAULT 0,
      parking_fee NUMERIC NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // 兼容已有数据库：添加新字段
  await db.exec(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE fees ADD COLUMN fee_type TEXT NOT NULL DEFAULT 'rent';
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE fees ADD COLUMN water_electricity_amount NUMERIC NOT NULL DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE fees ADD COLUMN parking_fee NUMERIC NOT NULL DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
    END $$;
  `)

  // 检查是否需要插入初始数据
  const userCount = await db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: string | number } | null
  if (!userCount || Number(userCount.total) === 0) {
    // 插入管理员账号
    await db.prepare(`INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)`).run('admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin', '系统管理员')

    // 插入示例区域数据
    await db.prepare(`INSERT INTO areas (name, description, sort_order) VALUES (?, ?, ?)`).run('A区-水果区', '水果批发区域', 1)
    await db.prepare(`INSERT INTO areas (name, description, sort_order) VALUES (?, ?, ?)`).run('B区-蔬菜区', '蔬菜批发区域', 2)
    await db.prepare(`INSERT INTO areas (name, description, sort_order) VALUES (?, ?, ?)`).run('C区-熟食区', '熟食零售区域', 3)

    // 插入示例摊位数据
    const insertStall = db.prepare(`INSERT INTO stalls (stall_no, area, size, price_per_month, status, description) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`)
    const a001 = await insertStall.run('A-001', 'A区-水果区', 20, 1500, 'rented', '靠近入口，位置优越')
    const a002 = await insertStall.run('A-002', 'A区-水果区', 18, 1350, 'vacant', '标准摊位')
    const a003 = await insertStall.run('A-003', 'A区-水果区', 25, 1875, 'rented', '大型摊位，含冷藏设备')
    const a004 = await insertStall.run('A-004', 'A区-水果区', 15, 1125, 'maintenance', '维修中，水管问题')
    const b001 = await insertStall.run('B-001', 'B区-蔬菜区', 22, 1320, 'rented', '标准摊位')
    const b002 = await insertStall.run('B-002', 'B区-蔬菜区', 22, 1320, 'vacant', '标准摊位')
    const b003 = await insertStall.run('B-003', 'B区-蔬菜区', 30, 1800, 'rented', '大型摊位')
    const c001 = await insertStall.run('C-001', 'C区-熟食区', 20, 2000, 'rented', '含排烟设施')
    const c002 = await insertStall.run('C-002', 'C区-熟食区', 20, 2000, 'vacant', '含排烟设施')
    const c003 = await insertStall.run('C-003', 'C区-熟食区', 25, 2500, 'vacant', '大型摊位，含全套设备')

    // 插入示例租户数据
    const insertTenant = db.prepare(`INSERT INTO tenants (name, phone, id_card, address, remark, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`)
    const t1 = await insertTenant.run('张三', '13800138001', '110101199001011234', '北京市朝阳区建国路1号', '老客户', 'active')
    const t2 = await insertTenant.run('李四', '13800138002', '110101199202022345', '北京市海淀区中关村大街2号', '', 'active')
    const t3 = await insertTenant.run('王五', '13800138003', '110101199303033456', '北京市东城区王府井大街3号', '优质租户', 'active')
    const t4 = await insertTenant.run('赵六', '13800138004', '110101199404044567', '北京市西城区金融街4号', '', 'active')
    await insertTenant.run('钱七', '13800138005', '110101199505055678', '北京市丰台区南三环5号', '已退租', 'inactive')

    // 插入示例租赁合同
    const insertLease = db.prepare(`INSERT INTO leases (stall_id, tenant_id, start_date, end_date, monthly_rent, deposit, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    const l1 = await insertLease.run(a001.lastInsertRowid, t1.lastInsertRowid, '2025-01-01', '2027-06-30', 1500, 3000, 'active', '年度合同')
    const l2 = await insertLease.run(b001.lastInsertRowid, t2.lastInsertRowid, '2025-03-01', '2027-02-28', 1320, 2640, 'active', '标准合同')
    const l3 = await insertLease.run(c001.lastInsertRowid, t3.lastInsertRowid, '2025-06-01', '2027-05-31', 2000, 4000, 'active', '熟食区合同')
    const l4 = await insertLease.run(a003.lastInsertRowid, t4.lastInsertRowid, '2025-04-01', '2027-03-31', 1875, 3750, 'active', 'A区大型摊位合同')

    // 插入示例费用记录
    const insertFee = db.prepare(`INSERT INTO fees (lease_id, tenant_id, month, amount, paid_amount, paid_date, status, due_date, fee_type, water_electricity_amount, parking_fee, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-01', 1500, 1500, '2025-01-05', 'paid', '2025-01-10', 'rent', 0, 0, '1月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-02', 1500, 1500, '2025-02-03', 'paid', '2025-02-10', 'rent', 0, 0, '2月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-03', 1500, 1500, '2025-03-05', 'paid', '2025-03-10', 'rent', 0, 0, '3月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-04', 1500, 1500, '2025-04-02', 'paid', '2025-04-10', 'rent', 0, 0, '4月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-05', 1500, 1500, '2025-05-05', 'paid', '2025-05-10', 'rent', 0, 0, '5月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-06', 1500, 0, null, 'unpaid', '2025-06-10', 'rent', 0, 0, '6月租金')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-06', 350, 0, null, 'unpaid', '2025-06-10', 'water_electricity', 350, 0, '6月水电费')
    await insertFee.run(l1.lastInsertRowid, t1.lastInsertRowid, '2025-06', 200, 0, null, 'unpaid', '2025-06-10', 'parking', 0, 200, '6月停车费')

    await insertFee.run(l2.lastInsertRowid, t2.lastInsertRowid, '2025-03', 1320, 1320, '2025-03-08', 'paid', '2025-03-10', 'rent', 0, 0, '3月租金')
    await insertFee.run(l2.lastInsertRowid, t2.lastInsertRowid, '2025-04', 1320, 1320, '2025-04-05', 'paid', '2025-04-10', 'rent', 0, 0, '4月租金')
    await insertFee.run(l2.lastInsertRowid, t2.lastInsertRowid, '2025-05', 1320, 660, '2025-05-15', 'partial', '2025-05-10', 'rent', 0, 0, '5月租金，部分缴纳')
    await insertFee.run(l2.lastInsertRowid, t2.lastInsertRowid, '2025-06', 1320, 0, null, 'unpaid', '2025-06-10', 'rent', 0, 0, '6月租金')
    await insertFee.run(l2.lastInsertRowid, t2.lastInsertRowid, '2025-06', 280, 0, null, 'unpaid', '2025-06-10', 'water_electricity', 280, 0, '6月水电费')

    await insertFee.run(l3.lastInsertRowid, t3.lastInsertRowid, '2025-06', 2000, 0, null, 'overdue', '2025-06-05', 'rent', 0, 0, '6月租金，已逾期')
  }
}

initDb().catch(console.error)

export default db as any
