"use client"

import { useCallback, useMemo, useState } from "react"
import { createMockMenuSessionApiClient } from "@/src/menu-session/api"
import {
  booleanCandidateFieldLabels,
  candidateFieldKeys,
  createMockMenuCandidateApiClient,
  defaultMockText,
  editableCandidateFieldLabels,
  readCandidateSnapshot,
} from "@/src/menu-session/candidate"
import type {
  CandidateFieldKey,
  MenuCandidateRecord,
  MockMenuCandidateSnapshot,
  PlanResultPreview,
  PlanningInputSnapshot,
} from "@/src/menu-session/candidate"
import type { MenuSessionSnapshot } from "@/src/menu-session/domain"

type CandidateApiClient = ReturnType<typeof createMockMenuCandidateApiClient>
type MenuSessionApiClient = ReturnType<typeof createMockMenuSessionApiClient>
type CandidateSource = MockMenuCandidateSnapshot["source"]
type BooleanCandidateFieldKey = Extract<
  CandidateFieldKey,
  | "containsPork"
  | "containsBeef"
  | "containsChicken"
  | "containsSeafood"
  | "containsPeanut"
  | "containsEgg"
  | "containsDairy"
  | "isVegetarian"
>
type TextFieldKey = Extract<
  CandidateFieldKey,
  "name" | "category" | "spiciness" | "ingredients"
>
type NumberFieldKey = Extract<
  CandidateFieldKey,
  "price" | "suggestedServings" | "confidence"
>

type CandidateConfirmationPanelProps = {
  menuSessionSnapshot: MenuSessionSnapshot | null
  onRefresh: () => Promise<void>
}

const emptyMenuSessionSnapshot: MenuSessionSnapshot = {
  menu: [],
  session: {
    id: "default",
    budget: 0,
    memberCount: 0,
    members: [],
    promotions: [],
  },
}

