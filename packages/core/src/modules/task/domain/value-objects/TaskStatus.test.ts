import { describe, it, expect } from "vitest";
import { TaskStatus } from "./TaskStatus.ts";

describe("TaskStatus", () => {
  it("crea un TaskStatus desde string válido", () => {
    expect(TaskStatus.from("todo").value).toBe("todo");
    expect(TaskStatus.from("in_progress").value).toBe("in_progress");
    expect(TaskStatus.from("done").value).toBe("done");
    expect(TaskStatus.from("archived").value).toBe("archived");
  });

  it("lanza error para valor inválido", () => {
    expect(() => TaskStatus.from("invalid")).toThrow();
  });

  it("las constantes estáticas tienen los valores correctos", () => {
    expect(TaskStatus.TODO.value).toBe("todo");
    expect(TaskStatus.IN_PROGRESS.value).toBe("in_progress");
    expect(TaskStatus.DONE.value).toBe("done");
    expect(TaskStatus.ARCHIVED.value).toBe("archived");
  });

  it("permite transición de todo a in_progress", () => {
    expect(TaskStatus.TODO.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(true);
  });

  it("permite transición de done a todo (restaurar)", () => {
    expect(TaskStatus.DONE.canTransitionTo(TaskStatus.TODO)).toBe(true);
  });

  it("no permite transición de archived a done", () => {
    expect(TaskStatus.ARCHIVED.canTransitionTo(TaskStatus.DONE)).toBe(false);
  });

  it("equals compara correctamente", () => {
    expect(TaskStatus.TODO.equals(TaskStatus.from("todo"))).toBe(true);
    expect(TaskStatus.TODO.equals(TaskStatus.DONE)).toBe(false);
  });
});
