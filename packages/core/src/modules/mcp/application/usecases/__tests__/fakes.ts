/**
 * Fakes de UseCases para tests del módulo MCP.
 * Cada fake registra las llamadas recibidas y retorna datos predefinidos.
 */

import type { TaskDTO, SubtaskDTO, CodeSnippetDTO } from "@modules/task/application/dtos/TaskDTO";
import type { CategoryDTO } from "@modules/category/application/dtos/CategoryDTO";
import type {
  McpServerDeps,
  ICreateTask,
  ICompleteTask,
  IListTasks,
  IMoveTaskStatus,
  IUpdateTask,
  IRestoreTask,
  IAddSubtask,
  IUpdateSubtask,
  IDeleteSubtask,
  IAttachCodeToTask,
  IListCodeSnippetsForTask,
  IDeleteCodeSnippet,
  IListCategories,
  ICreateCategory,
  IUpdateCategory,
  IDeleteCategory,
} from "../McpServer";

// ─── DTOs mínimos ─────────────────────────────────────────────────────────────

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

export function makeSubtaskDTO(id = "s1", taskId = "t1", title = "Subtask"): SubtaskDTO {
  const now = new Date().toISOString();
  return { id, taskId, title, completed: false, sortOrder: 0, createdAt: now, updatedAt: now };
}

export function makeCodeSnippetDTO(id = "cs1", taskId = "t1", content = "code", language = "typescript"): CodeSnippetDTO {
  const now = new Date().toISOString();
  return {
    id,
    taskId,
    content,
    language,
    filePath: null,
    lineStart: null,
    lineEnd: null,
    createdAt: now,
  };
}

export function makeCategoryDTO(id = "c1", name = "Work"): CategoryDTO {
  const now = new Date().toISOString();
  return { id, name, parentId: null, color: null, icon: null, sortOrder: 0, createdAt: now, updatedAt: now };
}

// ─── Fakes de UseCases ────────────────────────────────────────────────────────

export class FakeCreateTask {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) {
    this.result = result ?? makeTaskDTO();
  }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeCompleteTask {
  calls: string[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) {
    this.result = result ?? makeTaskDTO("t1", "Done Task");
  }
  async execute(taskId: string): Promise<TaskDTO> {
    this.calls.push(taskId);
    return this.result;
  }
}

export class FakeListTasks {
  calls: unknown[] = [];
  private result: TaskDTO[];
  constructor(result?: TaskDTO[]) {
    this.result = result ?? [makeTaskDTO()];
  }
  async execute(input?: unknown): Promise<{ tasks: TaskDTO[]; total: number }> {
    this.calls.push(input);
    return { tasks: this.result, total: this.result.length };
  }
}

