import { describe, it, expect, beforeEach } from "vitest";
import { CreateTask } from "../CreateTask";
import { EventBus } from "@shared/event-bus/EventBus";
import { InMemoryTaskRepository } from "./fakes";

describe("CreateTask", () => {
  let repo: InMemoryTaskRepository;
  let bus: EventBus;
  let useCase: CreateTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    bus = new EventBus();
    useCase = new CreateTask(repo, bus);
  });

  it("crea una tarea con título y estado por defecto 'todo'", async () => {
    const dto = await useCase.execute({ title: "Mi primera tarea" });

    expect(dto.title).toBe("Mi primera tarea");
    expect(dto.status).toBe("todo");
    expect(dto.priority).toBe(1);
    expect(dto.id).toBeTruthy();
  });

  it("persiste la tarea en el repositorio", async () => {
    const dto = await useCase.execute({ title: "Tarea persistida" });
    const found = await repo.findById(dto.id);

    expect(found).not.toBeNull();
    expect(found!.title).toBe("Tarea persistida");
  });

  it("asigna la prioridad indicada", async () => {
    const dto = await useCase.execute({ title: "Urgente", priority: 3 });
    expect(dto.priority).toBe(3);
  });

  it("asigna categoryIds y tagIds", async () => {
    const dto = await useCase.execute({
      title: "Con categoría",
      categoryIds: ["cat-1"],
      tagIds: ["tag-1"],
    });

    expect(dto.categoryIds).toEqual(["cat-1"]);
    expect(dto.tagIds).toEqual(["tag-1"]);
  });

  it("emite el evento 'task.created'", async () => {
    const events: string[] = [];
    bus.on("task.created", (e) => { events.push(e.type); });

    await useCase.execute({ title: "Con evento" });
    await new Promise((r) => setTimeout(r, 0));

    expect(events).toContain("task.created");
  });

  it("lanza error si el título está vacío", async () => {
    await expect(useCase.execute({ title: "   " })).rejects.toThrow();
  });
});
