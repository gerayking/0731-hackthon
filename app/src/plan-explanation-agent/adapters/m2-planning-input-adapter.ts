import {
  menuItemSchema,
  planningInputSnapshotSchema,
  type MealSession,
  type MenuItem,
  type PlanningInputSnapshot,
  type Strategy,
} from "@/src/contracts/snapshots"
import {
  MenuCandidateSnapshotSchema,
  RequirementsSnapshotSchema,
  type MenuCandidateSnapshot,
  type MenuItemInput,
  type RequirementsSnapshot,
} from "@/src/ocr-requirement-agent/domain"

export type BuildPlanningInputSnapshotFromM2Inputs = {
  menuSnapshot: MenuCandidateSnapshot
  requirementsSnapshot: RequirementsSnapshot
  session: MealSession
  strategy?: Strategy
}

export function buildPlanningInputSnapshotFromM2Outputs(input: BuildPlanningInputSnapshotFromM2Inputs): PlanningInputSnapshot {
  const menu = MenuCandidateSnapshotSchema.parse(input.menuSnapshot).candidates.map(normalizeMenuItem)
  const requirementsByMember = RequirementsSnapshotSchema.parse(input.requirementsSnapshot).requirementsByMember

  return planningInputSnapshotSchema.parse({
    menu,
    session: input.session,
    requirementsByMember,
    strategy: input.strategy,
  })
}

function normalizeMenuItem(candidate: MenuItemInput): MenuItem {
  const id = candidate.id ?? createMenuItemId(candidate)

  return menuItemSchema.parse({
    ...candidate,
    id,
  })
}

function createMenuItemId(candidate: MenuItemInput): string {
  const slug = candidate.name
    .trim()
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  const stableSuffix = slug.length > 0 ? slug : "menu-item"

  return `m2-${stableSuffix}-${Math.abs(hashCode(`${candidate.name}-${candidate.price}-${candidate.category ?? ""}`))}`
}

function hashCode(value: string): number {
  let hash = 0

  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0)
    hash |= 0
  }

  return hash
}
