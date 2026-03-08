/**
 * Tests del componente Spinner.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("tiene role status y aria-label para accesibilidad", () => {
    render(<Spinner />);
    const el = screen.getByRole("status", { name: "Cargando" });
    expect(el).toBeInTheDocument();
  });

  it("acepta className y lo aplica al contenedor", () => {
    render(<Spinner className="mi-clase" />);
    const el = screen.getByRole("status", { name: "Cargando" });
    expect(el).toHaveClass("mi-clase");
  });
});
