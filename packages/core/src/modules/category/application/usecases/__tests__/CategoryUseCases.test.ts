/**
 * Tests unitarios de los UseCases del módulo Category.
 * Usan InMemoryCategoryRepository y un EventBus real para verificar
 * comportamiento sin base de datos.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@shared/event-bus/EventBus.ts";
import { CreateCategory } from "../CreateCategory.ts";
import { UpdateCategory } from "../UpdateCategory.ts";
import { DeleteCategory } from "../DeleteCategory.ts";
import { ListCategories } from "../ListCategories.ts";
import { InMemoryCategoryRepository } from "./fakes.ts";

describe("CreateCategory", () => {
  let repo: InMemoryCategoryRepository;
  let eventBus: EventBus;
  let createCategory: CreateCategory;

  beforeEach(() => {
    repo = new InMemoryCategoryRepository();
    eventBus = new EventBus();
    createCategory = new CreateCategory(repo, eventBus);
  });

  it("creates a category with name and default values", async () => {
    const dto = await createCategory.execute({ name: "Frontend" });

    expect(dto.name).toBe("Frontend");
    expect(dto.parentId).toBeNull();
    expect(dto.color).toBeNull();
    expect(dto.icon).toBeNull();
    expect(dto.sortOrder).toBe(0);
    expect(dto.id).toBeDefined();
    expect(dto.createdAt).toBeDefined();
  });

  it("creates a category with all optional fields", async () => {
    const dto = await createCategory.execute({
      name: "Backend",
      color: "#FF0000",
      icon: "server",
      sortOrder: 5,
    });

    expect(dto.color).toBe("#FF0000");
    expect(dto.icon).toBe("server");
    expect(dto.sortOrder).toBe(5);
  });

  it("creates a child category with a parent", async () => {
    const parent = await createCategory.execute({ name: "Desarrollo" });
    const child = await createCategory.execute({
      name: "Frontend",
      parentId: parent.id,
    });

    expect(child.parentId).toBe(parent.id);
  });

  it("throws when name is empty", async () => {
    await expect(createCategory.execute({ name: "   " })).rejects.toThrow(
      "[Category] El nombre no puede estar vacío."
    );
  });

  it("persists the category in the repository", async () => {
    await createCategory.execute({ name: "Testing" });
    expect(repo.getAll()).toHaveLength(1);
  });

  it("emits category.created event", async () => {
    const events: string[] = [];
    eventBus.on("category.created", () => { events.push("category.created"); });

    await createCategory.execute({ name: "DevOps" });

    // Dar tiempo al emitAsync
    await new Promise((r) => setTimeout(r, 0));
    expect(events).toContain("category.created");
  });
});

describe("UpdateCategory", () => {
  let repo: InMemoryCategoryRepository;
  let eventBus: EventBus;
  let createCategory: CreateCategory;
  let updateCategory: UpdateCategory;

  beforeEach(() => {
    repo = new InMemoryCategoryRepository();
    eventBus = new EventBus();
    createCategory = new CreateCategory(repo, eventBus);
    updateCategory = new UpdateCategory(repo, eventBus);
  });

  it("updates category name", async () => {
    const created = await createCategory.execute({ name: "Old Name" });
    const updated = await updateCategory.execute({
      id: created.id,
      name: "New Name",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.id).toBe(created.id);
  });

  it("updates color and icon", async () => {
    const created = await createCategory.execute({ name: "Test" });
    const updated = await updateCategory.execute({
      id: created.id,
      color: "#00FF00",
      icon: "tag",
    });

    expect(updated.color).toBe("#00FF00");
    expect(updated.icon).toBe("tag");
  });

  it("throws when category does not exist", async () => {
    await expect(
      updateCategory.execute({ id: "nonexistent-id", name: "X" })
    ).rejects.toThrow("[UpdateCategory] Categoría no encontrada");
  });

  it("throws when updated name is empty", async () => {
    const created = await createCategory.execute({ name: "Valid" });
    await expect(
      updateCategory.execute({ id: created.id, name: "  " })
    ).rejects.toThrow("[Category] El nombre no puede estar vacío.");
  });
});

describe("DeleteCategory", () => {
  let repo: InMemoryCategoryRepository;
  let eventBus: EventBus;
  let createCategory: CreateCategory;
  let deleteCategory: DeleteCategory;

  beforeEach(() => {
    repo = new InMemoryCategoryRepository();
    eventBus = new EventBus();
    createCategory = new CreateCategory(repo, eventBus);
    deleteCategory = new DeleteCategory(repo, eventBus);
  });

  it("deletes category with unassign strategy", async () => {
    const cat = await createCategory.execute({ name: "To Delete" });
    await deleteCategory.execute({ id: cat.id, strategy: "unassign" });

    expect(repo.getAll()).toHaveLength(0);
  });

  it("unassigns tasks when strategy is unassign", async () => {
    const cat = await createCategory.execute({ name: "Cat" });
    repo.assignCategoryToTask("task-1", cat.id);

    await deleteCategory.execute({ id: cat.id, strategy: "unassign" });

    expect(repo.getCategoriesForTask("task-1")).not.toContain(cat.id);
  });

  it("reassigns tasks when strategy is reassign", async () => {
    const catA = await createCategory.execute({ name: "A" });
    const catB = await createCategory.execute({ name: "B" });
    repo.assignCategoryToTask("task-1", catA.id);

    await deleteCategory.execute({
      id: catA.id,
      strategy: "reassign",
      reassignToId: catB.id,
    });

    expect(repo.getCategoriesForTask("task-1")).toContain(catB.id);
    expect(repo.getAll()).toHaveLength(1);
    expect(repo.getAll()[0].id).toBe(catB.id);
  });

  it("throws when category does not exist", async () => {
    await expect(
      deleteCategory.execute({ id: "ghost", strategy: "unassign" })
    ).rejects.toThrow("[DeleteCategory] Categoría no encontrada");
  });

  it("throws when reassign strategy has no reassignToId", async () => {
    const cat = await createCategory.execute({ name: "Cat" });
    await expect(
      deleteCategory.execute({ id: cat.id, strategy: "reassign" })
    ).rejects.toThrow("[DeleteCategory] Se requiere `reassignToId`");
  });

  it("throws when reassign target does not exist", async () => {
    const cat = await createCategory.execute({ name: "Cat" });
    await expect(
      deleteCategory.execute({
        id: cat.id,
        strategy: "reassign",
        reassignToId: "nonexistent",
      })
    ).rejects.toThrow("[DeleteCategory] Categoría destino de reasignación no encontrada");
  });

  it("emits category.deleted event", async () => {
    const events: string[] = [];
    eventBus.on("category.deleted", () => { events.push("category.deleted"); });

    const cat = await createCategory.execute({ name: "Cat" });
    await deleteCategory.execute({ id: cat.id, strategy: "unassign" });

    await new Promise((r) => setTimeout(r, 0));
    expect(events).toContain("category.deleted");
  });
});

describe("ListCategories", () => {
  let repo: InMemoryCategoryRepository;
  let eventBus: EventBus;
  let createCategory: CreateCategory;
  let listCategories: ListCategories;

  beforeEach(() => {
    repo = new InMemoryCategoryRepository();
    eventBus = new EventBus();
    createCategory = new CreateCategory(repo, eventBus);
    listCategories = new ListCategories(repo);
  });

  it("returns empty array when no categories exist", async () => {
    const result = await listCategories.execute();
    expect(result).toHaveLength(0);
  });

  it("lists all categories flat by default", async () => {
    await createCategory.execute({ name: "A" });
    await createCategory.execute({ name: "B" });

    const result = await listCategories.execute();
    expect(result).toHaveLength(2);
  });

  it("builds a tree when includeChildren is true", async () => {
    const parent = await createCategory.execute({ name: "Parent" });
    await createCategory.execute({ name: "Child 1", parentId: parent.id });
    await createCategory.execute({ name: "Child 2", parentId: parent.id });

    const tree = await listCategories.execute({ includeChildren: true });

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
  });

  it("filters by parentId", async () => {
    const parent = await createCategory.execute({ name: "Parent" });
    await createCategory.execute({ name: "Child", parentId: parent.id });

    const roots = await listCategories.execute({ parentId: null });
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe(parent.id);
  });

  it("returns children sorted by sortOrder then name", async () => {
    const parent = await createCategory.execute({ name: "Parent" });
    await createCategory.execute({ name: "Zeta", parentId: parent.id, sortOrder: 2 });
    await createCategory.execute({ name: "Alpha", parentId: parent.id, sortOrder: 1 });

    const tree = await listCategories.execute({ includeChildren: true });
    const children = tree[0].children!;

    expect(children[0].name).toBe("Alpha");
    expect(children[1].name).toBe("Zeta");
  });
});
