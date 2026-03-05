/**
 * TaskSearchBar — buscador de tareas en tiempo real.
 *
 * Filtra por título, descripción o prioridad (texto) sobre las tareas
 * visibles en la vista actual (lista o kanban). El componente es un
 * input controlado; la query se propaga hacia arriba para que TasksPage
 * pueda aplicarla como filtro adicional antes de pasar las tareas a las vistas.
 */

import { useCallback, useRef, useState } from "react";
import type { TaskDTO } from "@nanpad/core";
import { IconSearch, IconClose } from "@ui/icons/index.tsx";

// ── Helpers de prioridad ──────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<number, string[]> = {
  0: ["sin prioridad", "ninguna", "0"],
  1: ["baja", "low", "1"],
  2: ["media", "medium", "normal", "2"],
  3: ["alta", "high", "crítica", "3"],
};

/**
 * Comprueba si una tarea coincide con la query de búsqueda.
 * Busca en: título, descripción y etiqueta de prioridad.
 * @param task - Tarea a evaluar.
 * @param query - Texto ingresado por el usuario (ya en minúsculas).
 */
export function taskMatchesQuery(task: TaskDTO, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (task.title.toLowerCase().includes(q)) return true;
  if (task.description?.toLowerCase().includes(q)) return true;
  const labels = PRIORITY_LABELS[task.priority] ?? [];
  if (labels.some((l) => l.includes(q))) return true;
  return false;
}

// ── Componente ────────────────────────────────────────────────────────────────

interface TaskSearchBarProps {
  /** Query actual. */
  query: string;
  /** Callback cuando cambia el texto. */
  onChange: (q: string) => void;
  /** Número de resultados actuales (para el hint). */
  resultCount?: number;
}

/**
 * Barra de búsqueda para tareas.
 * Diseño minimalista coherente con el header de la app.
 */
export function TaskSearchBar({ query, onChange, resultCount }: TaskSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const showCount = query.length > 0 && resultCount !== undefined;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "260px",
        flexShrink: 0,
      }}
    >
      {/* Icono lupa */}
      <span
        style={{
          position: "absolute",
          left: "10px",
          color: focused ? "var(--color-accent)" : "var(--color-text-muted)",
          pointerEvents: "none",
          transition: "color 0.15s ease",
          lineHeight: 0,
        }}
      >
        <IconSearch size={13} />
      </span>

      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Buscar tareas…"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: "30px",
          paddingLeft: "30px",
          paddingRight: query ? "56px" : "10px",
          fontSize: "13px",
          background: focused ? "var(--color-surface)" : "var(--color-surface-2)",
          border: `1px solid ${focused ? "var(--color-accent)" : "var(--color-border)"}`,
          borderRadius: "7px",
          color: "var(--color-text-primary)",
          outline: "none",
          transition: "all 0.15s ease",
          boxShadow: focused ? `0 0 0 2px var(--color-accent-subtle)` : "none",
        }}
      />

      {/* Contador de resultados */}
      {showCount && (
        <span
          style={{
            position: "absolute",
            right: query ? "28px" : "10px",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            pointerEvents: "none",
            transition: "opacity 0.15s ease",
          }}
        >
          {resultCount}
        </span>
      )}

      {/* Botón limpiar */}
      {query && (
        <button
          onClick={handleClear}
          title="Limpiar búsqueda"
          style={{
            position: "absolute",
            right: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            border: "none",
            background: "var(--color-surface-hover)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: 0,
            transition: "all 0.1s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-border-strong)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
          }}
        >
          <IconClose size={8} />
        </button>
      )}
    </div>
  );
}