export function CandidateConfirmationPanel({
  menuSessionSnapshot,
  onRefresh,
}: CandidateConfirmationPanelProps) {
  const [menuSessionApiClient] = useState<MenuSessionApiClient>(() =>
    createMockMenuSessionApiClient(),
  )
  const [candidateClient] = useState<CandidateApiClient>(() =>
    createMockMenuCandidateApiClient(menuSessionApiClient),
  )
  const [rawText, setRawText] = useState(defaultMockText)
  const [source, setSource] = useState<CandidateSource>("text")
  const [snapshot, setSnapshot] = useState<MockMenuCandidateSnapshot>(() =>
    readCandidateSnapshot(),
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    const loadedSnapshot = readCandidateSnapshot()
    return loadedSnapshot.candidates[0]?.candidateId ?? ""
  })
  const [message, setMessage] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * 候选列表变化后，若原选中项已不存在则回落到第一项。
   * 这是纯派生状态，用 useMemo 计算而不是在 effect 里 setState，避免级联渲染。
   */
  const effectiveSelectedCandidateId = useMemo(() => {
    const exists = snapshot.candidates.some(
      (candidate) => candidate.candidateId === selectedCandidateId,
    )
    if (exists) {
      return selectedCandidateId
    }
    return snapshot.candidates[0]?.candidateId ?? ""
  }, [selectedCandidateId, snapshot.candidates])

  const selectedCandidate = useMemo(() => {
    return snapshot.candidates.find(
      (candidate) => candidate.candidateId === effectiveSelectedCandidateId,
    )
  }, [effectiveSelectedCandidateId, snapshot.candidates])

  const effectiveMenuSessionSnapshot = useMemo(() => {
    return menuSessionSnapshot ?? emptyMenuSessionSnapshot
  }, [menuSessionSnapshot])

  /** M3 输入快照与方案预览同样由当前 snapshot 派生 */
  const planningInputSnapshot = useMemo<PlanningInputSnapshot>(() => {
    return candidateClient.buildPlanningInputSnapshot(
      snapshot,
      effectiveMenuSessionSnapshot,
    )
  }, [candidateClient, effectiveMenuSessionSnapshot, snapshot])

  const planPreview = useMemo<PlanResultPreview>(() => {
    return candidateClient.buildPlanPreview(snapshot)
  }, [candidateClient, snapshot])

  const generateCandidates = useCallback(() => {
    const nextSnapshot = candidateClient.generateFromText(rawText, source)
    setSnapshot(nextSnapshot)
    setSelectedCandidateId(nextSnapshot.candidates[0]?.candidateId ?? "")
    setMessage(`Mock M2 已生成 ${nextSnapshot.candidates.length} 个候选。`)
  }, [candidateClient, rawText, source])

  const loadPersistedSnapshot = useCallback(() => {
    const nextSnapshot = candidateClient.getSnapshot()
    setSnapshot(nextSnapshot)
    setSelectedCandidateId(nextSnapshot.candidates[0]?.candidateId ?? "")
    setMessage("已从本地 mock 状态恢复候选快照。")
  }, [candidateClient])

  const clearSnapshot = useCallback(() => {
    const nextSnapshot = candidateClient.clearSnapshot()
    setSnapshot(nextSnapshot)
    setSelectedCandidateId("")
    setMessage("已清空本地候选快照。")
  }, [candidateClient])

  const updateTextField = useCallback(
    (field: TextFieldKey, value: string) => {
      if (!selectedCandidate) {
        return
      }

      const nextSnapshot = candidateClient.updateCandidate(
        selectedCandidate.candidateId,
        { [field]: value } as Partial<MenuCandidateRecord>,
      )
      setSnapshot(nextSnapshot)
    },
    [candidateClient, selectedCandidate],
  )

  const updateNumberField = useCallback(
    (field: NumberFieldKey, value: string) => {
      if (!selectedCandidate) {
        return
      }

      const parsed = Number(value)
      if (!Number.isFinite(parsed)) {
        return
      }

      const nextValue =
        field === "price"
          ? Math.max(0, parsed)
          : field === "suggestedServings"
            ? Math.max(1, Math.floor(parsed))
            : clamp(parsed, 0, 1)
      const nextSnapshot = candidateClient.updateCandidate(
        selectedCandidate.candidateId,
        { [field]: nextValue } as Partial<MenuCandidateRecord>,
      )
      setSnapshot(nextSnapshot)
    },
    [candidateClient, selectedCandidate],
  )

  const updateBooleanField = useCallback(
    (field: BooleanCandidateFieldKey, value: boolean) => {
      if (!selectedCandidate) {
        return
      }

      const nextSnapshot = candidateClient.updateCandidate(
        selectedCandidate.candidateId,
        { [field]: value } as Partial<MenuCandidateRecord>,
      )
      setSnapshot(nextSnapshot)
    },
    [candidateClient, selectedCandidate],
  )

  const toggleConfirmedField = useCallback(
    (field: CandidateFieldKey) => {
      if (!selectedCandidate) {
        return
      }

      const nextSnapshot = candidateClient.toggleConfirmedField(
        selectedCandidate.candidateId,
        field,
      )
      setSnapshot(nextSnapshot)
    },
    [candidateClient, selectedCandidate],
  )

  const confirmSelectedCandidate = useCallback(async () => {
    if (!selectedCandidate) {
      setMessage("请先选择一个候选。")
      return
    }
    if (selectedCandidate.confirmedFields.length === 0) {
      setMessage("请至少勾选一个已确认字段。")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await candidateClient.confirmCandidate(
        selectedCandidate.candidateId,
      )
      setSnapshot(result.snapshot)
      setSelectedCandidateId((current) => {
        const exists = result.snapshot.candidates.some(
          (candidate) => candidate.candidateId === current,
        )
        return exists ? current : result.snapshot.candidates[0]?.candidateId ?? ""
      })
      setMessage(`已确认候选「${result.createdItem.name}」并写入 M1 mock 菜单。`)
      await onRefresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "确认候选失败。")
    } finally {
      setIsSubmitting(false)
    }
  }, [candidateClient, onRefresh, selectedCandidate])

  const confirmedCount = useMemo(() => {
    return snapshot.candidates.filter((candidate) =>
      candidate.status === "confirmed",
    ).length
  }, [snapshot.candidates])

  const pendingCount = useMemo(() => {
    return snapshot.candidates.filter((candidate) =>
      candidate.status === "pending",
    ).length
  }, [snapshot.candidates])

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            RFC-0006 / T5 本地 mock 面板
          </p>
          <h2 className="text-xl font-semibold">M2 候选确认与 M3 输入预览</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            这里只走前端 mock client：模拟 M2 输出结构化候选，用户逐项确认字段后，
            通过 M1 mock client 写入菜单；M3 面板只预览 PlanningInputSnapshot。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            disabled={isSubmitting}
            onClick={loadPersistedSnapshot}
            type="button"
          >
            恢复
          </button>
          <button
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-zinc-700 dark:text-rose-300 dark:hover:bg-rose-950"
            disabled={isSubmitting}
            onClick={clearSnapshot}
            type="button"
          >
            清空
          </button>
        </div>
      </div>

      {message.length > 0 ? (
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <MockM2Panel
          confirmedCount={confirmedCount}
          pendingCount={pendingCount}
          rawText={rawText}
          selectedCandidate={selectedCandidate}
          snapshot={snapshot}
          source={source}
          onCandidateSelect={setSelectedCandidateId}
          onGenerate={generateCandidates}
          onRawTextChange={setRawText}
          onSourceChange={setSource}
        />

        <CandidateEditor
          confirmedCount={confirmedCount}
          isSubmitting={isSubmitting}
          pendingCount={pendingCount}
          selectedCandidate={selectedCandidate}
          onBooleanFieldChange={updateBooleanField}
          onConfirmedFieldToggle={toggleConfirmedField}
          onConfirm={confirmSelectedCandidate}
          onNumberFieldChange={updateNumberField}
          onTextFieldChange={updateTextField}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PlanningInputPreview snapshot={planningInputSnapshot} />
        <PlanPreview preview={planPreview} />
      </div>
    </section>
  )
}

