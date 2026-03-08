/**
 * Tests para badges de estado y prioridad.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getStatusLabel, StatusBadge, PriorityBadge } from "./Badge";

describe("getStatusLabel", () => {
  it("devuelve etiqueta en español para cada estado conocido", () => {
    expect(getStatusLabel("todo")).toBe("Por hacer");
    expect(getStatusLabel("in_progress")).toBe("En progreso");
    expect(getStatusLabel("done")).toBe("Hecho");
    expect(getStatusLabel("archived")).toBe("Archivado");
  });

  it("devuelve el mismo string si el estado no está en el config", () => {
    expect(getStatusLabel("unknown")).toBe("unknown");
  });
});

describe("StatusBadge", () => {
  it("renderiza la etiqueta del estado", () => {
    render(<StatusBadge status="todo" />);
    expect(screen.getByText("Por hacer")).toBeInTheDocument();
  });

  it("renderiza para estado done", () => {
    render(<StatusBadge status="done" />);
    expect(screen.getByText("Hecho")).toBeInTheDocument();
  });
});

describe("PriorityBadge", () => {
  it("renderiza la etiqueta de prioridad media por defecto", () => {
    render(<PriorityBadge priority={1} />);
    expect(screen.getByText("media")).toBeInTheDocument();
  });

  it("renderiza etiqueta para prioridad crítica", () => {
    render(<PriorityBadge priority={3} />);
    expect(screen.getByText("crítica")).toBeInTheDocument();
  });
});
