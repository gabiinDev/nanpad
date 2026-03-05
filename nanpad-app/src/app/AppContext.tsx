/**
 * Contexto React de NANPAD.
 * Distribuye los UseCases del Composition Root a cualquier componente.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { AppUseCases } from "./composition.ts";

const AppContext = createContext<AppUseCases | null>(null);

/**
 * Proveedor que recibe el resultado de buildComposition y lo expone al árbol.
 */
export function AppProvider({
  useCases,
  children,
}: {
  useCases: AppUseCases;
  children: ReactNode;
}) {
  return (
    <AppContext.Provider value={useCases}>{children}</AppContext.Provider>
  );
}

/**
 * Hook para acceder a los UseCases desde cualquier componente.
 * @throws Si se usa fuera de AppProvider.
 */
export function useApp(): AppUseCases {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp debe usarse dentro de <AppProvider>");
  }
  return ctx;
}
