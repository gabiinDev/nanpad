/**
 * Tests del store de toasts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "./useToastStore";

describe("useToastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("inicialmente no tiene toasts", () => {
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("toast añade un toast con message y type por defecto success", () => {
    useToastStore.getState().toast("Guardado correctamente");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Guardado correctamente");
    expect(toasts[0].type).toBe("success");
  });

  it("toast con type explícito lo asigna", () => {
    useToastStore.getState().toast("Cuidado", "warning");
    expect(useToastStore.getState().toasts[0].type).toBe("warning");
  });

  it("dismiss elimina el toast por id", () => {
    useToastStore.getState().toast("Uno");
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("varios toasts tienen ids distintos", () => {
    useToastStore.getState().toast("A");
    useToastStore.getState().toast("B");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });
});
