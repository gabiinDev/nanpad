/**
 * Tests unitarios de los UseCases del módulo History.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecordChange } from "../RecordChange.ts";
import { GetEntityHistory } from "../GetEntityHistory.ts";
import { HistoryEventListener } from "../HistoryEventListener.ts";
import { EventBus } from "@shared/event-bus/EventBus.ts";
import { InMemoryHistoryRepository } from "./fakes.ts";

describe("RecordChange", () => {
  let repo: InMemoryHistoryRepository;
  let recordChange: RecordChange;

  beforeEach(() => {
    repo = new InMemoryHistoryRepository();
    recordChange = new RecordChange(repo);
  });

  it("persists a history entry", async () => {
    await recordChange.execute({
      entityType: "task",
      entityId: "task-1",
      action: "create",
      newValue: "My Task",
    });

    expect(repo.getAll()).toHaveLength(1);
    expect(repo.getAll()[0].action).toBe("create");
  });

  it("stores fieldName, oldValue and newValue", async () => {
    await recordChange.execute({
      entityType: "task",
      entityId: "task-1",
      action: "status_change",
      fieldName: "status",
      oldValue: "todo",
      newValue: "in_progress",
    });

    const entry = repo.getAll()[0];
    expect(entry.fieldName).toBe("status");
    expect(entry.oldValue).toBe("todo");
    expect(entry.newValue).toBe("in_progress");
  });

  it("generates a unique ID for each entry", async () => {
    await recordChange.execute({ entityType: "task", entityId: "t1", action: "create" });
    await recordChange.execute({ entityType: "task", entityId: "t1", action: "update" });

    const ids = repo.getAll().map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("throws when entityType is empty", async () => {
    await expect(
      recordChange.execute({ entityType: "  ", entityId: "t1", action: "create" })
    ).rejects.toThrow("[HistoryEntry] entityType no puede estar vacío.");
  });

  it("throws when entityId is empty", async () => {
    await expect(
      recordChange.execute({ entityType: "task", entityId: "  ", action: "create" })
    ).rejects.toThrow("[HistoryEntry] entityId no puede estar vacío.");
  });
});

describe("GetEntityHistory", () => {
  let repo: InMemoryHistoryRepository;
  let recordChange: RecordChange;
  let getHistory: GetEntityHistory;

  beforeEach(() => {
    repo = new InMemoryHistoryRepository();
    recordChange = new RecordChange(repo);
    getHistory = new GetEntityHistory(repo);
  });

  it("returns empty array when entity has no history", async () => {
    const result = await getHistory.execute({ entityType: "task", entityId: "none" });
    expect(result).toHaveLength(0);
  });

  it("returns only entries for the specified entity", async () => {
    await recordChange.execute({ entityType: "task", entityId: "task-A", action: "create" });
    await recordChange.execute({ entityType: "task", entityId: "task-B", action: "create" });

    const result = await getHistory.execute({ entityType: "task", entityId: "task-A" });
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe("task-A");
  });

  it("returns DTOs with ISO createdAt strings", async () => {
    await recordChange.execute({ entityType: "task", entityId: "t1", action: "create" });

    const result = await getHistory.execute({ entityType: "task", entityId: "t1" });
    expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns entries for a category", async () => {
    await recordChange.execute({ entityType: "category", entityId: "cat-1", action: "create", newValue: "Frontend" });
    await recordChange.execute({ entityType: "category", entityId: "cat-1", action: "update", newValue: "Frontend v2" });

    const result = await getHistory.execute({ entityType: "category", entityId: "cat-1" });
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe("create");
    expect(result[1].action).toBe("update");
  });
});

describe("HistoryEventListener", () => {
  let repo: InMemoryHistoryRepository;
  let eventBus: EventBus;
  let listener: HistoryEventListener;

  beforeEach(() => {
    repo = new InMemoryHistoryRepository();
    eventBus = new EventBus();
    listener = new HistoryEventListener(repo, eventBus);
    listener.subscribe();
  });

  const flush = () => new Promise<void>((r) => setTimeout(r, 0));

  it("records history when task.created is emitted", async () => {
    eventBus.emitAsync({
      type: "task.created",
      payload: { taskId: "t1", title: "My Task" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    const history = await repo.findByEntity("task", "t1");
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("create");
  });

  it("records history when task.status_changed is emitted", async () => {
    eventBus.emitAsync({
      type: "task.status_changed",
      payload: { taskId: "t2", oldStatus: "todo", newStatus: "in_progress" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    const history = await repo.findByEntity("task", "t2");
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("status_change");
    expect(history[0].oldValue).toBe("todo");
    expect(history[0].newValue).toBe("in_progress");
  });

  it("records history when category.created is emitted", async () => {
    eventBus.emitAsync({
      type: "category.created",
      payload: { categoryId: "c1", name: "Frontend" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    const history = await repo.findByEntity("category", "c1");
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("create");
  });

  it("records history when category.deleted is emitted", async () => {
    eventBus.emitAsync({
      type: "category.deleted",
      payload: { categoryId: "c2" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    const history = await repo.findByEntity("category", "c2");
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("delete");
  });

  it("stops recording after unsubscribe", async () => {
    listener.unsubscribe();

    eventBus.emitAsync({
      type: "task.created",
      payload: { taskId: "t3", title: "Ignored" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    const history = await repo.findByEntity("task", "t3");
    expect(history).toHaveLength(0);
  });

  it("absorbs errors when history entry save fails", async () => {
    const saveSpy = vi.spyOn(repo, "save").mockRejectedValue(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    eventBus.emitAsync({
      type: "task.created",
      payload: { taskId: "t4", title: "Will fail" },
      timestamp: new Date().toISOString(),
    });
    await flush();

    expect(saveSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[HistoryEventListener]"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe("HistoryEntry entity (via RecordChange)", () => {
  it("creates entry with auto-generated id and timestamp", async () => {
    const repo = new InMemoryHistoryRepository();
    const uc = new RecordChange(repo);
    await uc.execute({ entityType: "task", entityId: "t1", action: "create" });

    const [entry] = repo.getAll();
    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
  });
});
