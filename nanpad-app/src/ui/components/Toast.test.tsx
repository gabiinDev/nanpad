/**
 * Tests del contenedor de toasts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastContainer } from "./Toast";
import { useToastStore } from "@/store/useToastStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });
  it("no renderiza nada cuando no hay toasts", () => {
    useToastStore.setState({ toasts: [] });
    render(<ToastContainer />);
    expect(screen.queryByRole("region", { name: "Notificaciones" })).toBeNull();
  });

  it("renderiza un toast con el mensaje y region accesible", () => {
    useToastStore.setState({
      toasts: [{ id: "t1", message: "Guardado", type: "success" }],
    });
    render(<ToastContainer />);
    const region = screen.getByRole("region", { name: "Notificaciones" });
    expect(region).toBeInTheDocument();
    expect(screen.getByText("Guardado")).toBeInTheDocument();
  });

  it("al hacer click en un toast lo cierra", () => {
    useToastStore.setState({
      toasts: [{ id: "t1", message: "Cerrar", type: "info" }],
    });
    render(<ToastContainer />);
    const btn = screen.getByRole("button", { name: /Cerrar/ });
    fireEvent.click(btn);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
