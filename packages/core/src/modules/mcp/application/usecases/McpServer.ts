/**
 * Servidor MCP de NANPAD.
 * Recibe requests de agentes de IA, despacha al UseCase correspondiente
 * y retorna respuestas estandarizadas.
 *
 * Tools expuestas: tareas (crear, completar, listar, mover estado, actualizar, restaurar),
 * subtareas (añadir, actualizar, eliminar), adjuntos de código (añadir, listar, eliminar),
 * categorías (listar, crear, actualizar, eliminar).
 * No se exponen documentos internos en DB (no utilizados en la app).
 */

import type {
  TaskDTO,
  ListTasksInput,
  ListTasksResult,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskStatusInput,
  SubtaskDTO,
  CodeSnippetDTO,
  AddSubtaskInput,
  AttachCodeToTaskInput,
} from "@modules/task/application/dtos/TaskDTO";
import type {
  CategoryDTO,
  ListCategoriesInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
} from "@modules/category/application/dtos/CategoryDTO";

import { McpToolRegistry } from "./McpToolRegistry";
import type {
  McpRequest,
  McpResponse,
  McpToolDescriptor,
} from "../dtos/McpDTO";

// ─── Interfaces estructurales de los UseCases ─────────────────────────────────
// Se usan interfaces en lugar de clases concretas para desacoplar tests y fakes.

/** Interfaz del UseCase CreateTask. */
export interface ICreateTask {
  execute(input: CreateTaskInput): Promise<TaskDTO>;
}

/** Interfaz del UseCase CompleteTask. */
export interface ICompleteTask {
  execute(taskId: string): Promise<TaskDTO>;
}

/** Interfaz del UseCase ListTasks. */
export interface IListTasks {
  execute(input?: ListTasksInput): Promise<ListTasksResult>;
}

/** Interfaz del UseCase MoveTaskStatus. */
export interface IMoveTaskStatus {
  execute(input: MoveTaskStatusInput): Promise<TaskDTO>;
}

/** Interfaz del UseCase UpdateTask. */
export interface IUpdateTask {
  execute(input: UpdateTaskInput): Promise<TaskDTO>;
}

/** Interfaz del UseCase RestoreTask. */
export interface IRestoreTask {
  execute(taskId: string): Promise<TaskDTO>;
}

/** Interfaz del UseCase AddSubtask. */
export interface IAddSubtask {
  execute(input: AddSubtaskInput): Promise<SubtaskDTO>;
}

/** Interfaz del UseCase UpdateSubtask. */
export interface IUpdateSubtask {
  execute(input: { taskId: string; subtaskId: string; title?: string; completed?: boolean }): Promise<SubtaskDTO>;
}

/** Interfaz del UseCase DeleteSubtask. */
export interface IDeleteSubtask {
  execute(input: { taskId: string; subtaskId: string }): Promise<void>;
}

/** Interfaz del UseCase AttachCodeToTask. */
export interface IAttachCodeToTask {
  execute(input: AttachCodeToTaskInput): Promise<CodeSnippetDTO>;
}

/** Interfaz del UseCase ListCodeSnippetsForTask. */
export interface IListCodeSnippetsForTask {
  execute(taskId: string): Promise<CodeSnippetDTO[]>;
}

/** Interfaz del UseCase DeleteCodeSnippet. */
export interface IDeleteCodeSnippet {
  execute(input: { snippetId: string; taskId?: string; filePath?: string | null }): Promise<void>;
}

/** Interfaz del UseCase ListCategories. */
export interface IListCategories {
  execute(input: ListCategoriesInput): Promise<CategoryDTO[]>;
}

/** Interfaz del UseCase CreateCategory. */
export interface ICreateCategory {
  execute(input: CreateCategoryInput): Promise<CategoryDTO>;
}

/** Interfaz del UseCase UpdateCategory. */
export interface IUpdateCategory {
  execute(input: UpdateCategoryInput): Promise<CategoryDTO>;
}

/** Interfaz del UseCase DeleteCategory. */
export interface IDeleteCategory {
  execute(input: DeleteCategoryInput): Promise<void>;
}

/** Dependencias requeridas por McpServer. */
export interface McpServerDeps {
  createTask: ICreateTask;
  completeTask: ICompleteTask;
  listTasks: IListTasks;
  moveTaskStatus: IMoveTaskStatus;
  updateTask: IUpdateTask;
  restoreTask: IRestoreTask;
  addSubtask: IAddSubtask;
  updateSubtask: IUpdateSubtask;
  deleteSubtask: IDeleteSubtask;
  attachCodeToTask: IAttachCodeToTask;
  listCodeSnippetsForTask: IListCodeSnippetsForTask;
  deleteCodeSnippet: IDeleteCodeSnippet;
  listCategories: IListCategories;
  createCategory: ICreateCategory;
  updateCategory: IUpdateCategory;
  deleteCategory: IDeleteCategory;
}

