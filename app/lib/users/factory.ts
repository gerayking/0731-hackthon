import {
  parseDemoUserSession,
  parseUser,
  safeParseDemoUserSession,
  safeParseUser,
  type DemoUserSessionInput,
  type UserInput,
} from "./schemas";
import type { DemoUserSession, User, UserValidationError, UserValidationResult } from "./types";

export function createUser(value: unknown): User {
  return parseUser(value);
}

export function createDemoUserSession(value: unknown): DemoUserSession {
  return parseDemoUserSession(value);
}

export function validateUser(value: unknown): UserValidationResult {
  const result = safeParseUser(value);

  if (result.success) {
    return {
      ok: true,
      errors: [],
    };
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function validateDemoUserSession(value: unknown): UserValidationResult {
  const result = safeParseDemoUserSession(value);

  if (result.success) {
    return {
      ok: true,
      errors: [],
    };
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function assertValidUser(value: unknown): asserts value is UserInput {
  const validation = validateUser(value);

  if (!validation.ok) {
    throw new UserInputValidationError(validation.errors);
  }
}

export function assertValidDemoUserSession(
  value: unknown,
): asserts value is DemoUserSessionInput {
  const validation = validateDemoUserSession(value);

  if (!validation.ok) {
    throw new UserInputValidationError(validation.errors);
  }
}

export class UserInputValidationError extends Error {
  readonly errors: readonly UserValidationError[];

  constructor(errors: readonly UserValidationError[]) {
    super("用户输入校验失败");
    this.name = "UserInputValidationError";
    this.errors = errors;
  }
}
