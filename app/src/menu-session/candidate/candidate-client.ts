/**
 * 本地 mock M2/M3 候选菜单客户端。
 *
 * 该模块只运行在前端/客户端路径：
 * - 从示例文本或 OCR 模拟文本生成结构化 MenuCandidateRecord；
 * - 使用 localStorage 持久化候选快照；
 * - 用户确认候选后，通过 M1 mock client 写入菜单状态；
 * - 基于 M1 snapshot 与候选快照组装 M3 PlanningInputSnapshot 预览。
 */
import { createMockMenuSessionApiClient } from "../api"
import type { MenuItem, MenuItemInput, MenuSessionSnapshot } from "../domain"
import {
  createEmptyCandidateSnapshot,
  parseCandidateText,
  readCandidateSnapshot,
  removeCandidateSnapshot,
  writeCandidateSnapshot,
  type CandidateFieldKey,
  type MenuCandidateRecord,
  type MockMenuCandidateSnapshot,
  type PlanResultPreview,
  type PlanningInputSnapshot,
} from "./types"

type CandidateApiClient = ReturnType<typeof createMockMenuCandidateApiClient>

export type ConfirmCandidateResultPayload = {
  snapshot: MockMenuCandidateSnapshot
  createdItem: MenuItem
}

export type MockMenuCandidateApiClient = {
  generateFromText: (
    rawText: string,
    source: MockMenuCandidateSnapshot["source"],
  ) => MockMenuCandidateSnapshot
  updateCandidate: (
    candidateId: string,
    patch: Partial<MenuCandidateRecord>,
  ) => MockMenuCandidateSnapshot
  toggleConfirmedField: (
    candidateId: string,
    field: CandidateFieldKey,
  ) => MockMenuCandidateSnapshot
  confirmCandidate: (candidateId: string) => Promise<ConfirmCandidateResultPayload>
  clearSnapshot: () => MockMenuCandidateSnapshot
  getSnapshot: () => MockMenuCandidateSnapshot
  buildPlanningInputSnapshot: (
    snapshot: MockMenuCandidateSnapshot,
    menuSessionSnapshot: MenuSessionSnapshot,
  ) => PlanningInputSnapshot
  buildPlanPreview: (snapshot: MockMenuCandidateSnapshot) => PlanResultPreview
}

