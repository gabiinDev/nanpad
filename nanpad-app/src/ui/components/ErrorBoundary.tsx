/**
 * Error Boundary para capturar errores en el árbol de componentes
 * y mostrar una vista de fallback en lugar de dejar la app rota.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Vista a mostrar cuando hay error. */
  fallback?: ReactNode;
  /** Callback al capturar error (p. ej. para logging). */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    if (typeof console !== "undefined" && console.error) {
      console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="flex flex-col items-center justify-center gap-4 p-8 text-center"
          style={{ minHeight: "200px", background: "var(--color-surface-2)" }}
        >
          <p className="text-base font-semibold text-[var(--color-priority-high)]">
            Algo salió mal
          </p>
          <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)]"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
