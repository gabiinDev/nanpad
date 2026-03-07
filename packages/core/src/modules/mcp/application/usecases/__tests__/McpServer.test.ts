import { describe, it, expect } from "vitest";
import { McpServer } from "../McpServer";
import { McpToolRegistry } from "../McpToolRegistry";
import {
  makeDeps,
  FakeCreateTask,
  FakeCompleteTask,
  FakeListTasks,
  FakeMoveTaskStatus,
  FakeUpdateTask,
  FakeCreateDocument,
  FakeGetDocument,
  FakeListDocuments,
  FakeListCategories,
  makeTaskDTO,
  makeDocumentDTO,
  makeDocumentWithContentDTO,
  makeCategoryDTO,
} from "./fakes";

// ─── McpToolRegistry ─────────────────────────────────────────────────────────

describe("McpToolRegistry", () => {
  it("registers and resolves a tool", () => {
    const registry = new McpToolRegistry();
    const handler = async () => "ok";
    registry.register(
      { name: "my_tool", description: "Test", inputSchema: {} },
      handler
    );
    const entry = registry.resolve("my_tool");
    expect(entry).toBeDefined();
    expect(entry?.descriptor.name).toBe("my_tool");
  });

  it("throws when registering the same tool twice", () => {
    const registry = new McpToolRegistry();
    const handler = async () => "ok";
    registry.register({ name: "dup", description: "A", inputSchema: {} }, handler);
    expect(() =>
      registry.register({ name: "dup", description: "B", inputSchema: {} }, handler)
    ).toThrow("ya está registrada");
  });

  it("returns undefined for unknown tools", () => {
    const registry = new McpToolRegistry();
    expect(registry.resolve("unknown")).toBeUndefined();
  });

  it("lists all registered descriptors", () => {
    const registry = new McpToolRegistry();
    registry.register({ name: "tool_a", description: "A", inputSchema: {} }, async () => null);
    registry.register({ name: "tool_b", description: "B", inputSchema: {} }, async () => null);
    const list = registry.listDescriptors();
    expect(list).toHaveLength(2);
    expect(list.map((d) => d.name)).toContain("tool_a");
    expect(list.map((d) => d.name)).toContain("tool_b");
  });
});

// ─── McpServer.listTools ─────────────────────────────────────────────────────

describe("McpServer.listTools", () => {
  it("exposes the 9 registered tools", () => {
    const server = new McpServer(makeDeps());
    const tools = server.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain("create_task");
    expect(names).toContain("complete_task");
    expect(names).toContain("list_tasks");
    expect(names).toContain("move_task_status");
    expect(names).toContain("update_task");
    expect(names).toContain("create_document");
    expect(names).toContain("get_document");
    expect(names).toContain("list_documents");
    expect(names).toContain("list_categories");
    expect(names).toHaveLength(9);
  });

  it("each tool has a description and inputSchema", () => {
    const server = new McpServer(makeDeps());
    for (const tool of server.listTools()) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.inputSchema).toBe("object");
    }
  });
});

// ─── McpServer.handle — tool desconocida ─────────────────────────────────────

describe("McpServer.handle — unknown tool", () => {
  it("returns success:false for an unknown tool", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({ tool: "nonexistent", params: {} });

    expect(response.success).toBe(false);
    expect(response.error).toContain("nonexistent");
    expect(response.error).toContain("Tools disponibles");
  });
});

// ─── Tool: create_task ───────────────────────────────────────────────────────

describe("Tool: create_task", () => {
  it("calls CreateTask and returns success", async () => {
    const createTask = new FakeCreateTask(makeTaskDTO("t1", "New Task"));
    const server = new McpServer(makeDeps({ createTask }));

    const response = await server.handle({
      tool: "create_task",
      params: { title: "New Task" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { title: string }).title).toBe("New Task");
    expect(createTask.calls).toHaveLength(1);
  });

  it("returns error when title is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "create_task",
      params: {},
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("title");
  });

  it("passes description and priority to CreateTask", async () => {
    const createTask = new FakeCreateTask();
    const server = new McpServer(makeDeps({ createTask }));

    await server.handle({
      tool: "create_task",
      params: { title: "Task", description: "Desc", priority: 2 },
    });

    const call = createTask.calls[0] as { description: string; priority: number };
    expect(call.description).toBe("Desc");
    expect(call.priority).toBe(2);
  });
});

// ─── Tool: complete_task ─────────────────────────────────────────────────────

