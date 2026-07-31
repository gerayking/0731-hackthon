import { z } from "zod";

export const spicinessSchema = z.enum([
  "none",
  "mild",
  "medium",
  "hot",
  "any",
  "不辣",
  "微辣",
  "中辣",
  "特辣",
  "麻辣",
  "香辣",
  "辣一点",
  "清汤",
]);
export const requirementTypeSchema = z.enum([
  "exclude_ingredient",
  "exclude_category",
  "spiciness_upper_bound",
  "prefer_spicy",
  "prefer_category",
  "prefer_cheap",
  "vegetarian",
  "unknown",
  "other",
]);
export const hardnessSchema = z.enum(["hard", "soft"]);
export const requirementStatusSchema = z.enum(["active", "revoked", "overridden"]);
export const strategySchema = z.enum(["balanced", "cheap", "coverage"]);

export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  needsTakeout: z.boolean().optional(),
});

export const mealSessionSchema = z.object({
  id: z.string().min(1),
  budget: z.number().nonnegative(),
  memberCount: z.number().int().positive(),
  members: z.array(memberSchema).optional(),
  promotions: z.array(z.unknown()).optional(),
});

export const menuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  spiciness: spicinessSchema.optional(),
  ingredients: z.array(z.string()).optional(),
  containsPork: z.boolean().optional(),
  containsBeef: z.boolean().optional(),
  containsChicken: z.boolean().optional(),
  containsSeafood: z.boolean().optional(),
  containsPeanut: z.boolean().optional(),
  containsEgg: z.boolean().optional(),
  containsDairy: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  suggestedServings: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1).optional(),
  confirmedFields: z.array(z.string()).optional(),
  lowConfidenceFields: z.array(z.string()).optional(),
});

export const requirementSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  type: requirementTypeSchema,
  value: z.string().min(1),
  hardness: hardnessSchema,
  sourceText: z.string().min(1),
  status: requirementStatusSchema,
});

export const planningInputSnapshotSchema = z.object({
  menu: z.array(menuItemSchema),
  session: mealSessionSchema,
  requirementsByMember: z.record(z.string(), z.array(requirementSchema)),
  strategy: strategySchema.optional(),
});

export const planItemSchema = z.object({
  dishId: z.string().min(1),
  dishName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  sharedBy: z.array(z.string().min(1)).optional(),
});

export const planSchema = z.object({
  id: z.string().min(1),
  items: z.array(planItemSchema),
  totalPrice: z.number().nonnegative(),
  budget: z.number().nonnegative(),
  status: z.enum(["valid", "needs_clarification"]),
});

export const conflictSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  dishId: z.string().optional(),
  memberId: z.string().optional(),
});

export const planResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    plan: planSchema,
  }),
  z.object({
    ok: z.literal(false),
    conflicts: z.array(conflictSchema),
    suggestions: z.array(z.string()),
  }),
]);

export const selectedReasonSchema = z.object({
  dishId: z.string().min(1),
  dishName: z.string().min(1),
  reasons: z.array(z.string().min(1)),
});

export const memberRequirementStatusSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().optional(),
  status: z.enum(["satisfied", "partially_satisfied", "conflict", "unknown"]),
  details: z.array(z.string().min(1)),
});

export const excludedItemReasonSchema = z.object({
  dishId: z.string().min(1),
  dishName: z.string().min(1),
  reasons: z.array(z.string().min(1)),
});

export const budgetExplanationSchema = z.object({
  used: z.number().nonnegative(),
  budget: z.number().nonnegative(),
  percent: z.number().nonnegative(),
});

export const explanationSnapshotSchema = z.object({
  selectedReasons: z.array(selectedReasonSchema),
  memberRequirementStatus: z.array(memberRequirementStatusSchema),
  excludedItems: z.array(excludedItemReasonSchema),
  budget: budgetExplanationSchema,
  conflicts: z.array(conflictSchema),
});

export const explainPlanSnapshotSchema = z.object({
  snapshot: planningInputSnapshotSchema,
  plan: planSchema,
});

export const planChangeRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("remove_item"),
    dishId: z.string().min(1),
  }),
  z.object({
    type: z.literal("add_item"),
    dishId: z.string().min(1),
  }),
  z.object({
    type: z.literal("change_strategy"),
    strategy: strategySchema,
  }),
]);

export const revisionInputSnapshotSchema = z.object({
  previousPlan: planSchema,
  currentContext: planningInputSnapshotSchema,
  requestedChanges: z.array(planChangeRequestSchema),
});

export const planItemChangeSchema = z.object({
  dishId: z.string().min(1),
  before: planItemSchema,
  after: planItemSchema,
});

export const planDiffSchema = z.object({
  addedItems: z.array(planItemSchema),
  removedItems: z.array(planItemSchema),
  changedItems: z.array(planItemChangeSchema),
  summary: z.string().min(1),
});

export type Spiciness = z.infer<typeof spicinessSchema>;
export type RequirementType = z.infer<typeof requirementTypeSchema>;
export type Hardness = z.infer<typeof hardnessSchema>;
export type RequirementStatus = z.infer<typeof requirementStatusSchema>;
export type Strategy = z.infer<typeof strategySchema>;
export type Member = z.infer<typeof memberSchema>;
export type MealSession = z.infer<typeof mealSessionSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type PlanningInputSnapshot = z.infer<typeof planningInputSnapshotSchema>;
export type PlanItem = z.infer<typeof planItemSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Conflict = z.infer<typeof conflictSchema>;
export type PlanResult = z.infer<typeof planResultSchema>;
export type SelectedReason = z.infer<typeof selectedReasonSchema>;
export type MemberRequirementStatus = z.infer<typeof memberRequirementStatusSchema>;
export type ExcludedItemReason = z.infer<typeof excludedItemReasonSchema>;
export type BudgetExplanation = z.infer<typeof budgetExplanationSchema>;
export type ExplanationSnapshot = z.infer<typeof explanationSnapshotSchema>;
export type PlanChangeRequest = z.infer<typeof planChangeRequestSchema>;
export type RevisionInputSnapshot = z.infer<typeof revisionInputSnapshotSchema>;
export type PlanItemChange = z.infer<typeof planItemChangeSchema>;
export type PlanDiff = z.infer<typeof planDiffSchema>;