/**
 * Punto de entrada del módulo MCP.
 * Se instancia con los UseCases necesarios y registra todas las tools en el constructor.
 *
 * Uso típico:
 * ```ts
 * const server = new McpServer({ createTask, completeTask, ... });
 * const response = await server.handle({ tool: "create_task", params: { title: "Fix bug" } });
 * ```
 */
export class McpServer {
  private readonly registry: McpToolRegistry;

  constructor(private readonly deps: McpServerDeps) {
    this.registry = new McpToolRegistry();
    this.registerTools();
  }

  // ─── API pública ────────────────────────────────────────────────────────────

  /**
   * Despacha un request MCP al handler correspondiente.
   * Nunca lanza: los errores se encapsulan en McpResponse.
   */
  async handle(request: McpRequest): Promise<McpResponse> {
    const entry = this.registry.resolve(request.tool);
    if (!entry) {
      return {
        success: false,
        error: `Tool '${request.tool}' no reconocida. Tools disponibles: ${this.registry
          .listDescriptors()
          .map((d) => d.name)
          .join(", ")}.`,
      };
    }

    try {
      const data = await entry.handler(request.params);
      return { success: true, data };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error desconocido.";
      return { success: false, error: message };
    }
  }

  /**
   * Retorna el listado de tools disponibles (para la capability negotiation del agente).
   */
  listTools(): McpToolDescriptor[] {
    return this.registry.listDescriptors();
  }

  // ─── Registro de tools ───────────────────────────────────────────────────────

  private registerTools(): void {
    this.registerCreateTask();
    this.registerCompleteTask();
    this.registerListTasks();
    this.registerMoveTaskStatus();
    this.registerUpdateTask();
    this.registerRestoreTask();
    this.registerAddSubtask();
    this.registerUpdateSubtask();
    this.registerDeleteSubtask();
    this.registerAttachCodeToTask();
    this.registerListCodeSnippetsForTask();
    this.registerDeleteCodeSnippet();
    this.registerListCategories();
    this.registerCreateCategory();
    this.registerUpdateCategory();
    this.registerDeleteCategory();
  }

  private registerCreateTask(): void {
    this.registry.register(
      {
        name: "create_task",
        description:
          "Crea una nueva tarea en el workspace. Retorna la tarea creada.",
        inputSchema: {
          title: {
            type: "string",
            description: "Título de la tarea (obligatorio).",
            required: true,
          },
          description: {
            type: "string",
            description: "Descripción opcional en Markdown.",
            required: false,
          },
          priority: {
            type: "number",
            description: "Prioridad: 0 (baja), 1 (media), 2 (alta), 3 (urgente).",
            required: false,
          },
          categoryIds: {
            type: "array",
            description: "IDs de categorías a asignar.",
            required: false,
            items: { type: "string" },
          },
        },
      },
      async (params) => {
        const title = assertString(params.title, "title");
        return this.deps.createTask.execute({
          title,
          description: optString(params.description),
          priority: optNumber(params.priority) as 0 | 1 | 2 | 3 | undefined,
          categoryIds: optStringArray(params.categoryIds),
        });
      }
    );
  }

