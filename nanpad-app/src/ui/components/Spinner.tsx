/**
 * Spinner de carga — usa FontAwesome faSpinner con animación.
 */
import { IconSpinner } from "@ui/icons/index.tsx";

/** Indicador de carga animado. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={className}
      style={{ color: "var(--color-accent)", fontSize: "20px" }}
    >
      <IconSpinner size={20} />
    </span>
  );
}
