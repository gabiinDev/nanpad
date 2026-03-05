import { describe, it, expect } from "vitest";
import { Task } from "./Task.ts";
import { Priority } from "../value-objects/Priority.ts";
import { TaskStatus } from "../value-objects/TaskStatus.ts";

describe("Task.create", () => {
  it("crea una tarea con título y valores por defecto", () => {
    const task = Task.create({ title: "Nueva tarea" });

    expect(task.title).toBe("Nueva tarea");
    expect(task.status.value).toBe("todo");
    expect(task.priority.value).toBe(1);
    expect(task.completedAt).toBeNull();
    expect(task.categoryIds).toHaveLength(0);
  });

  it("crea con prioridad y categorías personalizadas", () => {
    const task = Task.create({
      title: "Con prioridad",
      priority: Priority.HIGH,
      categoryIds: ["cat-1"],
    });

    expect(task.priority.value).toBe(2);
    expect(task.categoryIds).toContain("cat-1");
  });

  it("elimina espacios del título", () => {
    const task = Task.create({ title: "  Con espacios  " });
    expect(task.title).toBe("Con espacios");
  });

  it("lanza error si el título es solo espacios", () => {
    expect(() => Task.create({ title: "   " })).toThrow();
  });

  it("genera un ID único en cada llamada", () => {
    const t1 = Task.create({ title: "A" });
    const t2 = Task.create({ title: "B" });
    expect(t1.id).not.toBe(t2.id);
  });
});

describe("Task.update", () => {
  it("actualiza el título y deja el resto igual", () => {
    const task = Task.create({ title: "Original" });
    const updated = task.update({ title: "Actualizado" });

    expect(updated.title).toBe("Actualizado");
    expect(updated.id).toBe(task.id);
    expect(updated.status.value).toBe("todo");
  });

  it("retorna una nueva instancia (inmutabilidad)", () => {
    const task = Task.create({ title: "Original" });
    const updated = task.update({ title: "Nuevo" });
    expect(updated).not.toBe(task);
    expect(task.title).toBe("Original");
  });
});

describe("Task.complete y restore", () => {
  it("completa una tarea y establece completedAt", () => {
    const task = Task.create({ title: "Completar" });
    const completed = task.complete();

    expect(completed.status.value).toBe("done");
    expect(completed.completedAt).not.toBeNull();
    expect(completed.isCompleted).toBe(true);
  });

  it("restaura una tarea completada", () => {
    const task = Task.create({ title: "Restaurar" });
    const completed = task.complete();
    const restored = completed.restore();

    expect(restored.status.value).toBe("todo");
    expect(restored.completedAt).toBeNull();
    expect(restored.isCompleted).toBe(false);
  });

  it("lanza error al completar una tarea ya completada", () => {
    const task = Task.create({ title: "Ya done" });
    const done = task.complete();
    expect(() => done.complete()).toThrow();
  });
});

describe("Task.moveToStatus", () => {
  it("mueve de todo a in_progress", () => {
    const task = Task.create({ title: "Mover" });
    const moved = task.moveToStatus(TaskStatus.IN_PROGRESS);
    expect(moved.status.value).toBe("in_progress");
  });

  it("lanza error en transición inválida (archived → done)", () => {
    const task = Task.create({ title: "Archived" });
    const archived = task.moveToStatus(TaskStatus.ARCHIVED);
    expect(() => archived.moveToStatus(TaskStatus.DONE)).toThrow();
  });
});
