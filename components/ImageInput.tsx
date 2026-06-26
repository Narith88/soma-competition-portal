'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X, ClipboardPaste } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

function validateImage(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return 'Only PNG, JPG, JPEG, or WEBP images are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return 'Image too large. Maximum size is 5 MB.';
  }
  return null;
}

/**
 * Image input that supports: paste from clipboard (Ctrl+V), upload from
 * computer, manual URL entry, and removal. Used by both the question editor
 * and each answer choice.
 *
 * `kind` selects the storage folder ("questions" or "choices").
 */
export default function ImageInput({
  value,
  onChange,
  kind,
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  kind: 'questions' | 'choices';
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/upload-question-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
      } else {
        onChange(data.url);
      }
    } catch {
      setError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadFile(file);
          return;
        }
      }
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Paste target */}
      <div
        onPaste={onPaste}
        tabIndex={0}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2 outline-none focus-within:border-brand focus:border-brand"
      >
        <ClipboardPaste className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          placeholder="Paste image (Ctrl+V), upload, or enter an image URL"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          Upload
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setError(null);
            }}
            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-400 transition hover:text-red-500"
            title="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value && !compact && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Preview"
          className="max-h-48 rounded-lg border border-slate-200"
        />
      )}
    </div>
  );
}
