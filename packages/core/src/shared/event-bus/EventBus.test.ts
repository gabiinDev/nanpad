import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus, createEvent } from "./EventBus";
import type { AppEvent } from "./types";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("registra un handler y lo invoca al emitir el evento", () => {
    const handler = vi.fn();
    bus.on("test.event", handler);

    bus.emit(createEvent("test.event", { value: 42 }));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "test.event", payload: { value: 42 } })
    );
  });

  it("no invoca handlers de otros tipos de evento", () => {
    const handler = vi.fn();
    bus.on("test.a", handler);

    bus.emit(createEvent("test.b", {}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("invoca múltiples handlers del mismo tipo", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("multi.event", h1);
    bus.on("multi.event", h2);

    bus.emit(createEvent("multi.event", {}));

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("cancela suscripción mediante función retornada por on()", () => {
    const handler = vi.fn();
    const unsubscribe = bus.on("cancel.event", handler);

    unsubscribe();
    bus.emit(createEvent("cancel.event", {}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("cancela suscripción mediante off()", () => {
    const handler = vi.fn();
    bus.on("off.event", handler);
    bus.off("off.event", handler);

    bus.emit(createEvent("off.event", {}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("no falla al emitir un evento sin handlers registrados", () => {
    expect(() => bus.emit(createEvent("no.handlers", {}))).not.toThrow();
  });

  it("emitAsync invoca handlers de forma asíncrona (fire-and-forget)", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.on("async.event", handler);

    bus.emitAsync(createEvent("async.event", { data: "hello" }));

    // El handler no se ha llamado todavía (es async)
    expect(handler).not.toHaveBeenCalled();

    // Esperamos a que las microtareas se resuelvan
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("createEvent genera un evento con timestamp ISO", () => {
    const event: AppEvent = createEvent("test", { key: "val" });

    expect(event.type).toBe("test");
    expect(event.payload).toEqual({ key: "val" });
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();
  });

  it("clear() elimina todos los handlers", () => {
    const handler = vi.fn();
    bus.on("clear.event", handler);
    bus.clear();

    bus.emit(createEvent("clear.event", {}));

    expect(handler).not.toHaveBeenCalled();
  });
});
