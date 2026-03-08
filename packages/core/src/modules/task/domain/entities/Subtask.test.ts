/**
 * Tests unitarios de la entidad Subtask.
 */

import { describe, it, expect } from "vitest";
import { Subtask } from "./Subtask";

describe("Subtask", () => {
  describe("create", () => {
    it("crea una subtarea con título y taskId", () => {
      const sub = Subtask.create({ taskId: "task-1", title: "Paso 1" });

      expect(sub.id).toBeTruthy();
      expect(sub.taskId).toBe("task-1");
      expect(sub.title).toBe("Paso 1");
      expect(sub.completed).toBe(false);
      expect(sub.sortOrder).toBe(0);
      expect(sub.createdAt).toBeInstanceOf(Date);
      expect(sub.updatedAt).toBeInstanceOf(Date);
    });

    it("asigna sortOrder cuando se proporciona", () => {
      const sub = Subtask.create({ taskId: "t1", title: "Segundo", sortOrder: 1 });
      expect(sub.sortOrder).toBe(1);
    });

    it("recorta espacios en blanco del título", () => {
      const sub = Subtask.create({ taskId: "t1", title: "  Recortado  " });
      expect(sub.title).toBe("Recortado");
    });

    it("lanza error si el título está vacío", () => {
      expect(() =>
        Subtask.create({ taskId: "t1", title: "" })
      ).toThrow("[Subtask] El título no puede estar vacío.");
    });

    it("lanza error si el título es solo espacios", () => {
      expect(() =>
        Subtask.create({ taskId: "t1", title: "   " })
      ).toThrow("[Subtask] El título no puede estar vacío.");
    });
  });

  describe("reconstitute", () => {
    it("reconstruye una subtarea desde props", () => {
      const now = new Date();
      const sub = Subtask.reconstitute({
        id: "sub-1",
        taskId: "task-1",
        title: "Existente",
        completed: true,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      });

      expect(sub.id).toBe("sub-1");
      expect(sub.taskId).toBe("task-1");
      expect(sub.title).toBe("Existente");
      expect(sub.completed).toBe(true);
      expect(sub.sortOrder).toBe(2);
      expect(sub.createdAt).toBe(now);
      expect(sub.updatedAt).toBe(now);
    });
  });

  describe("toggle", () => {
    it("invierte el estado completed", () => {
      const sub = Subtask.create({ taskId: "t1", title: "Toggle" });
      expect(sub.completed).toBe(false);

      const toggled = sub.toggle();
      expect(toggled.completed).toBe(true);
      expect(toggled.id).toBe(sub.id);

      const again = toggled.toggle();
      expect(again.completed).toBe(false);
    });

    it("actualiza updatedAt", () => {
      const sub = Subtask.create({ taskId: "t1", title: "T" });
      const before = sub.updatedAt.getTime();
      const toggled = sub.toggle();
      expect(toggled.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe("rename", () => {
    it("actualiza el título", () => {
      const sub = Subtask.create({ taskId: "t1", title: "Viejo" });
      const renamed = sub.rename("Nuevo título");
      expect(renamed.title).toBe("Nuevo título");
      expect(renamed.id).toBe(sub.id);
    });

    it("recorta espacios del nuevo título", () => {
      const sub = Subtask.create({ taskId: "t1", title: "A" });
      const renamed = sub.rename("  Nuevo  ");
      expect(renamed.title).toBe("Nuevo");
    });

    it("lanza error si el nuevo título está vacío", () => {
      const sub = Subtask.create({ taskId: "t1", title: "A" });
      expect(() => sub.rename("")).toThrow("[Subtask] El título no puede estar vacío.");
    });

    it("lanza error si el nuevo título es solo espacios", () => {
      const sub = Subtask.create({ taskId: "t1", title: "A" });
      expect(() => sub.rename("   ")).toThrow("[Subtask] El título no puede estar vacío.");
    });
  });
});
