import { z } from "zod"

/**
 * M2 domain types for OCR and requirement-agent contracts.
 * RFC-0003: Defines the JSON contracts that M2 exposes without writing menu,
 * requirement, order, or inventory state.
 */

export const OcrModeSchema = z.enum(["image", "text"])
export type OcrMode = z.infer<typeof OcrModeSchema>

export const OcrInputSchema = z.object({
  mode: OcrModeSchema,
  content: z.string().min(1).max(10_000),
})
export type OcrInput = z.infer<typeof OcrInputSchema>

export const BooleanFlagKeysSchema = z.enum([
  "containsPork",
  "containsBeef",
  "containsChicken",
  "containsSeafood",
  "containsPeanut",
  "containsEgg",
  "containsDairy",
  "isVegetarian",
])
export type BooleanFlagKey = z.infer<typeof BooleanFlagKeysSchema>

export const MenuItemInputSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  name: z.string().min(1).max(128),
  price: z.number().nonnegative().finite(),
  category: z.string().min(1).max(128).optional(),
  spiciness: z.string().min(1).max(64).optional(),
  ingredients: z.array(z.string().min(1).max(128)).optional(),
  containsPork: z.boolean().optional(),
  containsBeef: z.boolean().optional(),
  containsChicken: z.boolean().optional(),
  containsSeafood: z.boolean().optional(),
  containsPeanut: z.boolean().optional(),
  containsEgg: z.boolean().optional(),
  containsDairy: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  suggestedServings: z.number().int().positive().finite().optional(),
  confidence: z.number().min(0).max(1).finite().optional(),
  confirmedFields: z.array(z.string().min(1).max(128)).optional(),
  lowConfidenceFields: z.array(z.string().min(1).max(128)).optional(),
})
export type MenuItemInput = z.infer<typeof MenuItemInputSchema>

export const MenuCandidateSnapshotSchema = z.object({
  source: z.enum(["ocr", "text"]),
  candidates: z.array(MenuItemInputSchema).min(1).max(200),
})
export type MenuCandidateSnapshot = z.infer<typeof MenuCandidateSnapshotSchema>

export const RequirementInputSchema = z.object({
  memberId: z.string().min(1).max(128),
  text: z.string().min(1).max(2_000),
})
export type RequirementInput = z.infer<typeof RequirementInputSchema>

export const RequirementTypeSchema = z.enum([
  "exclude_ingredient",
  "spiciness_upper_bound",
  "prefer_spicy",
  "prefer_category",
  "exclude_category",
  "unknown",
])
export type RequirementType = z.infer<typeof RequirementTypeSchema>

export const RequirementHardnessSchema = z.enum(["hard", "soft"])
export type RequirementHardness = z.infer<typeof RequirementHardnessSchema>

export const RequirementStatusSchema = z.enum(["active", "revoked", "overridden"])
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>

export const RequirementSchema = z.object({
  id: z.string().min(1).max(128),
  memberId: z.string().min(1).max(128),
  type: RequirementTypeSchema,
  value: z.string().min(1).max(256),
  hardness: RequirementHardnessSchema,
  sourceText: z.string().min(1).max(2_000),
  status: RequirementStatusSchema,
})
export type Requirement = z.infer<typeof RequirementSchema>

export const RequirementsSnapshotSchema = z.object({
  requirementsByMember: z.record(z.string().min(1).max(128), z.array(RequirementSchema)),
})
export type RequirementsSnapshot = z.infer<typeof RequirementsSnapshotSchema>

export const AddRequirementIntentSchema = z
  .object({
    action: z.literal("add_requirement"),
    memberId: z.string().min(1).max(128),
    text: z.string().min(1).max(2_000),
    requirements: z.array(RequirementInputSchema).max(50),
    unresolvedTexts: z.array(z.string().min(1).max(2_000)),
  })
  .superRefine((intent, ctx) => {
    if (intent.requirements.length === 0 && intent.unresolvedTexts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requirements"],
        message: "At least one requirement or unresolvedText must be present.",
      })
    }
  })
export type AddRequirementIntent = z.infer<typeof AddRequirementIntentSchema>

export const RevokeRequirementIntentSchema = z.object({
  action: z.literal("revoke_requirement"),
  requirementId: z.string().min(1).max(128),
})
export type RevokeRequirementIntent = z.infer<typeof RevokeRequirementIntentSchema>

export const OverrideRequirementIntentSchema = z.object({
  action: z.literal("override_requirement"),
  memberId: z.string().min(1).max(128),
  text: z.string().min(1).max(2_000),
  previousRequirementId: z.string().min(1).max(128),
  requirements: z.array(RequirementInputSchema).min(1).max(50),
})
export type OverrideRequirementIntent = z.infer<typeof OverrideRequirementIntentSchema>

export const AgentIntentSchema = z.discriminatedUnion("action", [
  AddRequirementIntentSchema,
  RevokeRequirementIntentSchema,
  OverrideRequirementIntentSchema,
])
export type AgentIntent = z.infer<typeof AgentIntentSchema>

export const ParseRequirementsInputSchema = z.object({
  memberId: z.string().min(1).max(128),
  text: z.string().min(1).max(2_000),
})
export type ParseRequirementsInput = z.infer<typeof ParseRequirementsInputSchema>

export const ParseRequirementsOutputSchema = z.object({
  snapshot: RequirementsSnapshotSchema,
  intent: AgentIntentSchema,
})
export type ParseRequirementsOutput = z.infer<typeof ParseRequirementsOutputSchema>

export const ExtractMenuOutputSchema = z.object({
  snapshot: MenuCandidateSnapshotSchema,
})
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>
