import path from "node:path";
import { mkdirSync } from "node:fs";

import {
  closeUserDatabase,
  getUserDatabase,
  getUserDatabasePath,
  saveUserDatabase,
} from "../lib/users/db";

const MIGRATIONS = [
  {
    name: "001_create_user_tables",
    up: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'member')),
        nickname TEXT,
        dietaryRestrictions TEXT NOT NULL DEFAULT '',
        budgetHint INTEGER CHECK (budgetHint IS NULL OR budgetHint >= 0),
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS demo_user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'member')),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS idx_demo_user_sessions_active ON demo_user_sessions(active);`,
    ],
  },
];

function ensureDatabaseDirectory(): void {
  const databasePath = getUserDatabasePath();
  const directory = path.dirname(databasePath);
  mkdirSync(directory, { recursive: true });
}

async function main(): Promise<void> {
  ensureDatabaseDirectory();
  const context = await getUserDatabase();

  try {
    context.database.exec("BEGIN TRANSACTION;");

    context.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        appliedAt TEXT NOT NULL
      );
    `);

    const pendingMigrations = MIGRATIONS.filter((migration) => {
      const statement = context.database.prepare(
        "SELECT 1 FROM schema_migrations WHERE name = ?",
        [migration.name],
      );

      try {
        return !statement.step();
      } finally {
        statement.free();
      }
    });

    if (pendingMigrations.length === 0) {
      saveUserDatabase();
      console.log("用户系统数据库已是最新。");
      return;
    }

    for (const migration of pendingMigrations) {
      for (const statement of migration.up) {
        context.database.exec(statement);
      }

      const insertMigration = context.database.prepare(
        "INSERT INTO schema_migrations (name, appliedAt) VALUES (?, ?)",
      );
      insertMigration.bind([migration.name, new Date().toISOString()]);
      insertMigration.step();
      insertMigration.free();
    }

    context.database.exec("COMMIT;");
    saveUserDatabase();

    const appliedMigrationsStatement = context.database.prepare(
      "SELECT name FROM schema_migrations ORDER BY name",
    );
    const appliedMigrations: Array<{ readonly name: string }> = [];

    try {
      while (appliedMigrationsStatement.step()) {
        const row = appliedMigrationsStatement.get();
        const migrationName = row[0];

        if (typeof migrationName !== "string") {
          throw new Error("schema_migrations.name 必须是字符串");
        }

        appliedMigrations.push({ name: migrationName });
      }
    } finally {
      appliedMigrationsStatement.free();
    }

    if (appliedMigrations.length === 0) {
      console.log("用户系统数据库已是最新。");
      return;
    }

    console.log("已应用用户系统数据库迁移：");
    for (const migration of appliedMigrations) {
      console.log(`- ${migration.name}`);
    }
  } catch (error) {
    context.database.exec("ROLLBACK;");
    saveUserDatabase();
    throw error;
  } finally {
    await closeUserDatabase();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  void closeUserDatabase().finally(() => {
    process.exitCode = 1;
  });
});
