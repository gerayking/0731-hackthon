import { z } from "zod";
import { USER_ROLE_VALUES, type UserRole } from "./types";

const MAX_PREFERENCES_NOTES_LENGTH = 240;
const MAX_DIETARY_RESTRICTIONS = 8;
const MAX_RESTRICTION_LENGTH = 48;
const MAX_NICKNAME_LENGTH = 32;
const MIN_BUDGET_HINT = 0;
const MAX_BUDGET_HINT = 1_000_000;

const UserRoleSchema: z.ZodType<UserRole> = z.enum(USER_ROLE_VALUES);

const NonEmptyTrimmedStringSchema = z
  .string()
  .trim()
  .min(1, "不能为空")
  .max(MAX_NICKNAME_LENGTH, `不能超过 ${MAX_NICKNAME_LENGTH} 个字符`);

const UserPreferencesSchema = z
  .object({
    nickname: NonEmptyTrimmedStringSchema.optional(),
    dietaryRestrictions: z
      .array(
        z
          .string()
          .trim()
          .min(1, "忌口不能为空")
          .max(MAX_RESTRICTION_LENGTH, `不能超过 ${MAX_RESTRICTION_LENGTH} 个字符`),
      )
      .max(MAX_DIETARY_RESTRICTIONS, `最多只能设置 ${MAX_DIETARY_RESTRICTIONS} 条忌口`),
    budgetHint: z
      .number()
      .int("预算提示必须是整数")
      .min(MIN_BUDGET_HINT, `不能小于 ${MIN_BUDGET_HINT}`)
      .max(MAX_BUDGET_HINT, `不能超过 ${MAX_BUDGET_HINT}`)
      .optional(),
    notes: z
      .string()
      .trim()
      .max(
        MAX_PREFERENCES_NOTES_LENGTH,
        `不能超过 ${MAX_PREFERENCES_NOTES_LENGTH} 个字符`,
      )
      .optional(),
  })
  .strict();

export const UserSchema = z
  .object({
    id: z.string().min(1, "用户 ID 不能为空"),
    role: UserRoleSchema,
    preferences: UserPreferencesSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const DemoUserSessionSchema = z
  .object({
    userId: z.string().min(1, "用户 ID 不能为空"),
    role: UserRoleSchema,
    active: z.boolean(),
  })
  .strict();

export type UserInput = z.infer<typeof UserSchema>;
export type DemoUserSessionInput = z.infer<typeof DemoUserSessionSchema>;

export function parseUser(value: unknown): UserInput {
  return UserSchema.parse(value);
}

export function parseDemoUserSession(value: unknown): DemoUserSessionInput {
  return DemoUserSessionSchema.parse(value);
}

export function safeParseUser(value: unknown) {
  return UserSchema.safeParse(value);
}

export function safeParseDemoUserSession(value: unknown) {
  return DemoUserSessionSchema.safeParse(value);
}
