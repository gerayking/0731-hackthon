"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createMockMenuSessionApiClient } from "@/src/menu-session/api"
import { CandidateConfirmationPanel } from "@/components/candidate-confirmation/CandidateConfirmationPanel"
import type {
  MealSessionInput,
  MemberInput,
  MenuItem,
  MenuItemInput,
  MenuSessionSnapshot,
} from "@/src/menu-session/domain"

type MenuSessionApiClient = ReturnType<typeof createMockMenuSessionApiClient>

type MenuItemDraft = {
  id?: string | undefined
  name: string
  price: string
  category: string
  spiciness: string
  ingredientsText: string
  containsPork: boolean
  containsBeef: boolean
  containsChicken: boolean
  containsSeafood: boolean
  containsPeanut: boolean
  containsEgg: boolean
  containsDairy: boolean
  isVegetarian: boolean
  suggestedServings: string
  confidence: string
}

type MemberDraft = {
  id?: string | undefined
  name: string
  needsTakeout: boolean
}

type MealSessionDraft = {
  budget: string
  memberCount: string
  members: MemberDraft[]
  promotionsText: string
}

type MealSessionInputWithMembers = MealSessionInput & {
  members: MemberInput[]
}

type BooleanMenuItemKey =
  | "containsPork"
  | "containsBeef"
  | "containsChicken"
  | "containsSeafood"
  | "containsPeanut"
  | "containsEgg"
  | "containsDairy"
  | "isVegetarian"

const emptyMenuItemDraft: MenuItemDraft = {
  name: "",
  price: "0",
  category: "",
  spiciness: "",
  ingredientsText: "",
  containsPork: false,
  containsBeef: false,
  containsChicken: false,
  containsSeafood: false,
  containsPeanut: false,
  containsEgg: false,
  containsDairy: false,
  isVegetarian: false,
  suggestedServings: "1",
  confidence: "0.5",
}

const emptyMealSessionDraft: MealSessionDraft = {
  budget: "250",
  memberCount: "4",
  members: [
    { id: "member-a", name: "A", needsTakeout: false },
    { id: "member-b", name: "B", needsTakeout: false },
    { id: "member-c", name: "C", needsTakeout: true },
    { id: "member-d", name: "D", needsTakeout: false },
  ],
  promotionsText: "满 200 减 20",
}

const allergyFields: Array<{ key: BooleanMenuItemKey; label: string }> = [
  { key: "containsPork", label: "猪肉" },
  { key: "containsBeef", label: "牛肉" },
  { key: "containsChicken", label: "鸡肉" },
  { key: "containsSeafood", label: "海鲜" },
  { key: "containsPeanut", label: "花生" },
  { key: "containsEgg", label: "鸡蛋" },
  { key: "containsDairy", label: "乳制品" },
]

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function parseNonNegativeNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toMenuItemDraft(item: MenuItem | undefined): MenuItemDraft {
  if (!item) {
    return { ...emptyMenuItemDraft }
  }

  return {
    id: item.id,
    name: item.name,
    price: String(item.price),
    category: item.category ?? "",
    spiciness: item.spiciness ?? "",
    ingredientsText: item.ingredients.join(","),
    containsPork: item.containsPork,
    containsBeef: item.containsBeef,
    containsChicken: item.containsChicken,
    containsSeafood: item.containsSeafood,
    containsPeanut: item.containsPeanut,
    containsEgg: item.containsEgg,
    containsDairy: item.containsDairy,
    isVegetarian: item.isVegetarian,
    suggestedServings: String(item.suggestedServings),
    confidence: String(item.confidence),
  }
}

