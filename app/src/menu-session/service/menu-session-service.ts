/**
 * M1 领域服务实现
 * RFC-0006: M1 菜单与组局模块实现
 *
 * 服务层负责菜单、组局、候选确认与 snapshot 的业务编排。
 */
import {
  confirmMenuCandidateInputSchema,
  confirmMenuCandidatesBatchSchema,
  mealSessionInputSchema,
  mealSessionUpdateSchema,
  menuItemInputSchema,
  menuItemUpdateSchema,
} from "../schemas"
import type {
  ConfirmMenuCandidateInput,
  MealSession,
  MenuItem,
  MenuSessionSnapshot,
} from "../domain"
import type {
  MealSessionInputParsed,
  MealSessionUpdateParsed,
} from "../schemas"
import type { MenuItemInputParsed, MenuItemUpdateParsed } from "../schemas"
import type { MenuRepository, SessionRepository } from "./repository"

/** 菜单服务 */
export class MenuSessionService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createMenuItem(input: MenuItemInputParsed): Promise<MenuItem> {
    const parsed = menuItemInputSchema.parse(input)
    return this.menuRepository.create(parsed)
  }

  async updateMenuItem(
    id: string,
    input: MenuItemUpdateParsed,
  ): Promise<MenuItem | null> {
    const parsed = menuItemUpdateSchema.parse(input)
    return this.menuRepository.update(id, parsed)
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return this.menuRepository.delete(id)
  }

  async listMenuItems(): Promise<MenuItem[]> {
    return this.menuRepository.list()
  }

  async getMenuItem(id: string): Promise<MenuItem | null> {
    return this.menuRepository.getById(id)
  }

  async createMealSession(input: MealSessionInputParsed): Promise<MealSession> {
    const parsed = mealSessionInputSchema.parse(input)
    return this.sessionRepository.create(parsed)
  }

  async updateMealSession(
    id: string,
    input: MealSessionUpdateParsed,
  ): Promise<MealSession | null> {
    const parsed = mealSessionUpdateSchema.parse(input)
    return this.sessionRepository.update(id, parsed)
  }

  async getMealSession(id?: string): Promise<MealSession | null> {
    return this.sessionRepository.get(id)
  }

  async deleteMealSession(id: string): Promise<boolean> {
    return this.sessionRepository.delete(id)
  }

  async confirmMenuCandidate(
    input: ConfirmMenuCandidateInput,
  ): Promise<MenuItem> {
    const parsed = confirmMenuCandidateInputSchema.parse(input)
    const candidate = {
      ...parsed.candidate,
      id: undefined,
      confirmedFields: parsed.confirmedFields,
    }

    return this.menuRepository.create(candidate)
  }

  async confirmMenuCandidates(
    inputs: ConfirmMenuCandidateInput[],
  ): Promise<MenuItem[]> {
    const parsed = confirmMenuCandidatesBatchSchema.parse({ items: inputs })
    const createdItems: MenuItem[] = []

    for (const item of parsed.items) {
      createdItems.push(await this.confirmMenuCandidate(item))
    }

    return createdItems
  }

  async getMenuSessionSnapshot(): Promise<MenuSessionSnapshot> {
    const [menu, session] = await Promise.all([
      this.menuRepository.list(),
      this.sessionRepository.get(),
    ])

    return {
      menu,
      session: session ?? {
        id: "default",
        budget: 0,
        memberCount: 0,
        members: [],
        promotions: [],
      },
    }
  }
}

export {
  type ConfirmMenuCandidateInput,
  type MealSession,
  type MenuSessionSnapshot,
}
