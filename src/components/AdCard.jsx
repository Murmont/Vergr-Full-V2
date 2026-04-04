import { useState } from 'react';
import Icon from './Icon';

export default function AdCard({ ad }) {
  const [isVideo, setIsVideo] = useState(ad.type === 'clip');
  return (
    <div className="border-b border-white/[0.04] px-4 py-4 hover:bg-surface-1/30 transition-colors">
      <div className="max-w-[560px] mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-cyan/10 flex items-center justify-center shrink-0">
            <Icon name="campaign" size={20} className="text-brand-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-muted uppercase tracking-wider">Sponsored</span>
              <span className="text-[9px] bg-surface-2 px-1.5 py-0.5 rounded-full text-brand-cyan">Klipy</span>
            </div>
            <h3 className="font-bold text-text-primary text-sm">{ad.title}</h3>
            <p className="text-text-secondary text-xs mt-1">{ad.description}</p>
            {ad.media_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06]">
                {isVideo ? (
                  <video
                    src={ad.media_url}
                    controls
                    className="w-full max-h-64 object-cover"
                    poster={ad.preview_url}
                  />
                ) : (
                  <img src={ad.media_url} alt="" className="w-full max-h-64 object-cover" loading="lazy" />
                )}
              </div>
            )}
            <button
              onClick={() => window.open(ad.targetUrl, '_blank')}
              className="mt-3 text-brand-cyan text-xs font-semibold flex items-center gap-1"
            >
              Learn more <Icon name="arrow_forward" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}