import { describe, it, expect, beforeEach } from "vitest";
import { ExportWorkspace } from "../ExportWorkspace";
import { ImportWorkspace } from "../ImportWorkspace";
import { BackupNow } from "../BackupNow";
import { InMemoryStoragePort, makeTaskRow, makeCategoryRow } from "./fakes";

describe("ExportWorkspace", () => {
  let port: InMemoryStoragePort;
  let exportWs: ExportWorkspace;

  beforeEach(() => {
    port = new InMemoryStoragePort();
    exportWs = new ExportWorkspace(port);
  });

  it("exports an empty workspace as valid JSON", async () => {
    const result = await exportWs.execute();

    expect(result.json).toBeTruthy();
    const parsed = JSON.parse(result.json);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.tasks).toEqual([]);
    expect(parsed.categories).toEqual([]);
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("includes tasks and categories in the snapshot", async () => {
    port.tasks = [makeTaskRow("t1", "My Task")];
    port.categories = [makeCategoryRow("c1", "Work")];

    const result = await exportWs.execute();
    const parsed = JSON.parse(result.json);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].title).toBe("My Task");
    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0].name).toBe("Work");
  });

  it("excludes history when includeHistory is false", async () => {
    port.historyEntries = [
      {
        id: "h1",
        entity_type: "task",
        entity_id: "t1",
        action: "created",
        field_name: null,
        old_value: null,
        new_value: null,
        created_at: new Date().toISOString(),
      },
    ];

    const result = await exportWs.execute({ includeHistory: false });
    const parsed = JSON.parse(result.json);

    expect(parsed.historyEntries).toEqual([]);
  });

  it("includes history by default", async () => {
    port.historyEntries = [
      {
        id: "h1",
        entity_type: "task",
        entity_id: "t1",
        action: "created",
        field_name: null,
        old_value: null,
        new_value: null,
        created_at: new Date().toISOString(),
      },
    ];

    const result = await exportWs.execute();
    const parsed = JSON.parse(result.json);

    expect(parsed.historyEntries).toHaveLength(1);
  });

  it("returns a suggested filename with the current date", async () => {
    const result = await exportWs.execute();
    const today = new Date().toISOString().slice(0, 10);

    expect(result.filename).toBe(`nanpad-backup-${today}.json`);
  });

  it("returns sizeBytes greater than 0", async () => {
    const result = await exportWs.execute();
    expect(result.sizeBytes).toBeGreaterThan(0);
  });
});

describe("ImportWorkspace", () => {
  let port: InMemoryStoragePort;
  let exportWs: ExportWorkspace;
  let importWs: ImportWorkspace;

  beforeEach(() => {
    port = new InMemoryStoragePort();
    exportWs = new ExportWorkspace(port);
    importWs = new ImportWorkspace(port);
  });

  it("imports a previously exported snapshot", async () => {
    port.tasks = [makeTaskRow("t1", "Imported Task")];
    const { json } = await exportWs.execute();

    // Limpia el estado del puerto
    await port.clearAllData();
    expect(port.tasks).toHaveLength(0);

    const result = await importWs.execute({ json });

    expect(result.imported.tasks).toBe(1);
    expect(port.tasks).toHaveLength(1);
    expect(port.tasks[0].title).toBe("Imported Task");
  });

  it("does not duplicate rows when importing twice (INSERT OR IGNORE)", async () => {
    port.tasks = [makeTaskRow("t1", "Task")];
    const { json } = await exportWs.execute();

    await importWs.execute({ json });
    await importWs.execute({ json });

    expect(port.tasks).toHaveLength(1);
  });

  it("replaces all data when replace is true", async () => {
    port.tasks = [makeTaskRow("t1", "Original Task")];
    const originalJson = (await exportWs.execute()).json;

    // Añadir datos nuevos al puerto
    port.tasks = [
      makeTaskRow("t1", "Original Task"),
      makeTaskRow("t2", "Extra Task"),
    ];

    await importWs.execute({ json: originalJson, replace: true });

    expect(port.tasks).toHaveLength(1);
    expect(port.tasks[0].id).toBe("t1");
  });

  it("throws when the JSON is invalid", async () => {
    await expect(
      importWs.execute({ json: "not-json" })
    ).rejects.toThrow("no es válido");
  });

  it("throws when the snapshot is missing required fields", async () => {
    const badJson = JSON.stringify({ foo: "bar" });
    await expect(
      importWs.execute({ json: badJson })
    ).rejects.toThrow("estructura esperada");
  });

  it("throws when snapshot schemaVersion is greater than current DB version", async () => {
    const { json } = await exportWs.execute();
    // Manipular la versión en el JSON
    const parsed = JSON.parse(json);
    parsed.schemaVersion = 999;
    const futureJson = JSON.stringify(parsed);

    await expect(
      importWs.execute({ json: futureJson })
    ).rejects.toThrow("schema v999");
  });

  it("returns schema versions in the result", async () => {
    port.tasks = [makeTaskRow("t1")];
    const { json } = await exportWs.execute();
    await port.clearAllData();

    const result = await importWs.execute({ json });

    expect(result.snapshotSchemaVersion).toBe(1);
    expect(result.currentSchemaVersion).toBe(1);
  });
});

