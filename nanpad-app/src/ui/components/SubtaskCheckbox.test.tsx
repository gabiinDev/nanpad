/**
 * Tests del checkbox de subtareas.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubtaskCheckbox } from "./SubtaskCheckbox";

describe("SubtaskCheckbox", () => {
  it("renderiza con aria-label y aria-pressed según checked", () => {
    render(
      <SubtaskCheckbox
        checked={false}
        onChange={() => {}}
        aria-label="Completar subtarea"
      />
    );
    const btn = screen.getByRole("button", { name: "Completar subtarea" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("muestra aria-pressed true cuando está marcado", () => {
    render(
      <SubtaskCheckbox
        checked={true}
        onChange={() => {}}
        aria-label="Completar subtarea"
      />
    );
    const btn = screen.getByRole("button", { name: "Completar subtarea" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("llama onChange al hacer click en el botón", () => {
    const onChange = vi.fn();
    render(
      <SubtaskCheckbox
        checked={false}
        onChange={onChange}
        aria-label="Toggle"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cuando tiene id, renderiza un input checkbox oculto con ese id", () => {
    render(
      <SubtaskCheckbox
        id="sub-1"
        checked={false}
        onChange={() => {}}
        aria-label="Sub"
      />
    );
    const input = document.getElementById("sub-1");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "checkbox");
    expect(input).toHaveClass("sr-only");
  });
});
