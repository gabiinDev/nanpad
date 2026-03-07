/**
 * Checkbox estilizado para subtareas — coherente con la UI Technical Noir.
 * Acepta id opcional para asociar un <label> en el padre y que el click en el texto marque/desmarque.
 */

import { IconCheck } from "@ui/icons/index.tsx";

interface SubtaskCheckboxProps {
  /** Id del input oculto; si se pasa, el padre debe usar <label htmlFor={id}> en el texto de la subtarea. */
  id?: string;
  checked: boolean;
  onChange: () => void;
  "aria-label": string;
}

/**
 * Checkbox visual para subtareas (borde, acento al marcar, sin fondo blanco).
 * Incluye un input nativo oculto cuando se pasa id, para que <label htmlFor={id}> sea accesible.
 */
export function SubtaskCheckbox({ id, checked, onChange, "aria-label": ariaLabel }: SubtaskCheckboxProps) {
  return (
    <>
      {id != null && (
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange();
          }}
          className="sr-only"
          tabIndex={-1}
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange();
        }}
        aria-label={ariaLabel}
        aria-pressed={checked}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150"
        style={{
          border: checked
            ? "1px solid var(--color-status-done)"
            : "1px solid var(--color-border-strong)",
          background: checked ? "var(--color-status-done)" : "var(--color-surface)",
          color: checked ? "var(--color-surface)" : "transparent",
          cursor: "pointer",
        }}
      >
        {checked && (
          <span style={{ fontSize: "8px", lineHeight: 1 }}>
            <IconCheck size={10} />
          </span>
        )}
      </button>
    </>
  );
}
