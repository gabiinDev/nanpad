/**
 * Tests unitarios de la entidad Document.
 */

import { describe, it, expect } from "vitest";
import { Document } from "./Document";

describe("Document", () => {
  describe("create", () => {
    it("creates document with required title", () => {
      const doc = Document.create({ title: "My Doc" });

      expect(doc.title).toBe("My Doc");
      expect(doc.content).toBe("");
      expect(doc.id).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it("trims whitespace from title", () => {
      const doc = Document.create({ title: "  Trimmed  " });
      expect(doc.title).toBe("Trimmed");
    });

    it("throws when title is empty after trimming", () => {
      expect(() => Document.create({ title: "   " })).toThrow(
        "[Document] El título no puede estar vacío."
      );
    });

    it("accepts optional content", () => {
      const doc = Document.create({ title: "With Content", content: "# Hello" });
      expect(doc.content).toBe("# Hello");
    });

    it("generates a contentHash", () => {
      const doc = Document.create({ title: "Doc", content: "text" });
      expect(doc.contentHash).toBeDefined();
      expect(doc.contentHash).not.toBe("");
    });

    it("generates unique IDs for different documents", () => {
      const a = Document.create({ title: "A" });
      const b = Document.create({ title: "B" });
      expect(a.id).not.toBe(b.id);
    });

    it("sets createdAt and updatedAt equal on creation", () => {
      const doc = Document.create({ title: "Time" });
      expect(doc.createdAt.getTime()).toBe(doc.updatedAt.getTime());
    });
  });

  describe("update", () => {
    it("returns new instance with updated title", () => {
      const original = Document.create({ title: "Old" });
      const updated = original.update({ title: "New" });

      expect(updated.title).toBe("New");
      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toEqual(original.createdAt);
    });

    it("does not mutate original", () => {
      const original = Document.create({ title: "Original" });
      original.update({ title: "Changed" });
      expect(original.title).toBe("Original");
    });

    it("updates content and recalculates hash", () => {
      const original = Document.create({ title: "Doc", content: "Old" });
      const updated = original.update({ content: "New" });

      expect(updated.content).toBe("New");
      expect(updated.contentHash).not.toBe(original.contentHash);
    });

    it("same hash for same content after update", () => {
      const original = Document.create({ title: "Doc", content: "Same" });
      const updated = original.update({ content: "Same" });

      expect(updated.contentHash).toBe(original.contentHash);
    });

    it("throws when updated title is empty", () => {
      const doc = Document.create({ title: "Valid" });
      expect(() => doc.update({ title: "  " })).toThrow(
        "[Document] El título no puede estar vacío."
      );
    });

    it("preserves content when only title is updated", () => {
      const doc = Document.create({ title: "Doc", content: "Keep me" });
      const updated = doc.update({ title: "New Title" });

      expect(updated.content).toBe("Keep me");
    });
  });

  describe("withoutContent", () => {
    it("returns document with null content", () => {
      const doc = Document.create({ title: "Doc", content: "Some content" });
      const stripped = doc.withoutContent();

      expect(stripped.content).toBeNull();
      expect(stripped.title).toBe("Doc");
      expect(stripped.contentHash).toBe(doc.contentHash);
      expect(stripped.id).toBe(doc.id);
    });
  });

  describe("reconstitute", () => {
    it("rebuilds entity from persisted props", () => {
      const now = new Date();
      const doc = Document.reconstitute({
        id: "test-id",
        title: "Restored",
        contentHash: "abc123",
        content: "# Content",
        createdAt: now,
        updatedAt: now,
      });

      expect(doc.id).toBe("test-id");
      expect(doc.title).toBe("Restored");
      expect(doc.content).toBe("# Content");
    });
  });
});
