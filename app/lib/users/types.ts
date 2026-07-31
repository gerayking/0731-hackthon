/**
 * User-system domain model.
 * RFC-0001: Defines the customer-facing user concepts used by the ordering demo.
 */

export const USER_ROLE_VALUES = ["customer", "admin", "member"] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export interface UserPreferences {
  readonly nickname?: string | undefined;
  readonly dietaryRestrictions: readonly string[];
  readonly budgetHint?: number | undefined;
  readonly notes?: string | undefined;
}

export interface User {
  readonly id: string;
  readonly role: UserRole;
  readonly preferences: UserPreferences;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DemoUserSession {
  readonly userId: string;
  readonly role: UserRole;
  readonly active: boolean;
}

export interface UserValidationError {
  readonly field: string;
  readonly message: string;
}

export interface UserValidationResult {
  readonly ok: boolean;
  readonly errors: readonly UserValidationError[];
}
