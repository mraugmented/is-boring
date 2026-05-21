'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import type { ClientFile } from '@/types/database';

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isImage(fileType: string) {
  return fileType.startsWith('image/');
}

export default function PortalFilesPage() {
  const { client } = usePortal();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from('client_files')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });
    const fetched = (data as ClientFile[]) || [];
    setFiles(fetched);
    setLoading(false);

    // Generate signed URLs for images
    const urls: Record<string, string> = {};
    for (const f of fetched) {
      if (isImage(f.file_type)) {
        const { data: urlData } = await supabase.storage
          .from('client-files')
          .createSignedUrl(f.storage_path, 3600);
        if (urlData?.signedUrl) {
          urls[f.id] = urlData.signedUrl;
        }
      }
    }
    setSignedUrls(urls);
  }, [client.id, supabase]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function handleUpload(selectedFiles: FileList | File[]) {
    setError('');
    const fileArray = Array.from(selectedFiles);

    // Validate
    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported file type. Use JPG, PNG, WebP, GIF, PDF, DOC, or DOCX.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" exceeds the 10MB limit.`);
        return;
      }
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to upload files.');
      setUploading(false);
      return;
    }

    for (const file of fileArray) {
      const timestamp = Date.now();
      const storagePath = `${client.id}/${timestamp}_${file.name}`;

      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setError(`Failed to upload "${file.name}": ${uploadError.message}`);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
        continue;
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      // Insert DB record
      await supabase.from('client_files').insert({
        client_id: client.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        notes: notes.trim() || null,
      });

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    }

    setNotes('');
    setUploadProgress({});
    setUploading(false);
    fetchFiles();
  }

  async function handleDelete(file: ClientFile) {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    await supabase.storage.from('client-files').remove([file.storage_path]);
    await supabase.from('client_files').delete().eq('id', file.id);
    fetchFiles();
  }

  async function openLightbox(file: ClientFile) {
    const url = signedUrls[file.id];
    if (url) {
      setLightboxUrl(url);
    } else {
      const { data } = await supabase.storage
        .from('client-files')
        .createSignedUrl(file.storage_path, 3600);
      if (data?.signedUrl) setLightboxUrl(data.signedUrl);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Files</h1>

      {/* Upload area */}
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--border-default)] hover:border-[var(--accent)] bg-[var(--bg-elevated)]'
          }`}
        >
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            JPG, PNG, WebP, GIF, PDF, DOC, DOCX — Max 10MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Notes field */}
        <div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note for this upload (optional)"
            className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Upload progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([name, progress]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{name}</span>
                <div className="w-32 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span>Loading files...</span>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center text-[var(--text-tertiary)] text-sm">
          No files uploaded yet. Drop files above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-default)] transition-all group"
            >
              {/* Thumbnail / Icon */}
              {isImage(file.file_type) ? (
                <div
                  onClick={() => openLightbox(file)}
                  className="aspect-square bg-[var(--bg-muted)] cursor-pointer overflow-hidden"
                >
                  {signedUrls[file.id] ? (
                    <img
                      src={signedUrls[file.id]}
                      alt={file.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-[var(--bg-muted)] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatFileSize(file.file_size)} &middot; {formatDate(file.created_at)}
                </p>
                {file.notes && (
                  <p className="text-xs text-[var(--text-tertiary)] truncate" title={file.notes}>
                    {file.notes}
                  </p>
                )}
                <button
                  onClick={() => handleDelete(file)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors mt-1 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
