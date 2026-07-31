import type { Plan, PlanDiff } from "@/contracts/snapshots";

export function diffPlans(before: Plan, after: Plan): PlanDiff {
  const beforeItems = new Map(before.items.map((item) => [item.dishId, item]));
  const afterItems = new Map(after.items.map((item) => [item.dishId, item]));
  const addedItems = after.items.filter((item) => !beforeItems.has(item.dishId));
  const removedItems = before.items.filter((item) => !afterItems.has(item.dishId));
  const changedItems = before.items
    .map((beforeItem) => {
      const afterItem = afterItems.get(beforeItem.dishId);
      if (!afterItem) {
        return null;
      }

      const beforeJson = JSON.stringify(beforeItem);
      const afterJson = JSON.stringify(afterItem);
      if (beforeJson === afterJson) {
        return null;
      }

      return {
        dishId: beforeItem.dishId,
        before: beforeItem,
        after: afterItem,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    addedItems,
    removedItems,
    changedItems,
    summary: buildDiffSummary(addedItems.length, removedItems.length, changedItems.length),
  };
}

function buildDiffSummary(addedCount: number, removedCount: number, changedCount: number): string {
  const parts: string[] = [];

  if (addedCount > 0) {
    parts.push(`新增 ${addedCount} 道菜`);
  }

  if (removedCount > 0) {
    parts.push(`移除 ${removedCount} 道菜`);
  }

  if (changedCount > 0) {
    parts.push(`调整 ${changedCount} 道菜`);
  }

  if (parts.length === 0) {
    return "方案未发生变化。";
  }

  return `${parts.join("，")}。`;
}