function toMenuItemInput(draft: MenuItemDraft): MenuItemInput {
  return {
    id: draft.id,
    name: draft.name.trim(),
    price: parseNonNegativeNumber(draft.price, 0),
    category: draft.category.trim() || undefined,
    spiciness: draft.spiciness.trim() || undefined,
    ingredients: parseCsv(draft.ingredientsText),
    containsPork: draft.containsPork,
    containsBeef: draft.containsBeef,
    containsChicken: draft.containsChicken,
    containsSeafood: draft.containsSeafood,
    containsPeanut: draft.containsPeanut,
    containsEgg: draft.containsEgg,
    containsDairy: draft.containsDairy,
    isVegetarian: draft.isVegetarian,
    suggestedServings: parsePositiveInteger(draft.suggestedServings, 1),
    confidence: clampNumber(parseNonNegativeNumber(draft.confidence, 0.5), 0, 1),
    confirmedFields: ["name", "price", "ingredients", "category", "spiciness"],
  }
}

function toMealSessionInput(draft: MealSessionDraft): MealSessionInputWithMembers {
  const members: MemberInput[] = draft.members
    .map((member): MemberInput | null => {
      const name = member.name.trim()
      if (name.length === 0) {
        return null
      }

      return {
        id: member.id,
        name,
        needsTakeout: member.needsTakeout,
      }
    })
    .filter((member): member is MemberInput => member !== null)
  const memberCount = parsePositiveInteger(draft.memberCount, members.length)

  return {
    budget: parseNonNegativeNumber(draft.budget, 0),
    memberCount,
    members,
    promotions: parseCsv(draft.promotionsText),
  }
}

function formatPrice(value: number): string {
  return `¥${value.toFixed(2)}`
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join("、") : "无"
}

