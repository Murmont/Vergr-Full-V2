import Icon from './Icon';
export default function LinkPreviewCard({ url, title, description, image, isMe }) {
  if (!url) return null;
  let hostname = url;
  try { hostname = new URL(url).hostname; } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 p-2.5 rounded-xl border border-white/[0.06] bg-surface-1 hover:border-white/[0.12] transition-colors">
      <div className="flex gap-2.5">
        {image && <img src={image} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{title || url}</p>
          {description && <p className="text-text-muted text-[10px] line-clamp-1 mt-0.5">{description}</p>}
          <p className="text-text-muted text-[9px] mt-0.5 truncate flex items-center gap-1"><Icon name="link" size={10} />{hostname}</p>
        </div>
      </div>
    </a>
  );
}
export const extractUrl = (text) => { if (!text) return null; const m = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i); return m ? m[0] : null; };
