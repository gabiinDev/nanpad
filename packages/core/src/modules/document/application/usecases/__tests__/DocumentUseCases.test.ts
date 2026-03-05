/**
 * Tests unitarios de los UseCases del módulo Document.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@shared/event-bus/EventBus";
import { CreateDocument } from "../CreateDocument";
import { UpdateDocument } from "../UpdateDocument";
import { GetDocument } from "../GetDocument";
import { ListDocuments } from "../ListDocuments";
import { DeleteDocument } from "../DeleteDocument";
import { InMemoryDocumentRepository } from "./fakes";

describe("CreateDocument", () => {
  let repo: InMemoryDocumentRepository;
  let eventBus: EventBus;
  let createDocument: CreateDocument;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    eventBus = new EventBus();
    createDocument = new CreateDocument(repo, eventBus);
  });

  it("creates a document with title and empty content by default", async () => {
    const dto = await createDocument.execute({ title: "My Doc" });

    expect(dto.title).toBe("My Doc");
    expect(dto.content).toBe("");
    expect(dto.id).toBeDefined();
    expect(dto.createdAt).toBeDefined();
  });

  it("creates a document with provided content", async () => {
    const dto = await createDocument.execute({
      title: "With Content",
      content: "# Hello\nWorld",
    });

    expect(dto.content).toBe("# Hello\nWorld");
    expect(dto.contentHash).toBeDefined();
  });

  it("persists the document in the repository", async () => {
    await createDocument.execute({ title: "Saved" });
    expect(repo.getAll()).toHaveLength(1);
  });

  it("throws when title is empty", async () => {
    await expect(createDocument.execute({ title: "  " })).rejects.toThrow(
      "[Document] El título no puede estar vacío."
    );
  });

  it("emits document.created event", async () => {
    const events: string[] = [];
    eventBus.on("document.created", () => { events.push("document.created"); });

    await createDocument.execute({ title: "Event Doc" });
    await new Promise((r) => setTimeout(r, 0));

    expect(events).toContain("document.created");
  });

  it("trims whitespace from title", async () => {
    const dto = await createDocument.execute({ title: "  Trimmed  " });
    expect(dto.title).toBe("Trimmed");
  });
});

describe("UpdateDocument", () => {
  let repo: InMemoryDocumentRepository;
  let eventBus: EventBus;
  let createDocument: CreateDocument;
  let updateDocument: UpdateDocument;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    eventBus = new EventBus();
    createDocument = new CreateDocument(repo, eventBus);
    updateDocument = new UpdateDocument(repo, eventBus);
  });

  it("updates the title", async () => {
    const created = await createDocument.execute({ title: "Old Title" });
    const updated = await updateDocument.execute({
      id: created.id,
      title: "New Title",
    });

    expect(updated.title).toBe("New Title");
    expect(updated.id).toBe(created.id);
  });

  it("updates the content and recalculates contentHash", async () => {
    const created = await createDocument.execute({ title: "Doc", content: "Old" });
    const updated = await updateDocument.execute({
      id: created.id,
      content: "New content",
    });

    expect(updated.content).toBe("New content");
    expect(updated.contentHash).not.toBe(created.contentHash);
  });

  it("preserves fields not included in update", async () => {
    const created = await createDocument.execute({ title: "Doc", content: "Keep" });
    const updated = await updateDocument.execute({
      id: created.id,
      title: "New Title",
    });

    expect(updated.content).toBe("Keep");
  });

  it("throws when document does not exist", async () => {
    await expect(
      updateDocument.execute({ id: "nonexistent", title: "X" })
    ).rejects.toThrow("[UpdateDocument] Documento no encontrado");
  });

  it("throws when updated title is empty", async () => {
    const created = await createDocument.execute({ title: "Valid" });
    await expect(
      updateDocument.execute({ id: created.id, title: "  " })
    ).rejects.toThrow("[Document] El título no puede estar vacío.");
  });
});

describe("GetDocument", () => {
  let repo: InMemoryDocumentRepository;
  let eventBus: EventBus;
  let createDocument: CreateDocument;
  let getDocument: GetDocument;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    eventBus = new EventBus();
    createDocument = new CreateDocument(repo, eventBus);
    getDocument = new GetDocument(repo);
  });

  it("returns the document with content", async () => {
    const created = await createDocument.execute({
      title: "Read Me",
      content: "# Content",
    });

    const result = await getDocument.execute({ id: created.id });

    expect(result.id).toBe(created.id);
    expect(result.content).toBe("# Content");
  });

  it("throws when document does not exist", async () => {
    await expect(getDocument.execute({ id: "ghost" })).rejects.toThrow(
      "[GetDocument] Documento no encontrado"
    );
  });
});

describe("ListDocuments", () => {
  let repo: InMemoryDocumentRepository;
  let eventBus: EventBus;
  let createDocument: CreateDocument;
  let listDocuments: ListDocuments;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    eventBus = new EventBus();
    createDocument = new CreateDocument(repo, eventBus);
    listDocuments = new ListDocuments(repo);
  });

  it("returns empty array when no documents exist", async () => {
    const result = await listDocuments.execute();
    expect(result).toHaveLength(0);
  });

  it("lists all documents without content", async () => {
    await createDocument.execute({ title: "Doc A", content: "Content A" });
    await createDocument.execute({ title: "Doc B", content: "Content B" });

    const result = await listDocuments.execute();

    expect(result).toHaveLength(2);
    // Los DTOs de lista no tienen 'content'
    expect("content" in result[0]).toBe(false);
  });

  it("filters by text in title", async () => {
    await createDocument.execute({ title: "Architecture Guide" });
    await createDocument.execute({ title: "Meeting Notes" });

    const result = await listDocuments.execute({ text: "Architecture" });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Architecture Guide");
  });
});

describe("DeleteDocument", () => {
  let repo: InMemoryDocumentRepository;
  let eventBus: EventBus;
  let createDocument: CreateDocument;
  let deleteDocument: DeleteDocument;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    eventBus = new EventBus();
    createDocument = new CreateDocument(repo, eventBus);
    deleteDocument = new DeleteDocument(repo, eventBus);
  });

  it("deletes an existing document", async () => {
    const created = await createDocument.execute({ title: "To Delete" });
    await deleteDocument.execute(created.id);

    expect(repo.getAll()).toHaveLength(0);
  });

  it("throws when document does not exist", async () => {
    await expect(deleteDocument.execute("nonexistent")).rejects.toThrow(
      "[DeleteDocument] Documento no encontrado"
    );
  });

  it("emits document.deleted event", async () => {
    const events: string[] = [];
    eventBus.on("document.deleted", () => { events.push("document.deleted"); });

    const created = await createDocument.execute({ title: "Bye" });
    await deleteDocument.execute(created.id);

    await new Promise((r) => setTimeout(r, 0));
    expect(events).toContain("document.deleted");
  });
});

describe("Document entity", () => {
  it("generates different contentHash for different content", async () => {
    const repo = new InMemoryDocumentRepository();
    const eventBus = new EventBus();
    const createDocument = new CreateDocument(repo, eventBus);

    const docA = await createDocument.execute({ title: "A", content: "Hello" });
    const docB = await createDocument.execute({ title: "B", content: "World" });

    expect(docA.contentHash).not.toBe(docB.contentHash);
  });

  it("generates same contentHash for same content", async () => {
    const repo = new InMemoryDocumentRepository();
    const eventBus = new EventBus();
    const createDocument = new CreateDocument(repo, eventBus);
    const updateDocument = new UpdateDocument(repo, eventBus);

    const created = await createDocument.execute({ title: "Doc", content: "Same" });
    const updated = await updateDocument.execute({
      id: created.id,
      content: "Same",
    });

    expect(updated.contentHash).toBe(created.contentHash);
  });
});
