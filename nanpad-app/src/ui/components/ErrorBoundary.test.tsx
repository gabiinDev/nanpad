/**
 * Tests del Error Boundary.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

/** Componente que lanza en render para simular error. */
function Thrower({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("renderiza los children cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <span>Contenido normal</span>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenido normal")).toBeInTheDocument();
  });

  it("muestra el fallback por defecto cuando un hijo lanza", () => {
    render(
      <ErrorBoundary>
        <Thrower message="Error de prueba" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText("Error de prueba")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("muestra el fallback personalizado cuando se proporciona", () => {
    render(
      <ErrorBoundary fallback={<div>Vista de error custom</div>}>
        <Thrower message="Fallo" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Vista de error custom")).toBeInTheDocument();
    expect(screen.queryByText("Algo salió mal")).not.toBeInTheDocument();
  });

  it("llama onError al capturar el error", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Thrower message="Para logging" />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
    expect((onError.mock.calls[0][0] as Error).message).toBe("Para logging");
  });

  it("Reintentar vuelve a mostrar los children tras resetear estado", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Thrower message="Error" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <span>Recuperado</span>
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("Recuperado")).toBeInTheDocument();
  });
});