  private registerCompleteTask(): void {
    this.registry.register(
      {
        name: "complete_task",
        description: "Marca una tarea existente como completada.",
        inputSchema: {
          id: {
            type: "string",
            description: "ID de la tarea a completar.",
            required: true,
          },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        return this.deps.completeTask.execute(id);
      }
    );
  }

  private registerListTasks(): void {
    this.registry.register(
      {
        name: "list_tasks",
        description:
          "Lista las tareas del workspace. Soporta filtros opcionales.",
        inputSchema: {
          status: {
            type: "string",
            description: "Filtrar por estado: todo | in_progress | done | archived.",
            required: false,
            enum: ["todo", "in_progress", "done", "archived"],
          },
          categoryId: {
            type: "string",
            description: "Filtrar por categoría.",
            required: false,
          },
          text: {
            type: "string",
            description: "Búsqueda por texto en título o descripción.",
            required: false,
          },
        },
      },
      async (params) => {
        const result = await this.deps.listTasks.execute({
          filters: {
            status: optString(params.status) as
              | "todo"
              | "in_progress"
              | "done"
              | "archived"
              | undefined,
            categoryId: optString(params.categoryId),
            text: optString(params.text),
          },
        });
        return result.tasks;
      }
    );
  }

  private registerMoveTaskStatus(): void {
    this.registry.register(
      {
        name: "move_task_status",
        description: "Cambia el estado de una tarea.",
        inputSchema: {
          id: {
            type: "string",
            description: "ID de la tarea.",
            required: true,
          },
          newStatus: {
            type: "string",
            description: "Nuevo estado: todo | in_progress | done | archived.",
            required: true,
            enum: ["todo", "in_progress", "done", "archived"],
          },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        const newStatus = assertString(params.newStatus, "newStatus") as
          | "todo"
          | "in_progress"
          | "done"
          | "archived";
        return this.deps.moveTaskStatus.execute({ id, newStatus });
      }
    );
  }

  private registerUpdateTask(): void {
    this.registry.register(
      {
        name: "update_task",
        description:
          "Actualiza el título, descripción o prioridad de una tarea existente.",
        inputSchema: {
          id: {
            type: "string",
            description: "ID de la tarea.",
            required: true,
          },
          title: {
            type: "string",
            description: "Nuevo título.",
            required: false,
          },
          description: {
            type: "string",
            description: "Nueva descripción en Markdown.",
            required: false,
          },
          priority: {
            type: "number",
            description: "Nueva prioridad: 0 | 1 | 2 | 3.",
            required: false,
          },
          categoryIds: {
            type: "array",
            description: "Nuevos IDs de categorías (reemplaza los actuales).",
            required: false,
            items: { type: "string" },
          },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        return this.deps.updateTask.execute({
          id,
          title: optString(params.title),
          description: optString(params.description),
          priority: optNumber(params.priority) as 0 | 1 | 2 | 3 | undefined,
          categoryIds: optStringArray(params.categoryIds),
        });
      }
    );
  }

  private registerRestoreTask(): void {
    this.registry.register(
      {
        name: "restore_task",
        description: "Restaura una tarea completada o archivada al estado 'todo'.",
        inputSchema: {
          id: {
            type: "string",
            description: "ID de la tarea a restaurar.",
            required: true,
          },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        return this.deps.restoreTask.execute(id);
      }
    );
  }

  private registerAddSubtask(): void {
    this.registry.register(
      {
        name: "add_subtask",
        description: "Añade una subtarea a una tarea existente.",
        inputSchema: {
          taskId: {
            type: "string",
            description: "ID de la tarea padre.",
            required: true,
          },
          title: {
            type: "string",
            description: "Título de la subtarea (obligatorio).",
            required: true,
          },
        },
      },
      async (params) => {
        const taskId = assertString(params.taskId, "taskId");
        const title = assertString(params.title, "title");
        return this.deps.addSubtask.execute({ taskId, title });
      }
    );
  }

  private registerUpdateSubtask(): void {
    this.registry.register(
      {
        name: "update_subtask",
        description: "Actualiza una subtarea (título y/o estado completado).",
        inputSchema: {
          taskId: { type: "string", description: "ID de la tarea padre.", required: true },
          subtaskId: { type: "string", description: "ID de la subtarea.", required: true },
          title: { type: "string", description: "Nuevo título.", required: false },
          completed: { type: "boolean", description: "Si está completada.", required: false },
        },
      },
      async (params) => {
        const taskId = assertString(params.taskId, "taskId");
        const subtaskId = assertString(params.subtaskId, "subtaskId");
        return this.deps.updateSubtask.execute({
          taskId,
          subtaskId,
          title: optString(params.title),
          completed: optBoolean(params.completed),
        });
      }
    );
  }

  private registerDeleteSubtask(): void {
    this.registry.register(
      {
        name: "delete_subtask",
        description: "Elimina una subtarea.",
        inputSchema: {
          taskId: { type: "string", description: "ID de la tarea padre.", required: true },
          subtaskId: { type: "string", description: "ID de la subtarea.", required: true },
        },
      },
      async (params) => {
        const taskId = assertString(params.taskId, "taskId");
        const subtaskId = assertString(params.subtaskId, "subtaskId");
        return this.deps.deleteSubtask.execute({ taskId, subtaskId });
      }
    );
  }

  private registerAttachCodeToTask(): void {
    this.registry.register(
      {
        name: "attach_code_to_task",
        description:
          "Adjunta un fragmento de código o nota temporal a una tarea. Permite especificar lenguaje (ej. typescript, markdown, json).",
        inputSchema: {
          taskId: { type: "string", description: "ID de la tarea.", required: true },
          content: { type: "string", description: "Contenido del fragmento (obligatorio).", required: true },
          language: { type: "string", description: "Lenguaje o tipo (ej. typescript, markdown, json).", required: false },
          filePath: { type: "string", description: "Ruta de archivo de origen si aplica.", required: false },
          lineStart: { type: "number", description: "Línea inicial si aplica.", required: false },
          lineEnd: { type: "number", description: "Línea final si aplica.", required: false },
        },
      },
      async (params) => {
        const taskId = assertString(params.taskId, "taskId");
        const content = assertString(params.content, "content");
        return this.deps.attachCodeToTask.execute({
          taskId,
          content,
          language: optString(params.language),
          filePath: optString(params.filePath),
          lineStart: optNumber(params.lineStart),
          lineEnd: optNumber(params.lineEnd),
        });
      }
    );
  }

  private registerListCodeSnippetsForTask(): void {
    this.registry.register(
      {
        name: "list_code_snippets_for_task",
        description: "Lista los fragmentos de código/adjuntos de una tarea.",
        inputSchema: {
          taskId: { type: "string", description: "ID de la tarea.", required: true },
        },
      },
      async (params) => {
        const taskId = assertString(params.taskId, "taskId");
        return this.deps.listCodeSnippetsForTask.execute(taskId);
      }
    );
  }

  private registerDeleteCodeSnippet(): void {
    this.registry.register(
      {
        name: "delete_code_snippet",
        description: "Elimina un fragmento de código adjunto a una tarea.",
        inputSchema: {
          snippetId: { type: "string", description: "ID del fragmento.", required: true },
          taskId: { type: "string", description: "ID de la tarea (opcional, para historial).", required: false },
          filePath: { type: "string", description: "Ruta del archivo (opcional).", required: false },
        },
      },
      async (params) => {
        const snippetId = assertString(params.snippetId, "snippetId");
        return this.deps.deleteCodeSnippet.execute({
          snippetId,
          taskId: optString(params.taskId),
          filePath: optString(params.filePath),
        });
      }
    );
  }

  private registerListCategories(): void {
    this.registry.register(
      {
        name: "list_categories",
        description:
          "Lista todas las categorías disponibles. Útil para categorizar tareas automáticamente.",
        inputSchema: {
          includeChildren: {
            type: "boolean",
            description: "Si true, retorna el árbol de categorías con hijos anidados.",
            required: false,
          },
        },
      },
      async (params) => {
        return this.deps.listCategories.execute({
          includeChildren: optBoolean(params.includeChildren),
        });
      }
    );
  }

  private registerCreateCategory(): void {
    this.registry.register(
      {
        name: "create_category",
        description: "Crea una nueva categoría.",
        inputSchema: {
          name: { type: "string", description: "Nombre de la categoría (obligatorio).", required: true },
          parentId: { type: "string", description: "ID de la categoría padre si es subcategoría.", required: false },
          color: { type: "string", description: "Color en hex o nombre.", required: false },
          icon: { type: "string", description: "Nombre del icono.", required: false },
          sortOrder: { type: "number", description: "Orden de visualización.", required: false },
        },
      },
      async (params) => {
        const name = assertString(params.name, "name");
        return this.deps.createCategory.execute({
          name,
          parentId: optString(params.parentId),
          color: optString(params.color),
          icon: optString(params.icon),
          sortOrder: optNumber(params.sortOrder),
        });
      }
    );
  }

  private registerUpdateCategory(): void {
    this.registry.register(
      {
        name: "update_category",
        description: "Actualiza una categoría existente.",
        inputSchema: {
          id: { type: "string", description: "ID de la categoría.", required: true },
          name: { type: "string", description: "Nuevo nombre.", required: false },
          parentId: { type: "string", description: "Nuevo padre.", required: false },
          color: { type: "string", description: "Nuevo color.", required: false },
          icon: { type: "string", description: "Nuevo icono.", required: false },
          sortOrder: { type: "number", description: "Nuevo orden.", required: false },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        return this.deps.updateCategory.execute({
          id,
          name: optString(params.name),
          parentId: optString(params.parentId),
          color: optString(params.color),
          icon: optString(params.icon),
          sortOrder: optNumber(params.sortOrder),
        });
      }
    );
  }

  private registerDeleteCategory(): void {
    this.registry.register(
      {
        name: "delete_category",
        description:
          "Elimina una categoría. strategy: 'unassign' desasigna tareas; 'reassign' reasigna a reassignToId.",
        inputSchema: {
          id: { type: "string", description: "ID de la categoría.", required: true },
          strategy: {
            type: "string",
            description: "unassign | reassign",
            required: true,
            enum: ["unassign", "reassign"],
          },
          reassignToId: { type: "string", description: "ID de categoría destino cuando strategy=reassign.", required: false },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        const strategy = assertString(params.strategy, "strategy") as "unassign" | "reassign";
        return this.deps.deleteCategory.execute({
          id,
          strategy,
          reassignToId: optString(params.reassignToId),
        });
      }
    );
  }
}

// ─── Helpers de validación de parámetros ─────────────────────────────────────

/**
 * Extrae un string requerido del mapa de params.
 * @throws {Error} Si el valor no es un string no vacío.
 */
function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `[MCP] El parámetro '${name}' es obligatorio y debe ser un string no vacío.`
    );
  }
  return value;
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function optBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}