export class FakeMoveTaskStatus {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) {
    this.result = result ?? makeTaskDTO();
  }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeUpdateTask {
  calls: unknown[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) {
    this.result = result ?? makeTaskDTO();
  }
  async execute(input: unknown): Promise<TaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeRestoreTask {
  calls: string[] = [];
  private result: TaskDTO;
  constructor(result?: TaskDTO) {
    this.result = result ?? makeTaskDTO();
  }
  async execute(taskId: string): Promise<TaskDTO> {
    this.calls.push(taskId);
    return this.result;
  }
}

export class FakeAddSubtask {
  calls: unknown[] = [];
  private result: SubtaskDTO;
  constructor(result?: SubtaskDTO) {
    this.result = result ?? makeSubtaskDTO();
  }
  async execute(input: unknown): Promise<SubtaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeUpdateSubtask {
  calls: unknown[] = [];
  private result: SubtaskDTO;
  constructor(result?: SubtaskDTO) {
    this.result = result ?? makeSubtaskDTO();
  }
  async execute(input: unknown): Promise<SubtaskDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeDeleteSubtask {
  calls: unknown[] = [];
  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

export class FakeAttachCodeToTask {
  calls: unknown[] = [];
  private result: CodeSnippetDTO;
  constructor(result?: CodeSnippetDTO) {
    this.result = result ?? makeCodeSnippetDTO();
  }
  async execute(input: unknown): Promise<CodeSnippetDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeListCodeSnippetsForTask {
  calls: string[] = [];
  private result: CodeSnippetDTO[];
  constructor(result?: CodeSnippetDTO[]) {
    this.result = result ?? [];
  }
  async execute(taskId: string): Promise<CodeSnippetDTO[]> {
    this.calls.push(taskId);
    return this.result;
  }
}

export class FakeDeleteCodeSnippet {
  calls: unknown[] = [];
  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

export class FakeListCategories {
  calls: unknown[] = [];
  private result: CategoryDTO[];
  constructor(result?: CategoryDTO[]) {
    this.result = result ?? [makeCategoryDTO()];
  }
  async execute(input: unknown): Promise<CategoryDTO[]> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeCreateCategory {
  calls: unknown[] = [];
  private result: CategoryDTO;
  constructor(result?: CategoryDTO) {
    this.result = result ?? makeCategoryDTO();
  }
  async execute(input: unknown): Promise<CategoryDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeUpdateCategory {
  calls: unknown[] = [];
  private result: CategoryDTO;
  constructor(result?: CategoryDTO) {
    this.result = result ?? makeCategoryDTO();
  }
  async execute(input: unknown): Promise<CategoryDTO> {
    this.calls.push(input);
    return this.result;
  }
}

export class FakeDeleteCategory {
  calls: unknown[] = [];
  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

/** Construye un McpServerDeps completo con fakes. */
export function makeDeps(overrides?: {
  createTask?: ICreateTask;
  completeTask?: ICompleteTask;
  listTasks?: IListTasks;
  moveTaskStatus?: IMoveTaskStatus;
  updateTask?: IUpdateTask;
  restoreTask?: IRestoreTask;
  addSubtask?: IAddSubtask;
  updateSubtask?: IUpdateSubtask;
  deleteSubtask?: IDeleteSubtask;
  attachCodeToTask?: IAttachCodeToTask;
  listCodeSnippetsForTask?: IListCodeSnippetsForTask;
  deleteCodeSnippet?: IDeleteCodeSnippet;
  listCategories?: IListCategories;
  createCategory?: ICreateCategory;
  updateCategory?: IUpdateCategory;
  deleteCategory?: IDeleteCategory;
}): McpServerDeps {
  return {
    createTask: overrides?.createTask ?? new FakeCreateTask(),
    completeTask: overrides?.completeTask ?? new FakeCompleteTask(),
    listTasks: overrides?.listTasks ?? new FakeListTasks(),
    moveTaskStatus: overrides?.moveTaskStatus ?? new FakeMoveTaskStatus(),
    updateTask: overrides?.updateTask ?? new FakeUpdateTask(),
    restoreTask: overrides?.restoreTask ?? new FakeRestoreTask(),
    addSubtask: overrides?.addSubtask ?? new FakeAddSubtask(),
    updateSubtask: overrides?.updateSubtask ?? new FakeUpdateSubtask(),
    deleteSubtask: overrides?.deleteSubtask ?? new FakeDeleteSubtask(),
    attachCodeToTask: overrides?.attachCodeToTask ?? new FakeAttachCodeToTask(),
    listCodeSnippetsForTask: overrides?.listCodeSnippetsForTask ?? new FakeListCodeSnippetsForTask(),
    deleteCodeSnippet: overrides?.deleteCodeSnippet ?? new FakeDeleteCodeSnippet(),
    listCategories: overrides?.listCategories ?? new FakeListCategories(),
    createCategory: overrides?.createCategory ?? new FakeCreateCategory(),
    updateCategory: overrides?.updateCategory ?? new FakeUpdateCategory(),
    deleteCategory: overrides?.deleteCategory ?? new FakeDeleteCategory(),
  };
}
