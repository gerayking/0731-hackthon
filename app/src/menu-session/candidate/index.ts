/**
 * 本地 mock M2/M3 候选菜单导出入口。
 */
export { createMockMenuCandidateApiClient } from "./candidate-client"
export type {
  ConfirmCandidateResultPayload,
  MockMenuCandidateApiClient,
} from "./candidate-client"
export {
  booleanCandidateFieldLabels,
  candidateFieldKeys,
  createEmptyCandidateSnapshot,
  createMockMenuCandidateSnapshot,
  defaultMockText,
  editableCandidateFieldLabels,
  normalizeCandidateSnapshot,
  parseCandidateText,
  readCandidateSnapshot,
  removeCandidateSnapshot,
  writeCandidateSnapshot,
} from "./types"
export type {
  CandidateFieldKey,
  CandidateStatus,
  MenuCandidateRecord,
  MenuCandidateSource,
  MockMenuCandidateSnapshot,
  PlanResultPreview,
  PlanningConstraintSnapshot,
  PlanningInputSnapshot,
} from "./types"
