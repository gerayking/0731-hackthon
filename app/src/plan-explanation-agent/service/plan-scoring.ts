import { getMemberName } from "@/plan-explanation-agent/domain/planning-context";
import type { PlanningContext } from "@/plan-explanation-agent/domain/planning-context";
import type { Conflict, MealSession, Member, MenuItem, PlanItem, Requirement, Spiciness, Strategy } from "@/contracts/snapshots";

export const spicinessRank: Record<Spiciness, number> = {
  none: 0,
  mild: 1,
  medium: 2,
  hot: 3,
  any: 4,
};

export type DishEligibility = {
  eligible: boolean;
  reasons: string[];
};

export type MemberEligibleDish = {
  member: Member;
  dish: MenuItem;
  reasons: string[];
  score: number;
};

export type DishMemberEligibility = {
  dish: MenuItem;
  eligibleMembers: Member[];
  ineligibleMembers: Array<{ member: Member; reasons: string[] }>;
};

export type GeneratePlanOptions = {
  blockedDishIds?: string[];
  forcedDishIds?: string[];
};

export function getSpicinessRank(value: Spiciness | undefined): number {
  return value === undefined ? 0 : spicinessRank[value];
}

export function buildMembers(session: MealSession): Member[] {
  if (session.members && session.members.length > 0) {
    return session.members;
  }

  return Array.from({ length: session.memberCount }, (_, index) => ({
    id: `member_${index + 1}`,
    name: `成员 ${index + 1}`,
  }));
}

export function getActiveRequirements(requirements: Requirement[] | undefined): Requirement[] {
  return requirements?.filter((requirement) => requirement.status === "active") ?? [];
}

export function dishContainsValue(dish: MenuItem, value: string): boolean {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return false;
  }

  const normalizedIngredients = dish.ingredients?.map((ingredient) => ingredient.trim()) ?? [];
  if (normalizedIngredients.some((ingredient) => ingredient === normalizedValue || ingredient.includes(normalizedValue) || normalizedValue.includes(ingredient))) {
    return true;
  }

  if (normalizedValue.includes("猪肉")) {
    return dish.containsPork === true;
  }

  if (normalizedValue.includes("牛肉")) {
    return dish.containsBeef === true;
  }

  if (normalizedValue.includes("鸡肉")) {
    return dish.containsChicken === true;
  }

  if (normalizedValue.includes("海鲜") || normalizedValue.includes("虾")) {
    return dish.containsSeafood === true;
  }

  if (normalizedValue.includes("花生")) {
    return dish.containsPeanut === true;
  }

  if (normalizedValue.includes("鸡蛋") || normalizedValue === "蛋") {
    return dish.containsEgg === true;
  }

  if (normalizedValue.includes("奶") || normalizedValue.includes("乳")) {
    return dish.containsDairy === true;
  }

  if (normalizedValue.includes("素食")) {
    return dish.isVegetarian === true;
  }

  return false;
}

