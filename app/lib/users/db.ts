/**
 * SQLite persistence layer for the user system.
 * RFC-0001: Provides local database access for users and demo sessions.
 */

import fs from "node:fs";
import path from "node:path";

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

import type { DemoUserSession, User, UserRole } from "./types";

const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "user-system.sqlite");

export interface UserRecord {
  readonly id: string;
  readonly role: UserRole;
  readonly nickname: string | null;
  readonly dietaryRestrictions: string;
  readonly budgetHint: number | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DemoUserSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly active: 0 | 1;
  readonly updatedAt: string;
}

interface UserSystemDatabaseContext {
  readonly sql: SqlJsStatic;
  readonly database: Database;
  readonly databasePath: string;
}

let databaseInstance: UserSystemDatabaseContext | undefined;

export function getUserDatabasePath(): string {
  return process.env.USER_SYSTEM_DB_PATH ?? DEFAULT_DB_PATH;
}

export async function getUserDatabase(): Promise<UserSystemDatabaseContext> {
  if (databaseInstance !== undefined) {
    return databaseInstance;
  }

  const sql = await initSqlJs();
  const databasePath = getUserDatabasePath();
  const database = fs.existsSync(databasePath) ? new sql.Database(fs.readFileSync(databasePath)) : new sql.Database();

  databaseInstance = {
    sql,
    database,
    databasePath,
  };

  return databaseInstance;
}

export async function closeUserDatabase(): Promise<void> {
  if (databaseInstance !== undefined) {
    saveUserDatabase();
    databaseInstance.database.close();
    databaseInstance = undefined;
  }
}

export function saveUserDatabase(): void {
  if (databaseInstance !== undefined) {
    const directory = path.dirname(databaseInstance.databasePath);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(databaseInstance.databasePath, databaseInstance.database.export());
  }
}

export function toUserRecord(user: User): UserRecord {
  return {
    id: user.id,
    role: user.role,
    nickname: user.preferences.nickname ?? null,
    dietaryRestrictions: user.preferences.dietaryRestrictions.join(","),
    budgetHint: user.preferences.budgetHint ?? null,
    notes: user.preferences.notes ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function fromUserRecord(record: UserRecord): User {
  return {
    id: record.id,
    role: record.role,
    preferences: {
      nickname: record.nickname ?? undefined,
      dietaryRestrictions: record.dietaryRestrictions
        .split(",")
        .filter((restriction) => restriction.length > 0),
      budgetHint: record.budgetHint ?? undefined,
      notes: record.notes ?? undefined,
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toDemoUserSessionRecord(session: DemoUserSession): DemoUserSessionRecord {
  return {
    id: session.userId,
    userId: session.userId,
    role: session.role,
    active: session.active ? 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}

export function fromDemoUserSessionRecord(record: DemoUserSessionRecord): DemoUserSession {
  return {
    userId: record.userId,
    role: record.role,
    active: record.active === 1,
  };
}