describe("Tool: complete_task", () => {
  it("calls CompleteTask with the task id", async () => {
    const completeTask = new FakeCompleteTask();
    const server = new McpServer(makeDeps({ completeTask }));

    const response = await server.handle({
      tool: "complete_task",
      params: { id: "t1" },
    });

    expect(response.success).toBe(true);
    expect(completeTask.calls[0]).toBe("t1");
  });

  it("returns error when id is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "complete_task",
      params: {},
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: list_tasks ────────────────────────────────────────────────────────

describe("Tool: list_tasks", () => {
  it("returns list of tasks", async () => {
    const listTasks = new FakeListTasks([makeTaskDTO("t1"), makeTaskDTO("t2")]);
    const server = new McpServer(makeDeps({ listTasks }));

    const response = await server.handle({
      tool: "list_tasks",
      params: {},
    });

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect((response.data as unknown[]).length).toBe(2);
  });

  it("passes status filter to ListTasks", async () => {
    const listTasks = new FakeListTasks();
    const server = new McpServer(makeDeps({ listTasks }));

    await server.handle({
      tool: "list_tasks",
      params: { status: "done" },
    });

    const call = listTasks.calls[0] as { filters?: { status?: string } };
    expect(call.filters?.status).toBe("done");
  });
});

// ─── Tool: move_task_status ──────────────────────────────────────────────────

describe("Tool: move_task_status", () => {
  it("calls MoveTaskStatus with id and newStatus", async () => {
    const moveTaskStatus = new FakeMoveTaskStatus();
    const server = new McpServer(makeDeps({ moveTaskStatus }));

    const response = await server.handle({
      tool: "move_task_status",
      params: { id: "t1", newStatus: "in_progress" },
    });

    expect(response.success).toBe(true);
    expect(moveTaskStatus.calls[0]).toEqual({ id: "t1", newStatus: "in_progress" });
  });

  it("returns error when newStatus is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "move_task_status",
      params: { id: "t1" },
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: update_task ───────────────────────────────────────────────────────

describe("Tool: update_task", () => {
  it("calls UpdateTask with the correct params", async () => {
    const updateTask = new FakeUpdateTask();
    const server = new McpServer(makeDeps({ updateTask }));

    await server.handle({
      tool: "update_task",
      params: { id: "t1", title: "New title", priority: 3 },
    });

    const call = updateTask.calls[0] as { id: string; title: string; priority: number };
    expect(call.id).toBe("t1");
    expect(call.title).toBe("New title");
    expect(call.priority).toBe(3);
  });
});

// ─── Tool: create_document ───────────────────────────────────────────────────

describe("Tool: create_document", () => {
  it("calls CreateDocument and returns the document", async () => {
    const createDocument = new FakeCreateDocument(makeDocumentDTO("d1", "My Doc"));
    const server = new McpServer(makeDeps({ createDocument }));

    const response = await server.handle({
      tool: "create_document",
      params: { title: "My Doc", content: "# Hello" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { title: string }).title).toBe("My Doc");
    expect(createDocument.calls).toHaveLength(1);
  });

  it("returns error when title is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "create_document",
      params: {},
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: get_document ──────────────────────────────────────────────────────

describe("Tool: get_document", () => {
  it("returns the document with content", async () => {
    const getDocument = new FakeGetDocument(makeDocumentWithContentDTO("d1", "Doc", "# Body"));
    const server = new McpServer(makeDeps({ getDocument }));

    const response = await server.handle({
      tool: "get_document",
      params: { id: "d1" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { content: string }).content).toBe("# Body");
  });

  it("returns null when document does not exist", async () => {
    const getDocument = new FakeGetDocument(null);
    const server = new McpServer(makeDeps({ getDocument }));

    const response = await server.handle({
      tool: "get_document",
      params: { id: "missing" },
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });
});

// ─── Tool: list_documents ────────────────────────────────────────────────────

describe("Tool: list_documents", () => {
  it("returns list of document metadata", async () => {
    const listDocuments = new FakeListDocuments([makeDocumentDTO("d1"), makeDocumentDTO("d2")]);
    const server = new McpServer(makeDeps({ listDocuments }));

    const response = await server.handle({
      tool: "list_documents",
      params: {},
    });

    expect(response.success).toBe(true);
    expect((response.data as unknown[]).length).toBe(2);
  });

  it("passes titleFilter to ListDocuments as text", async () => {
    const listDocuments = new FakeListDocuments();
    const server = new McpServer(makeDeps({ listDocuments }));

    await server.handle({
      tool: "list_documents",
      params: { titleFilter: "Api" },
    });

    const call = listDocuments.calls[0] as { text: string };
    expect(call.text).toBe("Api");
  });
});

// ─── Tool: list_categories ───────────────────────────────────────────────────

describe("Tool: list_categories", () => {
  it("returns list of categories", async () => {
    const listCategories = new FakeListCategories([makeCategoryDTO("c1"), makeCategoryDTO("c2")]);
    const server = new McpServer(makeDeps({ listCategories }));

    const response = await server.handle({
      tool: "list_categories",
      params: {},
    });

    expect(response.success).toBe(true);
    expect((response.data as unknown[]).length).toBe(2);
  });

  it("passes includeChildren to ListCategories", async () => {
    const listCategories = new FakeListCategories();
    const server = new McpServer(makeDeps({ listCategories }));

    await server.handle({
      tool: "list_categories",
      params: { includeChildren: true },
    });

    const call = listCategories.calls[0] as { includeChildren: boolean };
    expect(call.includeChildren).toBe(true);
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe("McpServer — error handling", () => {
  it("wraps UseCase errors in a success:false response", async () => {
    const createTask = {
      execute: async () => {
        throw new Error("DB connection failed");
      },
    } as unknown as FakeCreateTask;

    const server = new McpServer(makeDeps({ createTask }));
    const response = await server.handle({
      tool: "create_task",
      params: { title: "Task" },
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("DB connection failed");
  });
});
