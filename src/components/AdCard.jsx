import { useState } from 'react';
import Icon from './Icon';

export default function AdCard({ ad }) {
  const [imgError, setImgError] = useState(false);

  // Determine media URL and target URL based on ad source
  const isFirestoreAd = ad.isFirestoreAd;
  const mediaUrl = isFirestoreAd ? ad.imageUrl : ad.media_url;
  const targetUrl = isFirestoreAd ? ad.targetUrl : ad.targetUrl;
  const title = ad.title || 'Sponsored Content';
  const description = ad.description || '';
  const isVideo = !isFirestoreAd && ad.type === 'clip';
  const sponsorLabel = isFirestoreAd ? 'Ad' : 'Klipy';

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
              <span className="text-[9px] bg-surface-2 px-1.5 py-0.5 rounded-full text-brand-cyan">{sponsorLabel}</span>
            </div>
            <h3 className="font-bold text-text-primary text-sm">{title}</h3>
            {description && <p className="text-text-secondary text-xs mt-1">{description}</p>}
            {mediaUrl && !imgError && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06]">
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full max-h-64 object-cover"
                    poster={ad.preview_url}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt=""
                    className="w-full max-h-64 object-cover"
                    loading="lazy"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            )}
            {targetUrl && (
              <button
                onClick={() => window.open(targetUrl, '_blank')}
                className="mt-3 text-brand-cyan text-xs font-semibold flex items-center gap-1"
              >
                Learn more <Icon name="arrow_forward" size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
