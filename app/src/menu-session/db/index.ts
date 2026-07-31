/**
 * M1 数据库初始化入口
 * RFC-0006: M1 菜单与组局模块
 *
 * 确保本地 .data/potluck.sqlite 存在并完成表创建。
 * 使用 better-sqlite3 同步 API 搭配 drizzle-orm。
 */
import path from "node:path"
import fs from "node:fs"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"

/** 数据库文件路径：app/.data/potluck.sqlite */
const DB_DIR = path.resolve(process.cwd(), ".data")
const DB_PATH = path.resolve(DB_DIR, "potluck.sqlite")

/**
 * 初始化数据库目录与文件
 * 在首次访问时自动创建 .data/ 目录
 */
function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

/** 创建数据库表（如果不存在） */
function createTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      spiciness TEXT,
      ingredients TEXT NOT NULL DEFAULT '[]',
      contains_pork INTEGER NOT NULL DEFAULT 0,
      contains_beef INTEGER NOT NULL DEFAULT 0,
      contains_chicken INTEGER NOT NULL DEFAULT 0,
      contains_seafood INTEGER NOT NULL DEFAULT 0,
      contains_peanut INTEGER NOT NULL DEFAULT 0,
      contains_egg INTEGER NOT NULL DEFAULT 0,
      contains_dairy INTEGER NOT NULL DEFAULT 0,
      is_vegetarian INTEGER NOT NULL DEFAULT 0,
      suggested_servings INTEGER NOT NULL DEFAULT 1,
      confidence REAL NOT NULL DEFAULT 0.5,
      confirmed_fields TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS meal_sessions (
      id TEXT PRIMARY KEY,
      budget REAL NOT NULL DEFAULT 0,
      member_count INTEGER NOT NULL DEFAULT 1,
      promotions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS session_members (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      needs_takeout INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES meal_sessions(id) ON DELETE CASCADE
    );
  `)
}

/** 获取底层 better-sqlite3 实例（单例） */
let sqliteInstance: Database.Database | null = null

function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    ensureDbDir()
    sqliteInstance = new Database(DB_PATH)
    // 1. 启用 WAL 模式提升并发性能
    sqliteInstance.pragma("journal_mode = WAL")
    // 2. 启用外键约束
    sqliteInstance.pragma("foreign_keys = ON")
    // 3. 创建表
    createTables(sqliteInstance)
  }
  return sqliteInstance
}

/** 获取 drizzle ORM 实例 */
export function getDb() {
  return drizzle(getSqlite(), { schema })
}

/** 获取数据库文件路径（用于测试或调试） */
export function getDbPath(): string {
  return DB_PATH
}

export { schema }