describe("BackupNow", () => {
  let port: InMemoryStoragePort;
  let backupNow: BackupNow;

  beforeEach(() => {
    port = new InMemoryStoragePort();
    backupNow = new BackupNow(port);
  });

  it("returns a valid JSON snapshot", async () => {
    port.tasks = [makeTaskRow("t1")];
    const result = await backupNow.execute();

    expect(result.json).toBeTruthy();
    const parsed = JSON.parse(result.json);
    expect(parsed.tasks).toHaveLength(1);
  });

  it("includes history in the backup", async () => {
    port.historyEntries = [
      {
        id: "h1",
        entity_type: "task",
        entity_id: "t1",
        action: "created",
        field_name: null,
        old_value: null,
        new_value: null,
        created_at: new Date().toISOString(),
      },
    ];

    const result = await backupNow.execute();
    const parsed = JSON.parse(result.json);

    expect(parsed.historyEntries).toHaveLength(1);
  });

  it("returns a filename and createdAt timestamp", async () => {
    const result = await backupNow.execute();

    expect(result.filename).toMatch(/nanpad-backup-\d{4}-\d{2}-\d{2}\.json/);
    expect(result.createdAt).toBeTruthy();
    expect(() => new Date(result.createdAt)).not.toThrow();
  });
});

describe("Storage — performance: export/import with large datasets", () => {
  it("exports 5000 tasks in under 500ms", async () => {
    const port = new InMemoryStoragePort();
    const now = new Date().toISOString();
    port.tasks = Array.from({ length: 5000 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      description: null,
      status: "todo",
      priority: 1,
      sort_order: i,
      completed_at: null,
      created_at: now,
      updated_at: now,
      document_id: null,
    }));

    const exportWs = new ExportWorkspace(port);
    const start = performance.now();
    const result = await exportWs.execute({ includeHistory: false });
    const elapsed = performance.now() - start;

    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  }, 10_000);

  it("imports 5000 tasks in under 500ms", async () => {
    const port = new InMemoryStoragePort();
    const now = new Date().toISOString();
    port.tasks = Array.from({ length: 5000 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      description: null,
      status: "todo",
      priority: 1,
      sort_order: i,
      completed_at: null,
      created_at: now,
      updated_at: now,
      document_id: null,
    }));

    const exportWs = new ExportWorkspace(port);
    const { json } = await exportWs.execute({ includeHistory: false });

    await port.clearAllData();

    const importPort = new InMemoryStoragePort();
    const importWs = new ImportWorkspace(importPort);

    const start = performance.now();
    await importWs.execute({ json });
    const elapsed = performance.now() - start;

    expect(importPort.tasks).toHaveLength(5000);
    expect(elapsed).toBeLessThan(500);
  }, 10_000);
});
