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
  FakeRestoreTask,
  FakeAddSubtask,
  FakeUpdateSubtask,
  FakeDeleteSubtask,
  FakeAttachCodeToTask,
  FakeListCodeSnippetsForTask,
  FakeDeleteCodeSnippet,
  FakeListCategories,
  FakeCreateCategory,
  FakeUpdateCategory,
  FakeDeleteCategory,
  makeTaskDTO,
  makeSubtaskDTO,
  makeCodeSnippetDTO,
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

const EXPECTED_TOOL_NAMES = [
  "create_task",
  "complete_task",
  "list_tasks",
  "move_task_status",
  "update_task",
  "restore_task",
  "add_subtask",
  "update_subtask",
  "delete_subtask",
  "attach_code_to_task",
  "list_code_snippets_for_task",
  "delete_code_snippet",
  "list_categories",
  "create_category",
  "update_category",
  "delete_category",
];

describe("McpServer.listTools", () => {
  it("exposes the 16 registered tools (no documents)", () => {
    const server = new McpServer(makeDeps());
    const tools = server.listTools();
    const names = tools.map((t) => t.name);

    for (const name of EXPECTED_TOOL_NAMES) {
      expect(names).toContain(name);
    }
    expect(names).toHaveLength(16);
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

// ─── Tool: restore_task ───────────────────────────────────────────────────────

describe("Tool: restore_task", () => {
  it("calls RestoreTask with the task id", async () => {
    const restoreTask = new FakeRestoreTask();
    const server = new McpServer(makeDeps({ restoreTask }));

    const response = await server.handle({
      tool: "restore_task",
      params: { id: "t1" },
    });

    expect(response.success).toBe(true);
    expect(restoreTask.calls[0]).toBe("t1");
  });
});

// ─── Tool: add_subtask ────────────────────────────────────────────────────────

describe("Tool: add_subtask", () => {
  it("calls AddSubtask with taskId and title", async () => {
    const addSubtask = new FakeAddSubtask(makeSubtaskDTO("s1", "t1", "Do something"));
    const server = new McpServer(makeDeps({ addSubtask }));

    const response = await server.handle({
      tool: "add_subtask",
      params: { taskId: "t1", title: "Do something" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { title: string }).title).toBe("Do something");
    expect(addSubtask.calls[0]).toEqual({ taskId: "t1", title: "Do something" });
  });

  it("returns error when title is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "add_subtask",
      params: { taskId: "t1" },
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: update_subtask ─────────────────────────────────────────────────────

describe("Tool: update_subtask", () => {
  it("calls UpdateSubtask with taskId, subtaskId and optional title/completed", async () => {
    const updateSubtask = new FakeUpdateSubtask();
    const server = new McpServer(makeDeps({ updateSubtask }));

    await server.handle({
      tool: "update_subtask",
      params: { taskId: "t1", subtaskId: "s1", completed: true },
    });

    const call = updateSubtask.calls[0] as { taskId: string; subtaskId: string; completed: boolean };
    expect(call.taskId).toBe("t1");
    expect(call.subtaskId).toBe("s1");
    expect(call.completed).toBe(true);
  });
});

// ─── Tool: delete_subtask ─────────────────────────────────────────────────────

describe("Tool: delete_subtask", () => {
  it("calls DeleteSubtask with taskId and subtaskId", async () => {
    const deleteSubtask = new FakeDeleteSubtask();
    const server = new McpServer(makeDeps({ deleteSubtask }));

    const response = await server.handle({
      tool: "delete_subtask",
      params: { taskId: "t1", subtaskId: "s1" },
    });

    expect(response.success).toBe(true);
    expect(deleteSubtask.calls[0]).toEqual({ taskId: "t1", subtaskId: "s1" });
  });
});

// ─── Tool: attach_code_to_task ───────────────────────────────────────────────

describe("Tool: attach_code_to_task", () => {
  it("calls AttachCodeToTask with taskId, content and optional language", async () => {
    const attachCodeToTask = new FakeAttachCodeToTask(makeCodeSnippetDTO("cs1", "t1", "const x = 1", "typescript"));
    const server = new McpServer(makeDeps({ attachCodeToTask }));

    const response = await server.handle({
      tool: "attach_code_to_task",
      params: { taskId: "t1", content: "const x = 1", language: "typescript" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { content: string }).content).toBe("const x = 1");
    const call = attachCodeToTask.calls[0] as { taskId: string; content: string; language: string };
    expect(call.taskId).toBe("t1");
    expect(call.content).toBe("const x = 1");
    expect(call.language).toBe("typescript");
  });

  it("returns error when content is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "attach_code_to_task",
      params: { taskId: "t1" },
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: list_code_snippets_for_task ───────────────────────────────────────

describe("Tool: list_code_snippets_for_task", () => {
  it("returns list of code snippets for the task", async () => {
    const listCodeSnippetsForTask = new FakeListCodeSnippetsForTask([
      makeCodeSnippetDTO("cs1", "t1"),
      makeCodeSnippetDTO("cs2", "t1"),
    ]);
    const server = new McpServer(makeDeps({ listCodeSnippetsForTask }));

    const response = await server.handle({
      tool: "list_code_snippets_for_task",
      params: { taskId: "t1" },
    });

    expect(response.success).toBe(true);
    expect((response.data as unknown[]).length).toBe(2);
    expect(listCodeSnippetsForTask.calls[0]).toBe("t1");
  });
});

// ─── Tool: delete_code_snippet ─────────────────────────────────────────────────

describe("Tool: delete_code_snippet", () => {
  it("calls DeleteCodeSnippet with snippetId", async () => {
    const deleteCodeSnippet = new FakeDeleteCodeSnippet();
    const server = new McpServer(makeDeps({ deleteCodeSnippet }));

    const response = await server.handle({
      tool: "delete_code_snippet",
      params: { snippetId: "cs1" },
    });

    expect(response.success).toBe(true);
    expect((deleteCodeSnippet.calls[0] as { snippetId: string }).snippetId).toBe("cs1");
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

// ─── Tool: create_category ───────────────────────────────────────────────────

describe("Tool: create_category", () => {
  it("calls CreateCategory and returns the category", async () => {
    const createCategory = new FakeCreateCategory(makeCategoryDTO("c1", "Work"));
    const server = new McpServer(makeDeps({ createCategory }));

    const response = await server.handle({
      tool: "create_category",
      params: { name: "Work" },
    });

    expect(response.success).toBe(true);
    expect((response.data as { name: string }).name).toBe("Work");
    expect(createCategory.calls[0]).toEqual({ name: "Work" });
  });

  it("returns error when name is missing", async () => {
    const server = new McpServer(makeDeps());
    const response = await server.handle({
      tool: "create_category",
      params: {},
    });
    expect(response.success).toBe(false);
  });
});

// ─── Tool: update_category ───────────────────────────────────────────────────

describe("Tool: update_category", () => {
  it("calls UpdateCategory with id and optional fields", async () => {
    const updateCategory = new FakeUpdateCategory();
    const server = new McpServer(makeDeps({ updateCategory }));

    await server.handle({
      tool: "update_category",
      params: { id: "c1", name: "New name" },
    });

    const call = updateCategory.calls[0] as { id: string; name: string };
    expect(call.id).toBe("c1");
    expect(call.name).toBe("New name");
  });
});

// ─── Tool: delete_category ───────────────────────────────────────────────────

describe("Tool: delete_category", () => {
  it("calls DeleteCategory with id and strategy", async () => {
    const deleteCategory = new FakeDeleteCategory();
    const server = new McpServer(makeDeps({ deleteCategory }));

    await server.handle({
      tool: "delete_category",
      params: { id: "c1", strategy: "unassign" },
    });

    const call = deleteCategory.calls[0] as { id: string; strategy: string };
    expect(call.id).toBe("c1");
    expect(call.strategy).toBe("unassign");
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
