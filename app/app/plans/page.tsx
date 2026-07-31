"use client";

import { useMemo, useState } from "react";
import { explainPlan } from "@/plan-explanation-agent/service/explain-plan";
import { generatePlan } from "@/plan-explanation-agent/service/generate-plan";
import { revisePlan } from "@/plan-explanation-agent/service/revise-plan";
import { planningSeed } from "@/plan-explanation-agent/fixtures/planning-seed";
import type { PlanChangeRequest, PlanResult } from "@/contracts/snapshots";

export default function PlansDemoPage() {
  const [strategy, setStrategy] = useState<"balanced" | "cheap" | "coverage">("balanced");
  const [revisionStrategy, setRevisionStrategy] = useState<"balanced" | "cheap" | "coverage">("cheap");
  const [revisionRemoval, setRevisionRemoval] = useState("dish_001");

  const snapshot = useMemo(
    () => ({
      ...planningSeed,
      strategy,
    }),
    [strategy],
  );

  const planResult = useMemo(() => generatePlan(snapshot), [snapshot]);
  const explanation = useMemo(() => (planResult.result.ok ? explainPlan(snapshot, planResult.result.plan) : null), [planResult, snapshot]);
  const revisionChanges = useMemo<PlanChangeRequest[]>(
    () => [
      {
        type: "remove_item",
        dishId: revisionRemoval,
      },
      {
        type: "change_strategy",
        strategy: revisionStrategy,
      },
    ],
    [revisionRemoval, revisionStrategy],
  );
  const revision = useMemo(() => {
    if (!planResult.result.ok) {
      return null;
    }

    return revisePlan({
      previousPlan: planResult.result.plan,
      currentContext: snapshot,
      requestedChanges: revisionChanges,
    });
  }, [planResult, revisionChanges, snapshot]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-zinc-500">M3 Demo / RFC-0002</p>
          <h1 className="text-3xl font-semibold">方案生成与解释 Agent 模块</h1>
          <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">只消费 PlanningInputSnapshot，生成可解释、可调整、不写订单/库存的点餐方案。</p>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
          <Panel title="输入快照">
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                策略
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" value={strategy} onChange={(event) => setStrategy(event.target.value as "balanced" | "cheap" | "coverage")}>
                  <option value="balanced">均衡</option>
                  <option value="cheap">省钱</option>
                  <option value="coverage">覆盖优先</option>
                </select>
              </label>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">预算：{planningSeed.session.budget} 元，成员：{planningSeed.session.memberCount} 人。</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">硬需求：A 不吃猪肉，B 花生过敏。</p>
            </div>
          </Panel>

          <Panel title="PlanResult">
            <ResultView result={planResult.result} />
          </Panel>
        </section>

        {explanation ? (
          <section className="grid gap-6 md:grid-cols-2">
            <Panel title="选择理由">
              <List items={explanation.selectedReasons.map((reason) => `${reason.dishName}：${reason.reasons.join("；")}`)} emptyText="暂无选择理由。" />
            </Panel>
            <Panel title="成员覆盖">
              <List items={explanation.memberRequirementStatus.map((status) => `${status.memberName ?? status.memberId}：${status.status} — ${status.details.join("；")}`)} emptyText="暂无成员状态。" />
            </Panel>
            <Panel title="未选菜品">
              <List items={explanation.excludedItems.map((item) => `${item.dishName}：${item.reasons.join("；")}`)} emptyText="暂无未选菜品说明。" />
            </Panel>
            <Panel title="预算">
              <p className="text-sm">已用 {explanation.budget.used} / {explanation.budget.budget} 元，使用 {explanation.budget.percent}%。</p>
            </Panel>
          </section>
        ) : null}

        <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
          <Panel title="调整请求">
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                移除菜品
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" value={revisionRemoval} onChange={(event) => setRevisionRemoval(event.target.value)}>
                  {planningSeed.menu.map((dish) => (
                    <option key={dish.id} value={dish.id}>
                      {dish.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">
                调整策略
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" value={revisionStrategy} onChange={(event) => setRevisionStrategy(event.target.value as "balanced" | "cheap" | "coverage")}>
                  <option value="balanced">均衡</option>
                  <option value="cheap">省钱</option>
                  <option value="coverage">覆盖优先</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel title="调整结果与 PlanDiff">
            <div className="space-y-4">
              <RevisionResultView result={revision} />
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function ResultView({ result }: Readonly<{ result: PlanResult }>) {
  if (!result.ok) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">方案生成失败。</p>
        <List items={result.conflicts.map((conflict) => conflict.message)} emptyText="暂无冲突。" />
        <List items={result.suggestions} emptyText="暂无建议。" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">方案 {result.plan.id}：{result.plan.items.length} 道菜，总价 {result.plan.totalPrice} 元。</p>
      <List
        items={result.plan.items.map((item) => `${item.dishName} × ${item.quantity}，${item.subtotal} 元，${item.sharedBy?.join("、") ?? "未分配成员"}`)}
        emptyText="暂无菜品。"
      />
    </div>
  );
}

function RevisionResultView({ result }: Readonly<{ result: ReturnType<typeof revisePlan> | null }>) {
  if (!result) {
    return <p className="text-sm text-zinc-500">当前没有可调整的成功方案。</p>;
  }

  if (!result.result.ok) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">调整失败。</p>
        <List items={result.result.conflicts.map((conflict) => conflict.message)} emptyText="暂无冲突。" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.diff.summary}</p>
      <List items={result.result.plan.items.map((item) => `${item.dishName}，${item.subtotal} 元，${item.sharedBy?.join("、") ?? "未分配成员"}`)} emptyText="暂无菜品。" />
      <List items={result.diff.addedItems.map((item) => `新增：${item.dishName}`)} emptyText="暂无新增菜品。" />
      <List items={result.diff.removedItems.map((item) => `移除：${item.dishName}`)} emptyText="暂无移除菜品。" />
    </div>
  );
}

function List({ items, emptyText }: Readonly<{ items: string[]; emptyText: string }>) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          {item}
        </li>
      ))}
    </ul>
  );
}
