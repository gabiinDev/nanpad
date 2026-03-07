/**
 * Drawer lateral derecho para ABM de categorías.
 * Misma estructura que TaskDrawer: overlay + panel deslizable por la derecha.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CategoryDTO } from "@nanpad/core";
import type { AppUseCases } from "@app/composition.ts";
import { IconClose } from "@ui/icons/index.tsx";
import { CategoriesSection } from "./CategoriesSection.tsx";

interface CategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  uc: AppUseCases;
  categories: CategoryDTO[];
  loadCategories: (uc: AppUseCases) => Promise<void>;
}

export function CategoriesDrawer({
  isOpen,
  onClose,
  uc,
  categories,
  loadCategories,
}: CategoriesDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const drawerContent = (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        style={{ animation: "none" }}
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)] animate-drawer-in"
        style={{ willChange: "transform" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h2
            id="categories-drawer-title"
            className="text-base font-semibold text-[var(--color-text-primary)]"
          >
            Gestionar categorías
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CategoriesSection
            uc={uc}
            categories={categories}
            loadCategories={loadCategories}
            onCloseRequest={onClose}
          />
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
