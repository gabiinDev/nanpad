/**
 * Tests unitarios de la entidad Category.
 */

import { describe, it, expect } from "vitest";
import { Category } from "./Category.ts";

describe("Category", () => {
  describe("create", () => {
    it("creates a category with required name", () => {
      const cat = Category.create({ name: "Frontend" });

      expect(cat.name).toBe("Frontend");
      expect(cat.parentId).toBeNull();
      expect(cat.color).toBeNull();
      expect(cat.icon).toBeNull();
      expect(cat.sortOrder).toBe(0);
      expect(cat.id).toBeDefined();
      expect(cat.isRoot).toBe(true);
    });

    it("trims whitespace from name", () => {
      const cat = Category.create({ name: "  Backend  " });
      expect(cat.name).toBe("Backend");
    });

    it("throws when name is empty after trimming", () => {
      expect(() => Category.create({ name: "   " })).toThrow(
        "[Category] El nombre no puede estar vacío."
      );
    });

    it("creates a child category with a parent", () => {
      const parent = Category.create({ name: "Root" });
      const child = Category.create({ name: "Child", parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
      expect(child.isRoot).toBe(false);
    });

    it("accepts all optional fields", () => {
      const cat = Category.create({
        name: "Design",
        color: "#FF5733",
        icon: "palette",
        sortOrder: 3,
      });

      expect(cat.color).toBe("#FF5733");
      expect(cat.icon).toBe("palette");
      expect(cat.sortOrder).toBe(3);
    });

    it("generates unique IDs", () => {
      const cat1 = Category.create({ name: "A" });
      const cat2 = Category.create({ name: "B" });
      expect(cat1.id).not.toBe(cat2.id);
    });

    it("sets createdAt and updatedAt to the same time on creation", () => {
      const cat = Category.create({ name: "Test" });
      expect(cat.createdAt.getTime()).toBe(cat.updatedAt.getTime());
    });
  });

  describe("update", () => {
    it("returns a new instance with updated name", () => {
      const original = Category.create({ name: "Old" });
      const updated = original.update({ name: "New" });

      expect(updated.name).toBe("New");
      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toEqual(original.createdAt);
    });

    it("updates updatedAt when changed", () => {
      const original = Category.create({ name: "Test" });
      const updated = original.update({ name: "Updated" });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime()
      );
    });

    it("does not mutate the original", () => {
      const original = Category.create({ name: "Original" });
      original.update({ name: "Changed" });
      expect(original.name).toBe("Original");
    });

    it("throws when updated name is empty", () => {
      const cat = Category.create({ name: "Valid" });
      expect(() => cat.update({ name: "  " })).toThrow(
        "[Category] El nombre no puede estar vacío."
      );
    });

    it("can update parentId to null", () => {
      const parent = Category.create({ name: "Parent" });
      const child = Category.create({ name: "Child", parentId: parent.id });
      const detached = child.update({ parentId: null });

      expect(detached.parentId).toBeNull();
      expect(detached.isRoot).toBe(true);
    });

    it("can update color to null", () => {
      const cat = Category.create({ name: "Cat", color: "#FF0000" });
      const updated = cat.update({ color: null });
      expect(updated.color).toBeNull();
    });

    it("preserves unchanged fields", () => {
      const cat = Category.create({ name: "Test", color: "#000", sortOrder: 5 });
      const updated = cat.update({ name: "Updated" });

      expect(updated.color).toBe("#000");
      expect(updated.sortOrder).toBe(5);
    });
  });

  describe("reconstitute", () => {
    it("rebuilds entity from persisted props", () => {
      const now = new Date();
      const cat = Category.reconstitute({
        id: "test-id",
        name: "Restored",
        parentId: null,
        color: "#AAA",
        icon: "tag",
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      });

      expect(cat.id).toBe("test-id");
      expect(cat.name).toBe("Restored");
      expect(cat.color).toBe("#AAA");
    });
  });
});
