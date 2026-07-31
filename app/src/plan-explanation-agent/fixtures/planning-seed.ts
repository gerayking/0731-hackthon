import type { MealSession, Member, MenuItem, PlanningInputSnapshot, Requirement } from "@/src/contracts/snapshots";

export const planningSeed: PlanningInputSnapshot = {
  menu: [
    {
      id: "dish_001",
      name: "宫保鸡丁饭",
      price: 48,
      category: "主食",
      spiciness: "mild",
      ingredients: ["鸡肉", "花生", "米饭"],
      containsPork: false,
      containsBeef: false,
      containsChicken: true,
      containsSeafood: false,
      containsPeanut: true,
      containsEgg: false,
      containsDairy: false,
      isVegetarian: false,
      suggestedServings: 1,
      confidence: 0.92,
      confirmedFields: ["name", "price", "ingredients"],
    },
    {
      id: "dish_002",
      name: "鱼香肉丝饭",
      price: 42,
      category: "主食",
      spiciness: "mild",
      ingredients: ["猪肉", "木耳", "米饭"],
      containsPork: true,
      containsBeef: false,
      containsChicken: false,
      containsSeafood: false,
      containsPeanut: false,
      containsEgg: false,
      containsDairy: false,
      isVegetarian: false,
      suggestedServings: 1,
      confidence: 0.9,
      confirmedFields: ["name", "price", "ingredients"],
    },
    {
      id: "dish_003",
      name: "番茄炒蛋饭",
      price: 36,
      category: "主食",
      spiciness: "none",
      ingredients: ["鸡蛋", "番茄", "米饭"],
      containsPork: false,
      containsBeef: false,
      containsChicken: false,
      containsSeafood: false,
      containsPeanut: false,
      containsEgg: true,
      containsDairy: false,
      isVegetarian: false,
      suggestedServings: 1,
      confidence: 0.95,
      confirmedFields: ["name", "price", "ingredients"],
    },
    {
      id: "dish_004",
      name: "麻婆豆腐饭",
      price: 38,
      category: "主食",
      spiciness: "medium",
      ingredients: ["豆腐", "牛肉末", "米饭"],
      containsPork: false,
      containsBeef: true,
      containsChicken: false,
      containsSeafood: false,
      containsPeanut: false,
      containsEgg: false,
      containsDairy: false,
      isVegetarian: false,
      suggestedServings: 1,
      confidence: 0.88,
      confirmedFields: ["name", "price", "ingredients"],
    },
    {
      id: "dish_005",
      name: "清炒时蔬饭",
      price: 32,
      category: "主食",
      spiciness: "none",
      ingredients: ["青菜", "米饭"],
      containsPork: false,
      containsBeef: false,
      containsChicken: false,
      containsSeafood: false,
      containsPeanut: false,
      containsEgg: false,
      containsDairy: false,
      isVegetarian: true,
      suggestedServings: 1,
      confidence: 0.94,
      confirmedFields: ["name", "price", "ingredients"],
    },
    {
      id: "dish_006",
      name: "宫保虾仁饭",
      price: 58,
      category: "主食",
      spiciness: "mild",
      ingredients: ["虾仁", "花生", "米饭"],
      containsPork: false,
      containsBeef: false,
      containsChicken: false,
      containsSeafood: true,
      containsPeanut: true,
      containsEgg: false,
      containsDairy: false,
      isVegetarian: false,
      suggestedServings: 1,
      confidence: 0.86,
      confirmedFields: ["name", "price", "ingredients"],
    },
  ],
  session: {
    id: "session_demo",
    budget: 250,
    memberCount: 4,
    members: [
      { id: "member_a", name: "A", needsTakeout: false },
      { id: "member_b", name: "B", needsTakeout: false },
      { id: "member_c", name: "C", needsTakeout: false },
      { id: "member_d", name: "D", needsTakeout: true },
    ],
    promotions: [],
  },
  requirementsByMember: {
    member_a: [
      {
        id: "req_001",
        memberId: "member_a",
        type: "exclude_ingredient",
        value: "猪肉",
        hardness: "hard",
        sourceText: "A 不吃猪肉",
        status: "active",
      },
    ],
    member_b: [
      {
        id: "req_002",
        memberId: "member_b",
        type: "exclude_ingredient",
        value: "花生",
        hardness: "hard",
        sourceText: "B 花生过敏",
        status: "active",
      },
    ],
    member_c: [
      {
        id: "req_003",
        memberId: "member_c",
        type: "spiciness_upper_bound",
        value: "mild",
        hardness: "soft",
        sourceText: "C 想吃辣一点，但不要中辣以上",
        status: "active",
      },
    ],
    member_d: [],
  },
  strategy: "balanced",
};

export function createPlanningSeed(overrides?: {
  budget?: number;
  strategy?: PlanningInputSnapshot["strategy"];
  requirementsByMember?: PlanningInputSnapshot["requirementsByMember"];
}): PlanningInputSnapshot {
  return {
    ...planningSeed,
    session: {
      ...planningSeed.session,
      budget: overrides?.budget ?? planningSeed.session.budget,
    },
    requirementsByMember: overrides?.requirementsByMember ?? planningSeed.requirementsByMember,
    strategy: overrides?.strategy ?? planningSeed.strategy,
  };
}

export function createMenuSeed(overrides?: {
  budget?: number;
  members?: Member[];
}): {
  menu: MenuItem[];
  session: MealSession;
  requirementsByMember: Record<string, Requirement[]>;
} {
  return {
    menu: planningSeed.menu,
    session: {
      ...planningSeed.session,
      budget: overrides?.budget ?? planningSeed.session.budget,
      members: overrides?.members ?? planningSeed.session.members,
    },
    requirementsByMember: planningSeed.requirementsByMember,
  };
}
