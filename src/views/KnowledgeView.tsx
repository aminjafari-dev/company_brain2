import React, { useMemo, useRef, useState } from 'react';
import { KnowledgeCategory, KnowledgeDocument, TabType } from '../types';

interface KnowledgeViewProps {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
  onNavigateTab: (tab: TabType) => void;
  onAddDocument: (input: {
    categoryId: string;
    title: string;
    notes?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    content?: string;
  }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
}

const COMING_SOON_SOURCES = [
  { id: 'jira', name: 'Jira', icon: 'integration_instructions', note: 'Issue indexing' },
  { id: 'github', name: 'GitHub', icon: 'code', note: 'Repository sync' },
  { id: 'notion', name: 'Notion', icon: 'description', note: 'Workspace pages' },
  { id: 'confluence', name: 'Confluence', icon: 'folder_shared', note: 'Wiki sync' },
] as const;

const TEXT_FILE_RE =
  /\.(txt|md|markdown|json|csv|tsv|yml|yaml|xml|html|css|js|ts|tsx|jsx|py|rb|go|rs|java|kt|swift|sql|sh|env|log)$/i;
const MAX_TEXT_BYTES = 400_000;

function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  categories,
  documents,
  onNavigateTab,
  onAddDocument,
  onDeleteDocument,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formHint, setFormHint] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'business');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [fileMeta, setFileMeta] = useState<{
    fileName: string;
    fileType: string;
    fileSize: number;
    content?: string;
  } | null>(null);

  const totalDocuments = documents.length;

  const visibleDocs = useMemo(() => {
    if (!selectedCategory) return documents;
    return documents.filter((d) => d.categoryId === selectedCategory);
  }, [documents, selectedCategory]);

  const selectedCategoryMeta = categories.find((c) => c.id === selectedCategory);

  const openAddModal = (prefillCategory?: string) => {
    setCategoryId(prefillCategory ?? selectedCategory ?? categories[0]?.id ?? 'business');
    setTitle('');
    setNotes('');
    setFileMeta(null);
    setFormError(null);
    setFormHint(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
    setFormError(null);
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setFileMeta(null);
      setFormHint(null);
      return;
    }

    const base = {
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };

    if (file.size > MAX_TEXT_BYTES) {
      setFileMeta(base);
      setFormError(null);
      setFormHint(
        `“${file.name}” is stored as a file reference only (over ${(MAX_TEXT_BYTES / 1024).toFixed(0)} KB). Add notes if you want searchable text.`
      );
      return;
    }

    if (TEXT_FILE_RE.test(file.name) || file.type.startsWith('text/')) {
      try {
        const content = await file.text();
        setFileMeta({ ...base, content });
        setFormError(null);
        setFormHint(null);
        if (!title.trim()) {
          setTitle(file.name.replace(/\.[^.]+$/, ''));
        }
        return;
      } catch {
        setFileMeta(base);
        setFormError(null);
        setFormHint('Could not read file text. File name will still be saved.');
        return;
      }
    }

    setFileMeta(base);
    setFormError(null);
    setFormHint(
      `Binary file “${file.name}” saved as a reference. Paste key content in Notes for AI use later.`
    );
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }
    if (!categoryId) {
      setFormError('Choose a category.');
      return;
    }
    if (!notes.trim() && !fileMeta) {
      setFormError('Add notes or upload a document.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onAddDocument({
        categoryId,
        title: trimmedTitle,
        notes: notes.trim() || undefined,
        fileName: fileMeta?.fileName,
        fileType: fileMeta?.fileType,
        fileSize: fileMeta?.fileSize,
        content: fileMeta?.content ?? (notes.trim() || undefined),
      });
      setShowAddModal(false);
      setSelectedCategory(categoryId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#191c1e] mb-1">Company Knowledge</h1>
          <p className="text-[15px] text-[#45464d]">
            Manually add business, product, and engineering context your team wants the AI to use.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddModal()}
          className="shrink-0 bg-[#000000] text-white px-4 py-2.5 rounded text-[14px] font-medium hover:bg-[#2d3133] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          Add knowledge
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Manual documents
          </span>
          <span className="text-[20px] font-semibold text-[#191c1e]">{totalDocuments}</span>
        </div>
        <div className="bg-white border border-dashed border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs opacity-80">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Jira issues
          </span>
          <span className="text-[14px] font-medium text-[#76777d]">Coming soon</span>
        </div>
        <div className="bg-white border border-dashed border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs opacity-80">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Repositories
          </span>
          <span className="text-[14px] font-medium text-[#76777d]">Coming soon</span>
        </div>
        <div className="bg-white border border-dashed border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs opacity-80">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Auto indexing
          </span>
          <span className="text-[14px] font-medium text-[#76777d]">Coming soon</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-[#c6c6cd]/60 pb-2">
              <h2 className="text-[20px] font-semibold text-[#191c1e]">Knowledge Categories</h2>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-[13px] text-[#4648d4] hover:underline cursor-pointer"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`bg-white border rounded-lg p-4 transition-all flex flex-col h-full shadow-2xs ${
                    selectedCategory === cat.id
                      ? 'border-[#6063ee] ring-2 ring-[#e1e0ff]'
                      : 'border-[#c6c6cd]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                    }
                    className="text-left cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded bg-[#eceef0] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#76777d] group-hover:text-[#6063ee] transition-colors">
                          {cat.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-[#191c1e]">{cat.title}</h3>
                        <span className="text-[11px] text-[#76777d]">
                          {cat.documentCount === 0
                            ? 'No documents yet'
                            : `${cat.documentCount} document${cat.documentCount === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    </div>
                    <p className="text-[14px] text-[#45464d]">{cat.description}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddModal(cat.id)}
                    className="mt-3 self-start text-[13px] font-medium text-[#4648d4] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add to {cat.title}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center mb-4 border-b border-[#c6c6cd]/60 pb-2">
              <h2 className="text-[20px] font-semibold text-[#191c1e]">
                {selectedCategoryMeta
                  ? `${selectedCategoryMeta.title} documents`
                  : 'All documents'}
              </h2>
            </div>

            {visibleDocs.length === 0 ? (
              <div className="bg-white border border-dashed border-[#c6c6cd] rounded-lg p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#76777d] mb-2">
                  folder_open
                </span>
                <p className="text-[15px] text-[#191c1e] font-medium mb-1">No knowledge added yet</p>
                <p className="text-[14px] text-[#45464d] mb-4">
                  Upload docs or paste notes into a category so the AI has real context.
                </p>
                <button
                  type="button"
                  onClick={() => openAddModal(selectedCategory ?? undefined)}
                  className="bg-[#000000] text-white px-4 py-2 rounded text-[14px] font-medium hover:bg-[#2d3133] cursor-pointer"
                >
                  Add knowledge
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleDocs.map((doc) => {
                  const cat = categories.find((c) => c.id === doc.categoryId);
                  const expanded = expandedDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="text-left flex-1 cursor-pointer"
                          onClick={() => setExpandedDocId(expanded ? null : doc.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-[15px] font-semibold text-[#191c1e]">{doc.title}</h3>
                            {cat && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-[#eceef0] text-[#45464d]">
                                {cat.title}
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-[#76777d] flex flex-wrap gap-x-3 gap-y-1">
                            <span>{formatDate(doc.updatedAt)}</span>
                            {doc.fileName && (
                              <span>
                                {doc.fileName}
                                {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}
                              </span>
                            )}
                          </div>
                          {doc.notes && !expanded && (
                            <p className="text-[14px] text-[#45464d] mt-2 line-clamp-2">{doc.notes}</p>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteDocument(doc.id)}
                          className="text-[#76777d] hover:text-[#b3261e] p-1 cursor-pointer"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                      {expanded && (
                        <div className="mt-3 pt-3 border-t border-[#c6c6cd]/60 space-y-2">
                          {doc.notes && (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#76777d] mb-1">
                                Notes
                              </div>
                              <p className="text-[14px] text-[#191c1e] whitespace-pre-wrap">{doc.notes}</p>
                            </div>
                          )}
                          {doc.content && doc.content !== doc.notes && (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#76777d] mb-1">
                                Content
                              </div>
                              <pre className="text-[12px] text-[#45464d] bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap">
                                {doc.content.slice(0, 4000)}
                                {doc.content.length > 4000 ? '\n…' : ''}
                              </pre>
                            </div>
                          )}
                          {!doc.notes && !doc.content && doc.fileName && (
                            <p className="text-[13px] text-[#76777d]">
                              File reference only — no text content stored.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-[#c6c6cd]/60 pb-3">
              <h2 className="text-[18px] font-semibold text-[#191c1e]">AI Knowledge Status</h2>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                  totalDocuments > 0
                    ? 'bg-[#e8f5e9] text-[#1b5e20]'
                    : 'bg-[#eceef0] text-[#45464d]'
                }`}
              >
                {totalDocuments > 0 ? 'Active' : 'Waiting for docs'}
              </span>
            </div>
            <div className="space-y-3 text-[14px] text-[#45464d]">
              <p>
                Manual documents are retrieved on every AI chat and requirement analysis. Relevant
                excerpts are ranked and injected as grounded company context.
              </p>
              <ul className="space-y-2 text-[13px]">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#6063ee] mt-0.5">
                    check_circle
                  </span>
                  <span>
                    <span className="font-medium text-[#191c1e]">{totalDocuments}</span> manual
                    document{totalDocuments === 1 ? '' : 's'} available for retrieval
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#6063ee] mt-0.5">
                    psychology
                  </span>
                  <span>Used by AI Assistant and New Request analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#76777d] mt-0.5">
                    schedule
                  </span>
                  <span>Vector indexing for external sources still coming soon</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 border-b border-[#c6c6cd]/60 pb-2">
              <h2 className="text-[20px] font-semibold text-[#191c1e]">Connected Sources</h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#eceef0] text-[#45464d]">
                Coming soon
              </span>
            </div>
            <p className="text-[13px] text-[#45464d] mb-3">
              GitHub, Notion, Confluence, and Jira indexing are not connected yet. Manual uploads are
              already used by the AI.
            </p>
            <div className="space-y-3">
              {COMING_SOON_SOURCES.map((src) => (
                <div
                  key={src.id}
                  className="bg-white border border-dashed border-[#c6c6cd] rounded-lg p-3 flex items-center justify-between opacity-80"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-[#eceef0] flex items-center justify-center text-[#76777d]">
                      <span className="material-symbols-outlined text-[18px]">{src.icon}</span>
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#191c1e]">{src.name}</div>
                      <div className="text-[12px] text-[#76777d]">{src.note}</div>
                    </div>
                  </div>
                  <span className="text-[12px] font-medium text-[#76777d]">Coming soon</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('integrations')}
              className="mt-4 w-full border border-[#c6c6cd] text-[#191c1e] py-2 rounded text-[14px] font-medium hover:bg-[#f7f9fb] transition-colors cursor-pointer"
            >
              Open Integrations
            </button>
          </section>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-knowledge-title"
            className="bg-white w-full max-w-lg rounded-lg shadow-lg border border-[#c6c6cd] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c6c6cd]/60">
              <h3 id="add-knowledge-title" className="text-[18px] font-semibold text-[#191c1e]">
                Add knowledge
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-[#76777d] hover:text-[#191c1e] cursor-pointer"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#76777d] mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded px-3 py-2 text-[14px] text-[#191c1e] bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#76777d] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 business goals"
                  className="w-full border border-[#c6c6cd] rounded px-3 py-2 text-[14px] text-[#191c1e]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#76777d] mb-1.5">
                  Notes / pasted content
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Paste strategy notes, specs, client context, or code snippets…"
                  className="w-full border border-[#c6c6cd] rounded px-3 py-2 text-[14px] text-[#191c1e] resize-y"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#76777d] mb-1.5">
                  Upload document
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-[#c6c6cd] rounded px-3 py-2 text-[14px] font-medium text-[#191c1e] hover:bg-[#f7f9fb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                    Choose file
                  </button>
                  {fileMeta && (
                    <span className="text-[13px] text-[#45464d]">
                      {fileMeta.fileName} ({formatBytes(fileMeta.fileSize)})
                      <button
                        type="button"
                        className="ml-2 text-[#4648d4] hover:underline cursor-pointer"
                        onClick={() => {
                          setFileMeta(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#76777d] mt-1.5">
                  Text files (.md, .txt, .json, code) are stored for search. Larger/binary files are
                  kept as references.
                </p>
              </div>

              {formHint && !formError && (
                <div className="text-[13px] text-[#45464d] bg-[#f7f9fb] border border-[#c6c6cd] rounded px-3 py-2">
                  {formHint}
                </div>
              )}

              {formError && (
                <div className="text-[13px] text-[#b3261e] bg-[#fceeee] border border-[#f5c2c0] rounded px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="px-4 py-2 rounded text-[14px] font-medium text-[#45464d] hover:bg-[#f7f9fb] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#000000] text-white px-4 py-2 rounded text-[14px] font-medium hover:bg-[#2d3133] cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save to knowledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
