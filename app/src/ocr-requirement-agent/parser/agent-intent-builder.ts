import {
  AddRequirementIntentSchema,
  AgentIntentSchema,
  OverrideRequirementIntentSchema,
  RevokeRequirementIntentSchema,
  type AddRequirementIntent,
  type AgentIntent,
  type OverrideRequirementIntent,
  type ParseRequirementsInput,
  type ParseRequirementsOutput,
  type Requirement,
  type RequirementInput,
  type RequirementsSnapshot,
} from "../domain"

/**
 * Build validated AgentIntent values from parsed M2 requirement candidates.
 * RFC-0003: T4 converts RequirementInput / Requirement snapshots into add,
 * revoke, or override intents without mutating requirement state.
 */

export type AddRequirementIntentInput = ParseRequirementsInput & {
  requirements: RequirementInput[]
  unresolvedTexts: string[]
}

export type RevokeRequirementIntentInput = {
  action: "revoke_requirement"
  requirementId: string
}

export type OverrideRequirementIntentInput = ParseRequirementsInput & {
  previousRequirementId: string
  requirements: RequirementInput[]
}

export type BuildAgentIntentInput =
  | AddRequirementIntentInput
  | RevokeRequirementIntentInput
  | OverrideRequirementIntentInput

/**
 * Build an AgentIntent for a fresh requirement candidate.
 * RFC-0003: T4 wraps parsed requirements and unresolved text as add_requirement.
 */
export function buildAddRequirementIntent(input: AddRequirementIntentInput): AddRequirementIntent {
  return AddRequirementIntentSchema.parse({
    action: "add_requirement",
    memberId: input.memberId,
    text: input.text,
    requirements: input.requirements,
    unresolvedTexts: input.unresolvedTexts,
  })
}

/**
 * Build an AgentIntent for revoking an existing requirement candidate.
 * RFC-0003: T4 only emits a revoke_requirement intent and does not write state.
 */
export function buildRevokeRequirementIntent(input: { requirementId: string }): AgentIntent {
  return RevokeRequirementIntentSchema.parse({
    action: "revoke_requirement",
    requirementId: input.requirementId,
  })
}

/**
 * Build an AgentIntent for overriding an existing requirement candidate.
 * RFC-0003: T4 carries the previous requirement id with the new requirement inputs.
 */
export function buildOverrideRequirementIntent(input: OverrideRequirementIntentInput): OverrideRequirementIntent {
  return OverrideRequirementIntentSchema.parse({
    action: "override_requirement",
    memberId: input.memberId,
    text: input.text,
    previousRequirementId: input.previousRequirementId,
    requirements: input.requirements,
  })
}

/**
 * Build an AgentIntent from a typed union of add/revoke/override requests.
 * RFC-0003: T4 centralizes schema validation for all M2 intent outputs.
 */
export function buildAgentIntent(input: BuildAgentIntentInput): AgentIntent {
  let intent: AgentIntent

  if (isRevokeRequirementIntentInput(input)) {
    intent = buildRevokeRequirementIntent(input)
  } else if (isOverrideRequirementIntentInput(input)) {
    intent = buildOverrideRequirementIntent(input)
  } else if (isAddRequirementIntentInput(input)) {
    intent = buildAddRequirementIntent(input)
  } else {
    throw new Error("Unsupported AgentIntent input")
  }

  return AgentIntentSchema.parse(intent)
}

/**
 * Build an add_requirement intent from a RequirementsSnapshot and raw parse input.
 * RFC-0003: T4 keeps parser output compatible with the public AgentIntent contract.
 */
export function buildAddRequirementIntentFromSnapshot(input: ParseRequirementsInput, snapshot: RequirementsSnapshot): AddRequirementIntent {
  const requirements = (snapshot.requirementsByMember[input.memberId] ?? []).map((requirement: Requirement): RequirementInput => ({
    memberId: requirement.memberId,
    text: requirement.sourceText,
  }))

  const unresolvedTexts = buildUnresolvedTexts(input.text, requirements)

  return buildAddRequirementIntent({
    memberId: input.memberId,
    text: input.text,
    requirements,
    unresolvedTexts,
  })
}

/**
 * Build a ParseRequirementsOutput with an add_requirement intent.
 * RFC-0003: T4 lets the parser reuse intent generation while preserving its output shape.
 */
export function buildParseRequirementsOutput(input: ParseRequirementsInput, snapshot: RequirementsSnapshot): ParseRequirementsOutput {
  return {
    snapshot,
    intent: buildAddRequirementIntentFromSnapshot(input, snapshot),
  }
}

function isAddRequirementIntentInput(input: BuildAgentIntentInput): input is AddRequirementIntentInput {
  return "memberId" in input && "text" in input && "requirements" in input && "unresolvedTexts" in input
}

function isRevokeRequirementIntentInput(input: BuildAgentIntentInput): input is RevokeRequirementIntentInput {
  return "action" in input && input.action === "revoke_requirement" && "requirementId" in input
}

function isOverrideRequirementIntentInput(input: BuildAgentIntentInput): input is OverrideRequirementIntentInput {
  return "memberId" in input && "text" in input && "previousRequirementId" in input && "requirements" in input
}

function buildUnresolvedTexts(sourceText: string, requirements: readonly RequirementInput[]): string[] {
  const requirementTexts = requirements.map((requirement) => requirement.text.trim())
  const sentences = sourceText
    .split(/[,，;；。！!？?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)

  return sentences.filter((sentence) => !requirementTexts.includes(sentence))
}