export function MenuSessionPage() {
  const [apiClient] = useState<MenuSessionApiClient>(() =>
    createMockMenuSessionApiClient(),
  )
  const [menuItemDraft, setMenuItemDraft] = useState<MenuItemDraft>(
    emptyMenuItemDraft,
  )
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [mealSessionDraft, setMealSessionDraft] = useState<MealSessionDraft>(
    emptyMealSessionDraft,
  )
  const [snapshot, setSnapshot] = useState<MenuSessionSnapshot | null>(null)
  const [message, setMessage] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalMenuPrice = useMemo(() => {
    return menuItems.reduce((total, item) => total + item.price, 0)
  }, [menuItems])

  const refreshAll = useCallback(async () => {
    const nextSnapshot = await apiClient.getSnapshot()
    setSnapshot(nextSnapshot)
    setMenuItems(nextSnapshot.menu)

    const session = await apiClient.getMealSession()
    if (session) {
      setMealSessionDraft({
        budget: String(session.budget),
        memberCount: String(session.memberCount),
        members: session.members.map((member) => ({
          id: member.id,
          name: member.name,
          needsTakeout: member.needsTakeout,
        })),
        promotionsText: formatList(session.promotions),
      })
    }
  }, [apiClient])

  // 初始加载时从外部状态同步 M1 snapshot 与组局表单。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll()
  }, [refreshAll])

  function updateMenuItemDraft<K extends keyof MenuItemDraft>(
    key: K,
    value: MenuItemDraft[K],
  ) {
    setMenuItemDraft((current) => ({ ...current, [key]: value }))
  }

  function updateAllergyField(key: BooleanMenuItemKey, value: boolean) {
    updateMenuItemDraft(key, value)
  }

  function startEditItem(item: MenuItem) {
    setMenuItemDraft(toMenuItemDraft(item))
    setMessage(`正在编辑：${item.name}`)
  }

  function cancelEditItem() {
    setMenuItemDraft(emptyMenuItemDraft)
    setMessage("已取消编辑。")
  }

  function clearMenuItemDraft() {
    setMenuItemDraft(emptyMenuItemDraft)
    setMessage("已清空菜单表单。")
  }

  async function submitMenuItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = toMenuItemInput(menuItemDraft)

    if (input.name.length === 0) {
      setMessage("菜品名称不能为空。")
      return
    }

    setIsSubmitting(true)
    try {
      const result = menuItemDraft.id
        ? await apiClient.updateMenuItem(menuItemDraft.id, input)
        : await apiClient.createMenuItem(input)

      if (!result) {
        setMessage("更新失败：未找到对应菜品。")
        return
      }

      setMenuItemDraft(emptyMenuItemDraft)
      setMessage(`已保存菜品：${result.name}`)
      await refreshAll()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存菜品失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteMenuItem(id: string) {
    setIsSubmitting(true)
    try {
      const deleted = await apiClient.deleteMenuItem(id)
      if (deleted) {
        setMessage("已删除菜品。")
        await refreshAll()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除菜品失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateMemberName(index: number, value: string) {
    setMealSessionDraft((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, name: value } : member,
      ),
    }))
  }

  function updateMemberTakeout(index: number, value: boolean) {
    setMealSessionDraft((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, needsTakeout: value } : member,
      ),
    }))
  }

  function removeMember(index: number) {
    setMealSessionDraft((current) => ({
      ...current,
      members: current.members.filter((_, memberIndex) => memberIndex !== index),
    }))
  }

  function addMember() {
    const nextId = `member-${crypto.randomUUID()}`
    setMealSessionDraft((current) => ({
      ...current,
      members: [...current.members, { id: nextId, name: "", needsTakeout: false }],
    }))
  }

  async function submitMealSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = toMealSessionInput(mealSessionDraft)
    const members = input.members ?? []

    if (members.length === 0) {
      setMessage("至少需要一名成员。")
      return
    }

    if (members.length !== input.memberCount) {
      setMessage(
        `成员数量需与人数一致：当前 ${members.length} 人，表单人数 ${input.memberCount} 人。`,
      )
      return
    }

    setIsSubmitting(true)
    try {
      const result = await apiClient.createMealSession(input)
      setMealSessionDraft({
        budget: String(result.budget),
        memberCount: String(result.memberCount),
        members: result.members.map((member) => ({
          id: member.id,
          name: member.name,
          needsTakeout: member.needsTakeout,
        })),
        promotionsText: formatList(result.promotions),
      })
      setMessage("组局已保存。")
      await refreshAll()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存组局失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resetMealSession() {
    setIsSubmitting(true)
    try {
      const deleted = await apiClient.deleteMealSession("default")
      if (deleted) {
        setMealSessionDraft(emptyMealSessionDraft)
        setMessage("已重置组局。")
        await refreshAll()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重置组局失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            RFC-0006 / T4 并行实现
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            M1 菜单与组局 Demo UI
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-300">
            当前页面可独立运行：先用本地 mock client 保证 UI 验收；T3 Route
            Handlers 完成后，只需替换 client 即可接真实 SQLite 后端。
          </p>
          {message.length > 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {message}
            </div>
          ) : null}
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <MenuForm
              draft={menuItemDraft}
              isSubmitting={isSubmitting}
              onChange={updateMenuItemDraft}
              onAllergyChange={updateAllergyField}
              onCancel={cancelEditItem}
              onClear={clearMenuItemDraft}
              onSubmit={submitMenuItem}
            />

            <MenuList
              items={menuItems}
              isSubmitting={isSubmitting}
              onEdit={startEditItem}
              onDelete={deleteMenuItem}
            />

            <MealSessionForm
              draft={mealSessionDraft}
              isSubmitting={isSubmitting}
              onMemberNameChange={updateMemberName}
              onMemberTakeoutChange={updateMemberTakeout}
              onMemberRemove={removeMember}
              onMemberAdd={addMember}
              onBudgetChange={(value) =>
                setMealSessionDraft((current) => ({ ...current, budget: value }))
              }
              onMemberCountChange={(value) =>
                setMealSessionDraft((current) => ({
                  ...current,
                  memberCount: value,
                }))
              }
              onPromotionsTextChange={(value) =>
                setMealSessionDraft((current) => ({
                  ...current,
                  promotionsText: value,
                }))
              }
              onReset={resetMealSession}
              onSubmit={submitMealSession}
            />
          </section>

          <aside className="space-y-6">
            <SnapshotPanel
              snapshot={snapshot}
              totalMenuPrice={totalMenuPrice}
              onRefresh={refreshAll}
            />
          </aside>
        </main>

        <CandidateConfirmationPanel
          menuSessionSnapshot={snapshot}
          onRefresh={refreshAll}
        />
      </div>
    </div>
  )
}

type MenuFormProps = {
  draft: MenuItemDraft
  isSubmitting: boolean
  onChange: <K extends keyof MenuItemDraft>(
    key: K,
    value: MenuItemDraft[K],
  ) => void
  onAllergyChange: (key: BooleanMenuItemKey, value: boolean) => void
  onCancel: () => void
  onClear: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function MenuForm({
  draft,
  isSubmitting,
  onChange,
  onAllergyChange,
  onCancel,
  onClear,
  onSubmit,
}: MenuFormProps) {
  return (
    <form
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">菜单 CRUD</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            创建、编辑、删除菜单项；字段会进入 M3 snapshot。
          </p>
        </div>
        {draft.id ? (
          <button
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            取消编辑
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          菜品名称
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="例如：番茄牛腩饭"
            value={draft.name}
          />
        </label>
        <label className="text-sm font-medium">
          价格
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            inputMode="decimal"
            onChange={(event) => onChange("price", event.target.value)}
            type="number"
            value={draft.price}
          />
        </label>
        <label className="text-sm font-medium">
          分类
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="主食 / 热菜 / 素菜"
            value={draft.category}
          />
        </label>
        <label className="text-sm font-medium">
          辣度
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => onChange("spiciness", event.target.value)}
            placeholder="不辣 / 微辣 / 中辣"
            value={draft.spiciness}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          食材，逗号分隔
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) =>
              onChange("ingredientsText", event.target.value)
            }
            placeholder="番茄、牛腩、米饭"
            value={draft.ingredientsText}
          />
        </label>
        <label className="text-sm font-medium">
          建议份数
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            inputMode="numeric"
            onChange={(event) =>
              onChange("suggestedServings", event.target.value)
            }
            type="number"
            value={draft.suggestedServings}
          />
        </label>
        <label className="text-sm font-medium">
          置信度，0-1
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            inputMode="decimal"
            max="1"
            min="0"
            onChange={(event) => onChange("confidence", event.target.value)}
            step="0.05"
            type="number"
            value={draft.confidence}
          />
        </label>
      </div>

      <fieldset className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-medium">过敏原 / 食材标记</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {allergyFields.map((field) => (
            <label className="flex items-center gap-2 text-sm" key={field.key}>
              <input
                checked={draft[field.key]}
                onChange={(event) =>
                  onAllergyChange(field.key, event.target.checked)
                }
                type="checkbox"
              />
              {field.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {draft.id ? "保存修改" : "添加菜品"}
        </button>
        <button
          className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={isSubmitting}
          onClick={onClear}
          type="button"
        >
          清空表单
        </button>
      </div>
    </form>
  )
}

type MenuListProps = {
  items: MenuItem[]
  isSubmitting: boolean
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => Promise<void>
}

function MenuList({ items, isSubmitting, onEdit, onDelete }: MenuListProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">当前菜单</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            共 {items.length} 个菜品，总价 {formatPrice(totalPrice(items))}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          暂无菜单项，请先添加菜品。
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {formatPrice(item.price)} · {item.category ?? "未分类"} ·{" "}
                    {item.spiciness ?? "未标注辣度"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    食材：{formatList(item.ingredients)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-full border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    disabled={isSubmitting}
                    onClick={() => onEdit(item)}
                    type="button"
                  >
                    编辑
                  </button>
                  <button
                    className="rounded-full border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                    disabled={isSubmitting}
                    onClick={() => void onDelete(item.id)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type MealSessionFormProps = {
  draft: MealSessionDraft
  isSubmitting: boolean
  onMemberNameChange: (index: number, value: string) => void
  onMemberTakeoutChange: (index: number, value: boolean) => void
  onMemberRemove: (index: number) => void
  onMemberAdd: () => void
  onBudgetChange: (value: string) => void
  onMemberCountChange: (value: string) => void
  onPromotionsTextChange: (value: string) => void
  onReset: () => Promise<void>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function MealSessionForm({
  draft,
  isSubmitting,
  onMemberNameChange,
  onMemberTakeoutChange,
  onMemberRemove,
  onMemberAdd,
  onBudgetChange,
  onMemberCountChange,
  onPromotionsTextChange,
  onReset,
  onSubmit,
}: MealSessionFormProps) {
  return (
    <form
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">组局 CRUD</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            保存预算、人数、成员与打包偏好；刷新后由 mock 状态保留。
          </p>
        </div>
        <button
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={isSubmitting}
          onClick={() => void onReset()}
          type="button"
        >
          重置
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          预算
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            inputMode="decimal"
            onChange={(event) => onBudgetChange(event.target.value)}
            type="number"
            value={draft.budget}
          />
        </label>
        <label className="text-sm font-medium">
          人数
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            inputMode="numeric"
            onChange={(event) => onMemberCountChange(event.target.value)}
            type="number"
            value={draft.memberCount}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          优惠/规则，逗号分隔
          <input
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => onPromotionsTextChange(event.target.value)}
            placeholder="满 200 减 20, 学生优惠"
            value={draft.promotionsText}
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="font-medium">成员列表</h3>
          <button
            className="rounded-full border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            disabled={isSubmitting}
            onClick={onMemberAdd}
            type="button"
          >
            添加成员
          </button>
        </div>

        <ul className="space-y-3">
          {draft.members.map((member, index) => (
            <li
              className="grid gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_auto_auto]"
              key={member.id ?? index}
            >
              <input
                aria-label={`成员 ${index + 1} 姓名`}
                className="rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                onChange={(event) => onMemberNameChange(index, event.target.value)}
                placeholder={`成员 ${index + 1}`}
                value={member.name}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={member.needsTakeout}
                  onChange={(event) =>
                    onMemberTakeoutChange(index, event.target.checked)
                  }
                  type="checkbox"
                />
                打包
              </label>
              <button
                className="rounded-full border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                disabled={isSubmitting}
                onClick={() => onMemberRemove(index)}
                type="button"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        className="mt-6 w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        保存组局
      </button>
    </form>
  )
}

type SnapshotPanelProps = {
  snapshot: MenuSessionSnapshot | null
  totalMenuPrice: number
  onRefresh: () => Promise<void>
}

function SnapshotPanel({ snapshot, totalMenuPrice, onRefresh }: SnapshotPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">M3 Snapshot 预览</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            菜单与组局合并输出，供后续 M3 mock 展示。
          </p>
        </div>
        <button
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          onClick={() => void onRefresh()}
          type="button"
        >
          刷新
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="菜单项" value={String(snapshot?.menu.length ?? 0)} />
        <MetricCard label="菜单总价" value={formatPrice(totalMenuPrice)} />
        <MetricCard label="预算" value={formatPrice(snapshot?.session.budget ?? 0)} />
        <MetricCard
          label="人数"
          value={String(snapshot?.session.memberCount ?? 0)}
        />
      </div>

      <div className="mt-5 rounded-2xl bg-zinc-950 p-4 text-xs text-zinc-100">
        <pre className="max-h-96 overflow-auto">
          {JSON.stringify(
            snapshot ?? {
              menu: [],
              session: {
                id: "default",
                budget: 0,
                memberCount: 0,
                members: [],
                promotions: [],
              },
            },
            null,
            2,
          )}
        </pre>
      </div>
    </section>
  )
}

type MetricCardProps = {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function totalPrice(items: MenuItem[]): number {
  return items.reduce((total, item) => total + item.price, 0)
}
