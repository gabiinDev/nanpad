/**
 * Componente raíz de NANPAD.
 * Composition Root: abre la DB, aplica migraciones, construye el grafo
 * de dependencias y monta el Shell con el contexto React.
 */

import { useEffect, useState } from "react";
import { runMigrations } from "@nanpad/core";
import { SqliteAdapter } from "@/infrastructure/SqliteAdapter.ts";
import { buildComposition, type AppUseCases } from "@app/composition.ts";
import { AppProvider } from "@app/AppContext.tsx";
import Shell from "@app/Shell.tsx";

type AppState = "loading" | "ready" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [useCases, setUseCases] = useState<AppUseCases | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    SqliteAdapter.open()
      .then(async (db) => {
        await runMigrations(db);
        return buildComposition(db);
      })
      .then((uc) => {
        setUseCases(uc);
        setState("ready");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[App] Error al inicializar:", msg);
        setErrorMsg(msg);
        setState("error");
      });
  }, []);

  if (state === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="mb-3 text-2xl font-bold text-[var(--color-text-primary)]">
            NANPAD
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            Inicializando…
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)]">
        <div className="max-w-md text-center">
          <div className="mb-3 text-xl font-semibold text-[var(--color-priority-critical)]">
            Error al iniciar NANPAD
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider useCases={useCases!}>
      <Shell />
    </AppProvider>
  );
}
