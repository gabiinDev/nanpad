/**
 * API pública del módulo Document.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases ────────────────────────────────────────────────────────────────
export { CreateDocument } from "./usecases/CreateDocument";
export { UpdateDocument } from "./usecases/UpdateDocument";
export { GetDocument } from "./usecases/GetDocument";
export { ListDocuments } from "./usecases/ListDocuments";
export { DeleteDocument } from "./usecases/DeleteDocument";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export type {
  DocumentDTO,
  DocumentWithContentDTO,
  CreateDocumentInput,
  UpdateDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
} from "./dtos/DocumentDTO";

// ─── Contrato del repositorio ─────────────────────────────────────────────────
export type { IDocumentRepository } from "../infrastructure/persistence/DocumentRepository";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { DocumentSqliteRepository } from "../infrastructure/persistence/sqlite/DocumentSqliteRepository";
