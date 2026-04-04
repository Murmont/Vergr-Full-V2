import { useState } from 'react';
import Icon from './Icon';

/**
 * MediaPreview - Shows a preview of the selected file before sending.
 * Supports images, videos, and generic files.
 */
export default function MediaPreview({ file, onSend, onCancel }) {
  const [caption, setCaption] = useState('');

  if (!file) return null;

  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');
  const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;
  const fileSize = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 glass-header">
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
          <Icon name="close" size={22} className="text-white" />
        </button>
        <div className="text-center flex-1 mx-4">
          <p className="text-white text-sm font-bold truncate">{file.name}</p>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">{fileSize}</p>
        </div>
        <div className="w-10" />
      </header>

      {/* Preview area */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {isImage && (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
        )}
        {isVideo && (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
        )}
        {!isImage && !isVideo && (
          <div className="bg-surface-2 rounded-2xl p-8 text-center border border-white/[0.06]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface-3 flex items-center justify-center">
              <Icon name="description" size={32} className="text-brand-cyan" />
            </div>
            <p className="text-white font-bold text-sm mb-1">{file.name}</p>
            <p className="text-text-muted text-xs">{fileSize} · {file.type || 'Unknown type'}</p>
          </div>
        )}
      </main>

      {/* Caption + Send */}
      <footer className="p-4 glass-header">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1 flex items-center bg-surface-1 rounded-3xl px-4 border border-white/[0.06] focus-within:border-brand-cyan/40 transition-all">
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 bg-transparent py-3 text-sm text-white outline-none"
              onKeyDown={e => { if (e.key === 'Enter') onSend(file, caption); }}
            />
          </div>
          <button
            onClick={() => onSend(file, caption)}
            className="w-12 h-12 rounded-full bg-brand-cyan text-bg-dark flex items-center justify-center active:scale-90 transition-transform"
          >
            <Icon name="send" size={22} />
          </button>
        </div>
      </footer>
    </div>
  );
}