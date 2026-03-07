/**
 * Página de documentos: lista lateral + editor Monaco split.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useDocumentStore } from "@/store/useDocumentStore.ts";
import { DocumentEditor } from "./components/DocumentEditor.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";
import { IconClose } from "@ui/icons/index.tsx";

interface DocumentsPageProps {
  isDark: boolean;
}

export default function DocumentsPage({ isDark }: DocumentsPageProps) {
  const uc = useApp();
  const {
    documents,
    activeDocument,
    loading,
    saving,
    loadDocuments,
    openDocument,
    createDocument,
    saveDocument,
    deleteDocument,
  } = useDocumentStore();

  const [creatingTitle, setCreatingTitle] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    void loadDocuments(uc);
  }, [uc]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreate = async () => {
    const title = creatingTitle.trim();
    if (!title) return;
    const doc = await createDocument(uc, title, "");
    setCreatingTitle("");
    setShowNewForm(false);
    await openDocument(uc, doc.id);
  };

  const handleSave = useCallback(
    (content: string, title?: string) => {
      if (!activeDocument) return;
      void saveDocument(uc, activeDocument.id, content, title);
    },
    [uc, activeDocument, saveDocument]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
    await deleteDocument(uc, id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Panel lateral: lista de documentos ─────────────────────── */}
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--color-border)]">
        {/* Buscador */}
        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          <input
            type="search"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); }}
            placeholder="Buscar…"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && documents.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const active = activeDocument?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`group flex items-center gap-1 px-3 py-2 cursor-pointer transition-colors ${
                    active
                      ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                      : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  }`}
                  onClick={() => { void openDocument(uc, doc.id); }}
                >
                  <span className="flex-1 truncate text-xs font-medium">{doc.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDelete(doc.id); }}
                    aria-label="Eliminar documento"
                    className="hidden rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-priority-critical)] group-hover:flex transition-colors"
                  >
                    <IconClose size={12} />
                  </button>
                </div>
              );
            })
          )}

          {!loading && filteredDocs.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
              {searchText ? "Sin resultados" : "Sin documentos"}
            </p>
          )}
        </div>

        {/* Botón nuevo / formulario inline */}
        <div className="border-t border-[var(--color-border)] p-2">
          {showNewForm ? (
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={creatingTitle}
                onChange={(e) => { setCreatingTitle(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") { setShowNewForm(false); setCreatingTitle(""); }
                }}
                placeholder="Título del documento"
                className="flex-1 min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              />
              <button
                onClick={() => { void handleCreate(); }}
                className="rounded bg-[var(--color-accent)] px-2 py-1 text-xs font-bold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                ✓
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowNewForm(true); }}
              className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <span className="text-base leading-none">+</span> Nuevo documento
            </button>
          )}
        </div>
      </aside>

      {/* ─── Editor ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {loading && !activeDocument ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
            <Spinner />
            <span className="text-sm">Cargando documento…</span>
          </div>
        ) : activeDocument ? (
          <DocumentEditor
            key={activeDocument.id}
            document={activeDocument}
            isDark={isDark}
            saving={saving}
            onSave={handleSave}
            onTitleChange={(title) => { handleSave(activeDocument.content, title); }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
            <span className="text-4xl opacity-30">📄</span>
            <p className="text-sm">Selecciona o crea un documento</p>
          </div>
        )}
      </div>
    </div>
  );
}
