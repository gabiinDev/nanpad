/**
 * Tests unitarios de la entidad HistoryEntry.
 */

import { describe, it, expect } from "vitest";
import { HistoryEntry } from "./HistoryEntry";

describe("HistoryEntry", () => {
  describe("record", () => {
    it("crea una entrada con entityType, entityId y action", () => {
      const entry = HistoryEntry.record({
        entityType: "task",
        entityId: "task-1",
        action: "create",
      });

      expect(entry.id).toBeTruthy();
      expect(entry.entityType).toBe("task");
      expect(entry.entityId).toBe("task-1");
      expect(entry.action).toBe("create");
      expect(entry.fieldName).toBeNull();
      expect(entry.oldValue).toBeNull();
      expect(entry.newValue).toBeNull();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it("almacena fieldName, oldValue y newValue cuando se proporcionan", () => {
      const entry = HistoryEntry.record({
        entityType: "task",
        entityId: "t1",
        action: "status_change",
        fieldName: "status",
        oldValue: "todo",
        newValue: "in_progress",
      });

      expect(entry.fieldName).toBe("status");
      expect(entry.oldValue).toBe("todo");
      expect(entry.newValue).toBe("in_progress");
    });

    it("lanza error si entityType está vacío", () => {
      expect(() =>
        HistoryEntry.record({ entityType: "  ", entityId: "t1", action: "create" })
      ).toThrow("[HistoryEntry] entityType no puede estar vacío.");
    });

    it("lanza error si entityId está vacío", () => {
      expect(() =>
        HistoryEntry.record({ entityType: "task", entityId: "  ", action: "create" })
      ).toThrow("[HistoryEntry] entityId no puede estar vacío.");
    });

    it("genera IDs únicos para cada entrada", () => {
      const a = HistoryEntry.record({ entityType: "task", entityId: "t1", action: "create" });
      const b = HistoryEntry.record({ entityType: "task", entityId: "t1", action: "update" });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("reconstitute", () => {
    it("reconstruye una entrada desde props", () => {
      const now = new Date();
      const entry = HistoryEntry.reconstitute({
        id: "h1",
        entityType: "category",
        entityId: "cat-1",
        action: "delete",
        fieldName: null,
        oldValue: "Frontend",
        newValue: null,
        createdAt: now,
      });

      expect(entry.id).toBe("h1");
      expect(entry.entityType).toBe("category");
      expect(entry.entityId).toBe("cat-1");
      expect(entry.action).toBe("delete");
      expect(entry.oldValue).toBe("Frontend");
      expect(entry.createdAt).toBe(now);
    });
  });
});
