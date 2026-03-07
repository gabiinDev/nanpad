/**
 * Tests de UseCases del módulo Task:
 * UpdateTask, ListTasks, MoveTaskStatus, CompleteTask, RestoreTask,
 * AddSubtask, AttachCodeToTask, GetTaskHistory.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { UpdateTask } from "../UpdateTask";
import { ListTasks } from "../ListTasks";
import { MoveTaskStatus } from "../MoveTaskStatus";
import { CompleteTask } from "../CompleteTask";
import { RestoreTask } from "../RestoreTask";
import { AddSubtask } from "../AddSubtask";
import { AttachCodeToTask } from "../AttachCodeToTask";
import { GetTaskHistory } from "../GetTaskHistory";
import { CreateTask } from "../CreateTask";
import { EventBus } from "@shared/event-bus/EventBus";
import { InMemoryTaskRepository, InMemoryHistoryRepository } from "./fakes";
import { HistoryEntry } from "@modules/history/domain/entities/HistoryEntry";

describe("UpdateTask", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let update: UpdateTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    update = new UpdateTask(repo, bus);
  });

  it("actualiza el título de una tarea existente", async () => {
    const task = await create.execute({ title: "Original" });
    const updated = await update.execute({ id: task.id, title: "Actualizado" });

    expect(updated.title).toBe("Actualizado");
    expect(updated.id).toBe(task.id);
  });

  it("lanza error si la tarea no existe", async () => {
    await expect(
      update.execute({ id: "id-inexistente", title: "X" })
    ).rejects.toThrow();
  });
});

describe("ListTasks", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let list: ListTasks;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    list = new ListTasks(repo);
  });

  it("retorna todas las tareas sin filtros", async () => {
    await create.execute({ title: "A" });
    await create.execute({ title: "B" });

    const result = await list.execute();
    expect(result.tasks).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("filtra por estado", async () => {
    await create.execute({ title: "Todo" });
    const dto = await create.execute({ title: "Completada" });

    const completeUC = new CompleteTask(repo, bus);
    await completeUC.execute(dto.id);

    const todos = await list.execute({ filters: { status: "todo" } });
    const dones = await list.execute({ filters: { status: "done" } });

    expect(todos.tasks).toHaveLength(1);
    expect(dones.tasks).toHaveLength(1);
  });

  it("filtra por texto (título)", async () => {
    await create.execute({ title: "Revisar código" });
    await create.execute({ title: "Reunión equipo" });

    const result = await list.execute({ filters: { text: "código" } });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toContain("código");
  });

  it("retorna array vacío cuando no hay tareas", async () => {
    const result = await list.execute();
    expect(result.tasks).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("respeta paginación limit/offset", async () => {
    await create.execute({ title: "1" });
    await create.execute({ title: "2" });
    await create.execute({ title: "3" });

    const page1 = await list.execute({ limit: 2, offset: 0 });
    expect(page1.tasks).toHaveLength(2);
    expect(page1.total).toBe(3);

    const page2 = await list.execute({ limit: 2, offset: 2 });
    expect(page2.tasks).toHaveLength(1);
    expect(page2.total).toBe(3);
  });

  it("ListTasks con 2000 tareas responde en menos de 500 ms (performance)", async () => {
    for (let i = 0; i < 2000; i++) {
      await create.execute({ title: `Task ${i}` });
    }
    const start = performance.now();
    const result = await list.execute({ limit: 100, offset: 0 });
    const elapsed = performance.now() - start;
    expect(result.tasks).toHaveLength(100);
    expect(result.total).toBe(2000);
    expect(elapsed).toBeLessThan(500);
  }, 10_000);
});

describe("MoveTaskStatus", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let move: MoveTaskStatus;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    move = new MoveTaskStatus(repo, bus);
  });

  it("mueve una tarea de todo a in_progress", async () => {
    const task = await create.execute({ title: "Mover" });
    const moved = await move.execute({ id: task.id, newStatus: "in_progress" });

    expect(moved.status).toBe("in_progress");
  });

  it("emite el evento 'task.status_changed'", async () => {
    const events: string[] = [];
    bus.on("task.status_changed", (e) => { events.push(e.type); });

    const task = await create.execute({ title: "Evento status" });
    await move.execute({ id: task.id, newStatus: "in_progress" });
    await new Promise((r) => setTimeout(r, 0));

    expect(events).toContain("task.status_changed");
  });
});

describe("CompleteTask y RestoreTask", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let complete: CompleteTask;
  let restore: RestoreTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    complete = new CompleteTask(repo, bus);
    restore = new RestoreTask(repo, bus);
  });

  it("completa una tarea y establece completedAt", async () => {
    const task = await create.execute({ title: "Completar" });
    const done = await complete.execute(task.id);

    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();
  });

  it("restaura una tarea completada al estado todo", async () => {
    const task = await create.execute({ title: "Restaurar" });
    await complete.execute(task.id);
    const restored = await restore.execute(task.id);

    expect(restored.status).toBe("todo");
    expect(restored.completedAt).toBeNull();
  });

  it("lanza error al completar una tarea ya completada", async () => {
    const task = await create.execute({ title: "Ya done" });
    await complete.execute(task.id);

    await expect(complete.execute(task.id)).rejects.toThrow();
  });
});

describe("AddSubtask", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let addSubtask: AddSubtask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    addSubtask = new AddSubtask(repo);
  });

  it("añade una subtarea a una tarea existente", async () => {
    const task = await create.execute({ title: "Con subtareas" });
    const sub = await addSubtask.execute({
      taskId: task.id,
      title: "Paso 1",
    });

    expect(sub.taskId).toBe(task.id);
    expect(sub.title).toBe("Paso 1");
    expect(sub.completed).toBe(false);
  });

  it("lanza error si la tarea padre no existe", async () => {
    await expect(
      addSubtask.execute({ taskId: "inexistente", title: "Sub" })
    ).rejects.toThrow();
  });
});

describe("AttachCodeToTask", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let create: CreateTask;
  let attach: AttachCodeToTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    create = new CreateTask(repo, bus);
    attach = new AttachCodeToTask(repo);
  });

  it("adjunta un fragmento de código con metadatos", async () => {
    const task = await create.execute({ title: "Con código" });
    const snippet = await attach.execute({
      taskId: task.id,
      content: "const x = 1;",
      language: "typescript",
      filePath: "src/index",
      lineStart: 10,
      lineEnd: 10,
    });

    expect(snippet.taskId).toBe(task.id);
    expect(snippet.language).toBe("typescript");
    expect(snippet.lineStart).toBe(10);
  });
});

describe("GetTaskHistory", () => {
  it("retorna el historial de una tarea", async () => {
    const historyRepo = new InMemoryHistoryRepository();
    const useCase = new GetTaskHistory(historyRepo);

    await historyRepo.save(
      HistoryEntry.reconstitute({
        id: "h1",
        entityType: "task",
        entityId: "task-1",
        action: "create",
        fieldName: null,
        oldValue: null,
        newValue: null,
        createdAt: new Date(),
      })
    );

    const history = await useCase.execute("task-1");
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("create");
  });

  it("retorna array vacío si no hay historial", async () => {
    const historyRepo = new InMemoryHistoryRepository();
    const useCase = new GetTaskHistory(historyRepo);

    const history = await useCase.execute("sin-historia");
    expect(history).toHaveLength(0);
  });
});