export function isDishEligibleForMember(dish: MenuItem, member: Member, requirements: Requirement[]): DishEligibility {
  const reasons: string[] = [];
  const memberName = member.name;

  for (const requirement of requirements) {
    if (requirement.status !== "active") {
      continue;
    }

    if (requirement.hardness !== "hard") {
      continue;
    }

    switch (requirement.type) {
      case "exclude_ingredient":
        if (dishContainsValue(dish, requirement.value)) {
          reasons.push(`${memberName} 硬需求「${requirement.sourceText}」排除含 ${requirement.value} 的菜`);
        }
        break;
      case "exclude_category":
        if (dish.category === requirement.value) {
          reasons.push(`${memberName} 硬需求「${requirement.sourceText}」排除 ${requirement.value}`);
        }
        break;
      case "spiciness_upper_bound": {
        const upperBound = getSpicinessRank(requirement.value as Spiciness | undefined);
        if (getSpicinessRank(dish.spiciness) > upperBound) {
          reasons.push(`${memberName} 硬需求「${requirement.sourceText}」排除超过 ${requirement.value} 辣度的菜`);
        }
        break;
      }
      case "vegetarian":
        if (dish.isVegetarian !== true) {
          reasons.push(`${memberName} 硬需求「${requirement.sourceText}」要求素食`);
        }
        break;
      case "prefer_spicy":
      case "prefer_cheap":
      case "other":
        break;
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function getEligibleDishesForMember(context: PlanningContext, member: Member): Array<{ dish: MenuItem; reasons: string[] }> {
  const requirements = context.activeRequirementsByMember[member.id] ?? [];

  return context.menu
    .map((dish: MenuItem) => {
      const eligibility = isDishEligibleForMember(dish, member, requirements);
      return {
        dish,
        eligible: eligibility.eligible,
        reasons: eligibility.reasons,
      };
    })
    .filter((candidate) => candidate.eligible)
    .map(({ dish, reasons }) => ({ dish, reasons }));
}

export function getEligibleDishMap(context: PlanningContext): Map<string, MemberEligibleDish[]> {
  const members = buildMembers(context.session);
  const eligibleByMember = new Map<string, MemberEligibleDish[]>();

  for (const member of members) {
    const eligibleDishes = getEligibleDishesForMember(context, member);
    const scoredDishes = eligibleDishes.map(({ dish, reasons }) => ({
      member,
      dish,
      reasons,
      score: scoreDishForMember(context, member, dish, eligibleDishes.map((candidate) => candidate.dish)),
    }));

    scoredDishes.sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.dish.price - right.dish.price;
    });

    eligibleByMember.set(member.id, scoredDishes);
  }

  return eligibleByMember;
}

export function scoreDishForMember(context: PlanningContext, member: Member, dish: MenuItem, eligibleDishes: MenuItem[]): number {
  const requirements = getActiveRequirements(context.activeRequirementsByMember[member.id]);
  const prices = context.menu.map((item) => item.price);
  const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  let score = 100;

  if (context.strategy === "cheap") {
    score -= dish.price;
  } else if (context.strategy === "coverage") {
    score += eligibleDishes.length * 2;
  } else {
    score -= Math.abs(dish.price - averagePrice) * 0.08;
  }

  for (const requirement of requirements) {
    if (requirement.hardness !== "soft") {
      continue;
    }

    switch (requirement.type) {
      case "spiciness_upper_bound": {
        const upperBound = getSpicinessRank(requirement.value as Spiciness | undefined);
        const dishRank = getSpicinessRank(dish.spiciness);
        if (dishRank > upperBound) {
          score -= (dishRank - upperBound) * 18;
        }
        break;
      }
      case "prefer_spicy":
        score += getSpicinessRank(dish.spiciness) * 8;
        break;
      case "prefer_cheap":
        score -= dish.price * 0.25;
        break;
      case "vegetarian":
        if (dish.isVegetarian === true) {
          score += 12;
        }
        break;
      case "exclude_ingredient":
      case "exclude_category":
      case "other":
        break;
    }
  }

  score += (dish.confidence ?? 0.5) * 8;

  if (dish.isVegetarian === true) {
    score += 3;
  }

  return Number(score.toFixed(2));
}

export function getDishMemberEligibility(context: PlanningContext): DishMemberEligibility[] {
  const members = buildMembers(context.session);

  return context.menu.map((dish) => {
    const eligibleMembers: Member[] = [];
    const ineligibleMembers: Array<{ member: Member; reasons: string[] }> = [];

    for (const member of members) {
      const eligibility = isDishEligibleForMember(dish, member, getActiveRequirements(context.activeRequirementsByMember[member.id]));
      if (eligibility.eligible) {
        eligibleMembers.push(member);
      } else {
        ineligibleMembers.push({ member, reasons: eligibility.reasons });
      }
    }

    return {
      dish,
      eligibleMembers,
      ineligibleMembers,
    };
  });
}

export function createPlanItem(dish: MenuItem, quantity: number, sharedBy: string[]): PlanItem {
  return {
    dishId: dish.id,
    dishName: dish.name,
    quantity,
    unitPrice: dish.price,
    subtotal: dish.price * quantity,
    sharedBy,
  };
}

export function createConflict(code: string, message: string, dishId?: string, memberId?: string): Conflict {
  return {
    code,
    message,
    ...(dishId === undefined ? {} : { dishId }),
    ...(memberId === undefined ? {} : { memberId }),
  };
}

export function getPlanTotalPrice(items: PlanItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

export function getMemberLabel(context: PlanningContext, memberId: string): string {
  return getMemberName(context, memberId) ?? memberId;
}

export function getStrategyLabel(strategy: Strategy): string {
  switch (strategy) {
    case "balanced":
      return "均衡";
    case "cheap":
      return "省钱";
    case "coverage":
      return "覆盖优先";
  }
}
