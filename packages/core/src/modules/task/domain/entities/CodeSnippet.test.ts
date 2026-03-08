/**
 * Tests unitarios de la entidad CodeSnippet.
 */

import { describe, it, expect } from "vitest";
import { CodeSnippet } from "./CodeSnippet";

describe("CodeSnippet", () => {
  describe("create", () => {
    it("crea un snippet con contenido y taskId", () => {
      const snip = CodeSnippet.create({
        taskId: "task-1",
        content: "const x = 1;",
      });

      expect(snip.id).toBeTruthy();
      expect(snip.taskId).toBe("task-1");
      expect(snip.content).toBe("const x = 1;");
      expect(snip.language).toBeNull();
      expect(snip.filePath).toBeNull();
      expect(snip.lineStart).toBeNull();
      expect(snip.lineEnd).toBeNull();
      expect(snip.createdAt).toBeInstanceOf(Date);
    });

    it("acepta lenguaje, filePath y líneas", () => {
      const snip = CodeSnippet.create({
        taskId: "t1",
        content: "code",
        language: "typescript",
        filePath: "src/index.ts",
        lineStart: 10,
        lineEnd: 15,
      });

      expect(snip.language).toBe("typescript");
      expect(snip.filePath).toBe("src/index.ts");
      expect(snip.lineStart).toBe(10);
      expect(snip.lineEnd).toBe(15);
    });

    it("permite crear solo con filePath (contenido vacío)", () => {
      const snip = CodeSnippet.create({
        taskId: "t1",
        content: "",
        filePath: "src/app.ts",
      });

      expect(snip.content).toBe("");
      expect(snip.filePath).toBe("src/app.ts");
    });

    it("lanza error si no hay contenido ni filePath", () => {
      expect(() =>
        CodeSnippet.create({ taskId: "t1", content: "" })
      ).toThrow("[CodeSnippet] Se requiere contenido o filePath.");
    });

    it("lanza error si contenido y filePath están vacíos o solo espacios", () => {
      expect(() =>
        CodeSnippet.create({ taskId: "t1", content: "   ", filePath: "  " })
      ).toThrow("[CodeSnippet] Se requiere contenido o filePath.");
    });
  });

  describe("reconstitute", () => {
    it("reconstruye un snippet desde props", () => {
      const now = new Date();
      const snip = CodeSnippet.reconstitute({
        id: "snippet-1",
        taskId: "task-1",
        content: "reconstituted",
        language: "json",
        filePath: null,
        lineStart: 1,
        lineEnd: 2,
        createdAt: now,
      });

      expect(snip.id).toBe("snippet-1");
      expect(snip.taskId).toBe("task-1");
      expect(snip.content).toBe("reconstituted");
      expect(snip.language).toBe("json");
      expect(snip.lineStart).toBe(1);
      expect(snip.lineEnd).toBe(2);
      expect(snip.createdAt).toBe(now);
    });
  });
});