function cloneSnapshot(snapshot: MockMenuCandidateSnapshot): MockMenuCandidateSnapshot {
  return {
    source: snapshot.source,
    candidates: snapshot.candidates.map((candidate) => ({ ...candidate })),
    updatedAt: snapshot.updatedAt,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function createCandidateInput(candidate: MenuCandidateRecord): MenuItemInput {
  return {
    name: candidate.name.trim(),
    price: candidate.price,
    category: candidate.category?.trim() || undefined,
    spiciness: candidate.spiciness?.trim() || undefined,
    ingredients: candidate.ingredients,
    containsPork: candidate.containsPork,
    containsBeef: candidate.containsBeef,
    containsChicken: candidate.containsChicken,
    containsSeafood: candidate.containsSeafood,
    containsPeanut: candidate.containsPeanut,
    containsEgg: candidate.containsEgg,
    containsDairy: candidate.containsDairy,
    isVegetarian: candidate.isVegetarian,
    suggestedServings: candidate.suggestedServings,
    confidence: candidate.confidence,
    confirmedFields: candidate.confirmedFields,
  }
}

type CandidateConfirmationPayload = {
  candidate: MenuItemInput
  confirmedFields: CandidateFieldKey[]
}

function validateCandidateForConfirmation(
  candidate: MenuCandidateRecord,
): CandidateConfirmationPayload {
  const input = createCandidateInput(candidate)
  if (input.name.length === 0) {
    throw new Error("候选菜品名称不能为空。")
  }
  if (input.price < 0) {
    throw new Error("候选菜品价格必须为非负数。")
  }
  if (candidate.confirmedFields.length === 0) {
    throw new Error("至少需要确认一个候选字段后才能写入菜单。")
  }

  return {
    candidate: input,
    confirmedFields: candidate.confirmedFields,
  }
}

export function createMockMenuCandidateApiClient(
  menuSessionApiClient: ReturnType<typeof createMockMenuSessionApiClient>,
): MockMenuCandidateApiClient {
  return {
    generateFromText(rawText, source) {
      const snapshot = parseCandidateText(rawText, source)
      writeCandidateSnapshot(snapshot)
      return snapshot
    },

    updateCandidate(candidateId, patch) {
      const snapshot = cloneSnapshot(readCandidateSnapshot())
      const nextCandidates = snapshot.candidates.map((candidate) => {
        if (candidate.candidateId !== candidateId) {
          return candidate
        }

        const allowedPatch = removeCandidateStateFields(patch)
        return {
          ...candidate,
          ...allowedPatch,
          confirmedFields: candidate.confirmedFields,
          updatedAt: nowIso(),
        }
      })

      const nextSnapshot = {
        ...snapshot,
        candidates: nextCandidates,
        updatedAt: nowIso(),
      }
      writeCandidateSnapshot(nextSnapshot)
      return nextSnapshot
    },

    toggleConfirmedField(candidateId, field) {
      const snapshot = cloneSnapshot(readCandidateSnapshot())
      const nextCandidates = snapshot.candidates.map((candidate) => {
        if (candidate.candidateId !== candidateId) {
          return candidate
        }

        const hasField = candidate.confirmedFields.includes(field)
        const confirmedFields = hasField
          ? candidate.confirmedFields.filter((item: CandidateFieldKey) => item !== field)
          : [...candidate.confirmedFields, field]

        return {
          ...candidate,
          confirmedFields,
          updatedAt: nowIso(),
        }
      })

      const nextSnapshot = {
        ...snapshot,
        candidates: nextCandidates,
        updatedAt: nowIso(),
      }
      writeCandidateSnapshot(nextSnapshot)
      return nextSnapshot
    },

    async confirmCandidate(candidateId) {
      const snapshot = cloneSnapshot(readCandidateSnapshot())
      const candidateIndex = snapshot.candidates.findIndex(
        (candidate) => candidate.candidateId === candidateId,
      )
      const candidate = snapshot.candidates[candidateIndex]
      if (!candidate) {
        throw new Error("未找到待确认候选。")
      }

      const parsed = validateCandidateForConfirmation(candidate)
      const createdItem = await menuSessionApiClient.createMenuItem(parsed.candidate)
      const confirmedAt = nowIso()
      const nextCandidates = snapshot.candidates.map((item) => {
        if (item.candidateId !== candidateId) {
          return item
        }

        const confirmedItem: MenuCandidateRecord = {
          ...item,
          status: "confirmed",
          confirmedFields: parsed.confirmedFields,
          createdAt: item.createdAt,
          updatedAt: confirmedAt,
          confirmedAt,
          createdItemId: createdItem.id,
        }
        return confirmedItem
      })
      const nextSnapshot = {
        ...snapshot,
        candidates: nextCandidates,
        updatedAt: confirmedAt,
      }
      writeCandidateSnapshot(nextSnapshot)

      return {
        snapshot: nextSnapshot,
        createdItem,
      }
    },

    clearSnapshot() {
      removeCandidateSnapshot()
      return createEmptyCandidateSnapshot()
    },

    getSnapshot() {
      return readCandidateSnapshot()
    },

    buildPlanningInputSnapshot(snapshot, menuSessionSnapshot) {
      const confirmedCandidateIds = snapshot.candidates
        .filter((candidate) => candidate.status === "confirmed")
        .map((candidate) => candidate.candidateId)
      const pendingCandidateIds = snapshot.candidates
        .filter((candidate) => candidate.status === "pending")
        .map((candidate) => candidate.candidateId)

      return {
        source: "mock-m2-m3-local",
        generatedAt: nowIso(),
        menuSessionSnapshot,
        candidateSnapshot: cloneSnapshot(snapshot),
        confirmedCandidateIds,
        pendingCandidateIds,
        constraints: {
          budget: menuSessionSnapshot.session.budget,
          memberCount: menuSessionSnapshot.session.memberCount,
          members: menuSessionSnapshot.session.members.map((member) => ({
            id: member.id,
            name: member.name,
            needsTakeout: member.needsTakeout,
          })),
          promotions: menuSessionSnapshot.session.promotions,
        },
        planRequest: {
          mode: "mock-preview",
          goal: "基于已确认候选与 M1 菜单组局快照生成 mock 方案预览",
          includeUnconfirmedCandidates: pendingCandidateIds.length > 0,
        },
      }
    },

    buildPlanPreview(snapshot) {
      const confirmedCandidates = snapshot.candidates.filter(
        (candidate) => candidate.status === "confirmed",
      )
      const pendingCount = snapshot.candidates.filter(
        (candidate) => candidate.status === "pending",
      ).length
      const warnings: string[] = []
      if (snapshot.candidates.length === 0) {
        warnings.push("尚未生成候选菜单，M3 只能展示空输入。")
      }
      if (pendingCount > 0) {
        warnings.push(`仍有 ${pendingCount} 个候选未完成字段确认。`)
      }
      if (confirmedCandidates.length === 0) {
        warnings.push("尚未确认任何候选，当前方案预览只包含 M1 菜单。")
      }

      return {
        status: "mock-preview" as const,
        summary: confirmedCandidates.length > 0
          ? `Mock M3 已读取 ${confirmedCandidates.length} 个已确认候选，可继续生成方案解释。`
          : "Mock M3 已读取 M1 snapshot，但暂无已确认候选。",
        selectedCandidateIds: confirmedCandidates.map(
          (candidate) => candidate.candidateId,
        ),
        selectedItems: confirmedCandidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          name: candidate.name,
          price: candidate.price,
        })),
        warnings,
      }
    },
  }
}

/** 候选状态字段由客户端自身维护，不允许通过 patch 覆盖 */
const CANDIDATE_STATE_FIELD_KEYS: readonly (keyof MenuCandidateRecord)[] = [
  "candidateId",
  "status",
  "confirmedFields",
  "createdAt",
  "updatedAt",
  "confirmedAt",
  "createdItemId",
]

function removeCandidateStateFields(
  patch: Partial<MenuCandidateRecord>,
): Partial<MenuCandidateRecord> {
  const allowedPatch: Partial<MenuCandidateRecord> = { ...patch }

  for (const key of CANDIDATE_STATE_FIELD_KEYS) {
    delete allowedPatch[key]
  }

  return allowedPatch
}

export type { CandidateApiClient }