type MockM2PanelProps = {
  confirmedCount: number
  pendingCount: number
  rawText: string
  selectedCandidate: MenuCandidateRecord | undefined
  snapshot: MockMenuCandidateSnapshot
  source: CandidateSource
  onCandidateSelect: (candidateId: string) => void
  onGenerate: () => void
  onRawTextChange: (value: string) => void
  onSourceChange: (value: CandidateSource) => void
}

function MockM2Panel({
  confirmedCount,
  pendingCount,
  rawText,
  selectedCandidate,
  snapshot,
  source,
  onCandidateSelect,
  onGenerate,
  onRawTextChange,
  onSourceChange,
}: MockM2PanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">Mock M2：文本 / OCR 候选生成</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              支持 text、ocr、mock 来源标记；生成结果只保存到 localStorage。
            </p>
          </div>
          <select
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => onSourceChange(parseCandidateSource(event.target.value))}
            value={source}
          >
            <option value="text">文本菜单</option>
            <option value="ocr">OCR 模拟</option>
            <option value="mock">固定 mock</option>
          </select>
        </div>
        <textarea
          className="min-h-44 w-full rounded-2xl border border-zinc-300 px-3 py-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
          onChange={(event) => onRawTextChange(event.target.value)}
          placeholder="每行一个候选：名称, 价格, 分类, 辣度, 食材, 过敏原"
          value={rawText}
        />
        <button
          className="mt-3 rounded-full bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800"
          onClick={onGenerate}
          type="button"
        >
          生成候选快照
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">候选菜单列表</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              已确认 {confirmedCount} 个，待确认 {pendingCount} 个。
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {snapshot.candidates.length}
          </span>
        </div>
        {snapshot.candidates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            暂无候选。请先点击“生成候选快照”。
          </p>
        ) : (
          <ul className="space-y-2">
            {snapshot.candidates.map((candidate) => (
              <li key={candidate.candidateId}>
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 ${selectedCandidate?.candidateId === candidate.candidateId ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950" : "border-zinc-200"}`}
                  onClick={() => onCandidateSelect(candidate.candidateId)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {candidate.name}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      ¥{candidate.price.toFixed(2)} · {candidate.category ?? "未分类"} · 已确认字段 {candidate.confirmedFields.length} 个
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${candidate.status === "confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {candidate.status === "confirmed" ? "已确认" : "待确认"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

type CandidateEditorProps = {
  confirmedCount: number
  isSubmitting: boolean
  pendingCount: number
  selectedCandidate: MenuCandidateRecord | undefined
  onBooleanFieldChange: (field: BooleanCandidateFieldKey, value: boolean) => void
  onConfirmedFieldToggle: (field: CandidateFieldKey) => void
  onConfirm: () => Promise<void>
  onNumberFieldChange: (field: NumberFieldKey, value: string) => void
  onTextFieldChange: (field: TextFieldKey, value: string) => void
}

function CandidateEditor({
  confirmedCount,
  isSubmitting,
  pendingCount,
  selectedCandidate,
  onBooleanFieldChange,
  onConfirmedFieldToggle,
  onConfirm,
  onNumberFieldChange,
  onTextFieldChange,
}: CandidateEditorProps) {
  if (!selectedCandidate) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        请先生成或选择一个候选。
      </div>
    )
  }

  const canConfirm = selectedCandidate.status === "pending" && selectedCandidate.confirmedFields.length > 0

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">候选字段逐项确认 / 编辑</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            勾选的字段会作为 confirmedFields 写入 M1 mock 菜单。
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            已确认 {confirmedCount}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            待确认 {pendingCount}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {editableCandidateFieldLabels.map((field) => (
          <CandidateFieldInput
            field={field}
            key={field.key}
            value={getCandidateEditableFieldValue(selectedCandidate, field)}
            onNumberChange={onNumberFieldChange}
            onTextChange={onTextFieldChange}
          />
        ))}
      </div>

      <fieldset className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-medium">过敏原 / 食材标记</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {booleanCandidateFieldLabels.map((field) => (
            <label className="flex items-center gap-2 text-sm" key={field.key}>
              <input
                checked={selectedCandidate[field.key]}
                onChange={(event) => onBooleanFieldChange(field.key, event.target.checked)}
                type="checkbox"
              />
              {field.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-medium">已确认字段</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {candidateFieldKeys.map((field) => (
            <label className="flex items-center gap-2 text-sm" key={field}>
              <input
                checked={selectedCandidate.confirmedFields.includes(field)}
                onChange={() => onConfirmedFieldToggle(field)}
                type="checkbox"
              />
              {formatFieldLabel(field)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !canConfirm}
          onClick={() => void onConfirm()}
          type="button"
        >
          确认并写入 M1 mock 菜单
        </button>
        {!canConfirm ? (
          <p className="self-center text-sm text-zinc-500 dark:text-zinc-400">
            待确认候选至少需要一个已确认字段。
          </p>
        ) : null}
      </div>
    </div>
  )
}

type CandidateFieldInputProps = {
  field: {
    key: CandidateFieldKey
    label: string
    type: "text" | "number"
  }
  value: string | number | undefined
  onNumberChange: (field: NumberFieldKey, value: string) => void
  onTextChange: (field: TextFieldKey, value: string) => void
}

function CandidateFieldInput({
  field,
  value,
  onNumberChange,
  onTextChange,
}: CandidateFieldInputProps) {
  const stringValue = value ?? ""

  return (
    <label className="text-sm font-medium">
      {field.label}
      <input
        className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        inputMode={field.type === "number" ? "decimal" : "text"}
        onChange={(event) => {
          if (field.type === "number") {
            onNumberChange(field.key as NumberFieldKey, event.target.value)
            return
          }
          onTextChange(field.key as TextFieldKey, event.target.value)
        }}
        type={field.type === "number" ? "number" : "text"}
        value={stringValue}
      />
    </label>
  )
}

type PlanningInputPreviewProps = {
  snapshot: PlanningInputSnapshot | null
}

function PlanningInputPreview({ snapshot }: PlanningInputPreviewProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">M3 PlanningInputSnapshot 预览</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            由 M1 snapshot + mock M2 候选快照拼接，不读取真实 Agent 输出。
          </p>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  )
}

type PlanPreviewProps = {
  preview: PlanResultPreview | null
}

function PlanPreview({ preview }: PlanPreviewProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-medium">Mock M3 PlanResultPreview</h3>
      {preview ? (
        <>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {preview.summary}
          </p>
          {preview.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-amber-700 dark:text-amber-300">
              {preview.warnings.map((warning) => (
                <li key={warning}>· {warning}</li>
              ))}
            </ul>
          ) : null}
          {preview.selectedItems.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {preview.selectedItems.map((item) => (
                <li className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800" key={item.candidateId}>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-zinc-500 dark:text-zinc-400">¥{item.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              暂无已确认候选。
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}

function getCandidateEditableFieldValue(
  candidate: MenuCandidateRecord,
  field: {
    key: CandidateFieldKey
    label: string
    type: "text" | "number"
  },
): string | number | undefined {
  if (field.key === "ingredients") {
    return (candidate.ingredients ?? []).join(",")
  }
  if (field.type === "number") {
    return String(candidate[field.key as NumberFieldKey])
  }
  // ingredients 已在上面提前返回，这里只剩纯字符串字段
  return candidate[field.key as Exclude<TextFieldKey, "ingredients">] ?? ""
}

function parseCandidateSource(value: string): CandidateSource {
  if (value === "ocr" || value === "text" || value === "mock") {
    return value
  }
  return "text"
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatFieldLabel(field: CandidateFieldKey): string {
  switch (field) {
    case "containsPork":
      return "猪肉"
    case "containsBeef":
      return "牛肉"
    case "containsChicken":
      return "鸡肉"
    case "containsSeafood":
      return "海鲜"
    case "containsPeanut":
      return "花生"
    case "containsEgg":
      return "鸡蛋"
    case "containsDairy":
      return "乳制品"
    case "isVegetarian":
      return "素食"
    case "name":
      return "菜品名称"
    case "price":
      return "价格"
    case "category":
      return "分类"
    case "spiciness":
      return "辣度"
    case "ingredients":
      return "食材"
    case "suggestedServings":
      return "建议份数"
    case "confidence":
      return "置信度"
  }
}
