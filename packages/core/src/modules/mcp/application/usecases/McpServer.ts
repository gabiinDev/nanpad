/**
 * Servidor MCP de NANPAD.
 * Recibe requests de agentes de IA, despacha al UseCase correspondiente
 * y retorna respuestas estandarizadas.
 *
 * Las tools registradas cubren las operaciones indicadas en la especificación:
 * - Crear tareas
 * - Completar tareas
 * - Consultar estado
 * - Generar documentos
 * - Categorizar automáticamente
 */

import type { TaskDTO, ListTasksInput, ListTasksResult, CreateTaskInput, UpdateTaskInput, MoveTaskStatusInput } from "@modules/task/application/dtos/TaskDTO";
import type { CreateDocumentInput, DocumentDTO, DocumentWithContentDTO, GetDocumentInput, ListDocumentsInput } from "@modules/document/application/dtos/DocumentDTO";
import type { CategoryDTO, ListCategoriesInput } from "@modules/category/application/dtos/CategoryDTO";

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

/** Interfaz del UseCase CreateDocument. */
export interface ICreateDocument {
  execute(input: CreateDocumentInput): Promise<DocumentDTO>;
}

/** Interfaz del UseCase GetDocument. */
export interface IGetDocument {
  execute(input: GetDocumentInput): Promise<DocumentWithContentDTO | null>;
}

/** Interfaz del UseCase ListDocuments. */
export interface IListDocuments {
  execute(input: ListDocumentsInput): Promise<DocumentDTO[]>;
}

/** Interfaz del UseCase ListCategories. */
export interface IListCategories {
  execute(input: ListCategoriesInput): Promise<CategoryDTO[]>;
}

/** Dependencias requeridas por McpServer. */
export interface McpServerDeps {
  createTask: ICreateTask;
  completeTask: ICompleteTask;
  listTasks: IListTasks;
  moveTaskStatus: IMoveTaskStatus;
  updateTask: IUpdateTask;
  createDocument: ICreateDocument;
  getDocument: IGetDocument;
  listDocuments: IListDocuments;
  listCategories: IListCategories;
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
    this.registerCreateDocument();
    this.registerGetDocument();
    this.registerListDocuments();
    this.registerListCategories();
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

  private registerCreateDocument(): void {
    this.registry.register(
      {
        name: "create_document",
        description:
          "Crea un nuevo documento técnico en el workspace.",
        inputSchema: {
          title: {
            type: "string",
            description: "Título del documento (obligatorio).",
            required: true,
          },
          content: {
            type: "string",
            description: "Contenido Markdown del documento.",
            required: false,
          },
        },
      },
      async (params) => {
        const title = assertString(params.title, "title");
        return this.deps.createDocument.execute({
          title,
          content: optString(params.content) ?? "",
        });
      }
    );
  }

  private registerGetDocument(): void {
    this.registry.register(
      {
        name: "get_document",
        description: "Obtiene un documento por ID, incluyendo su contenido.",
        inputSchema: {
          id: {
            type: "string",
            description: "ID del documento.",
            required: true,
          },
        },
      },
      async (params) => {
        const id = assertString(params.id, "id");
        return this.deps.getDocument.execute({ id });
      }
    );
  }

  private registerListDocuments(): void {
    this.registry.register(
      {
        name: "list_documents",
        description: "Lista los documentos del workspace (solo metadata).",
        inputSchema: {
          titleFilter: {
            type: "string",
            description: "Filtrar por fragmento de título.",
            required: false,
          },
        },
      },
      async (params) => {
        return this.deps.listDocuments.execute({
          text: optString(params.titleFilter),
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
