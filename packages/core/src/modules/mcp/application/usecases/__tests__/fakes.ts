/**
 * Fakes de UseCases para tests del módulo MCP.
 * Cada fake registra las llamadas recibidas y retorna datos predefinidos.
 */

import type { TaskDTO } from "@modules/task/application/dtos/TaskDTO.ts";
import type { CategoryDTO } from "@modules/category/application/dtos/CategoryDTO.ts";
import type { DocumentDTO, DocumentWithContentDTO } from "@modules/document/application/dtos/DocumentDTO.ts";
import type {
  McpServerDeps,
  ICreateTask,
  ICompleteTask,
  IListTasks,
  IMoveTaskStatus,
  IUpdateTask,
  ICreateDocument,
  IGetDocument,
  IListDocuments,
  IListCategories,
} from "../McpServer.ts";

// ─── TaskDTO mínimo ───────────────────────────────────────────────────────────

export function makeTaskDTO(id = "t1", title = "Task"): TaskDTO {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description: null,
    status: "todo",
    priority: 1,
    sortOrder: 0,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    documentId: null,
    categoryIds: [],
    tagIds: [],
    subtasks: [],
  };
}

export function makeCategoryDTO(id = "c1", name = "Work"): CategoryDTO {
  const now = new Date().toISOString();
  return { id, name, parentId: null, color: null, icon: null, sortOrder: 0, createdAt: now, updatedAt: now };
}

export function makeDocumentDTO(id = "d1", title = "Doc"): DocumentDTO {
  const now = new Date().toISOString();
  return { id, title, contentHash: null, createdAt: now, updatedAt: now };
}

export function makeDocumentWithContentDTO(id = "d1", title = "Doc", content = "# Hello"): DocumentWithContentDTO {
  return { ...makeDocumentDTO(id, title), content };
}

// ─── Fakes de UseCases ────────────────────────────────────────────────────────

export class FakeCreateTask {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) { this.result = result ?? makeTaskDTO(); }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeCompleteTask {
  calls: string[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) { this.result = result ?? makeTaskDTO("t1", "Done Task"); }
  async execute(taskId: string): Promise<TaskDTO> {
    this.calls.push(taskId);
    return this.result;
  }
}

export class FakeListTasks {
  calls: unknown[] = [];
  private result: TaskDTO[];
  constructor(result?: TaskDTO[]) { this.result = result ?? [makeTaskDTO()]; }
  async execute(filters?: unknown): Promise<TaskDTO[]> {
    this.calls.push(filters);
    return this.result;
  }
}

export class FakeMoveTaskStatus {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) { this.result = result ?? makeTaskDTO(); }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeUpdateTask {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) { this.result = result ?? makeTaskDTO(); }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeCreateDocument {
  calls: unknown[] = [];
  private result: DocumentDTO;
  constructor(result?: DocumentDTO) { this.result = result ?? makeDocumentDTO(); }
  async execute(input: unknown): Promise<DocumentDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeGetDocument {
  calls: unknown[] = [];
  private result: DocumentWithContentDTO | null;
  constructor(result?: DocumentWithContentDTO | null) {
    this.result = result !== undefined ? result : makeDocumentWithContentDTO();
  }
  async execute(input: unknown): Promise<DocumentWithContentDTO | null> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeListDocuments {
  calls: unknown[] = [];
  private result: DocumentDTO[];
  constructor(result?: DocumentDTO[]) { this.result = result ?? [makeDocumentDTO()]; }
  async execute(input: unknown): Promise<DocumentDTO[]> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeListCategories {
  calls: unknown[] = [];
  private result: CategoryDTO[];
  constructor(result?: CategoryDTO[]) { this.result = result ?? [makeCategoryDTO()]; }
  async execute(input: unknown): Promise<CategoryDTO[]> {
    this.calls.push(input);
    return this.result;
  }
}

/** Construye un McpServerDeps completo con fakes. */
export function makeDeps(overrides?: {
  createTask?: ICreateTask;
  completeTask?: ICompleteTask;
  listTasks?: IListTasks;
  moveTaskStatus?: IMoveTaskStatus;
  updateTask?: IUpdateTask;
  createDocument?: ICreateDocument;
  getDocument?: IGetDocument;
  listDocuments?: IListDocuments;
  listCategories?: IListCategories;
}): McpServerDeps {
  return {
    createTask: overrides?.createTask ?? new FakeCreateTask(),
    completeTask: overrides?.completeTask ?? new FakeCompleteTask(),
    listTasks: overrides?.listTasks ?? new FakeListTasks(),
    moveTaskStatus: overrides?.moveTaskStatus ?? new FakeMoveTaskStatus(),
    updateTask: overrides?.updateTask ?? new FakeUpdateTask(),
    createDocument: overrides?.createDocument ?? new FakeCreateDocument(),
    getDocument: overrides?.getDocument ?? new FakeGetDocument(),
    listDocuments: overrides?.listDocuments ?? new FakeListDocuments(),
    listCategories: overrides?.listCategories ?? new FakeListCategories(),
  };
}
