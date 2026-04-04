/* Skeleton shimmer wave components — replaces pulse with surface-2 gradient shimmer */

function ShimmerBlock({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface-2/40 ${className}`}>
      <div className="absolute inset-0 skeleton-wave" />
    </div>
  );
}

export function SkeletonPulse({ className = '' }) {
  return <ShimmerBlock className={className} />;
}

export function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-white/[0.04]">
      <div className="flex items-start gap-3">
        <ShimmerBlock className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ShimmerBlock className="h-3.5 w-24" />
            <ShimmerBlock className="h-3 w-16" />
          </div>
          <div className="space-y-2 mb-3">
            <ShimmerBlock className="h-3.5 w-full" />
            <ShimmerBlock className="h-3.5 w-3/4" />
          </div>
          <ShimmerBlock className="h-48 w-full rounded-2xl mb-3" />
          <div className="flex gap-8">
            <ShimmerBlock className="h-3 w-10" />
            <ShimmerBlock className="h-3 w-10" />
            <ShimmerBlock className="h-3 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }) {
  return <>{Array.from({ length: count }).map((_, i) => <PostSkeleton key={i} />)}</>;
}

export function ProfileSkeleton() {
  return (
    <div>
      <ShimmerBlock className="h-32 rounded-none rounded-b-3xl" />
      <div className="px-5 -mt-10">
        <ShimmerBlock className="w-20 h-20 rounded-full border-4 border-bg-dark" />
        <div className="mt-3 space-y-2">
          <ShimmerBlock className="h-5 w-32" />
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-48 mt-3" />
        </div>
        <div className="flex gap-6 mt-4">
          <ShimmerBlock className="h-4 w-20" />
          <ShimmerBlock className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
          <ShimmerBlock className="w-8 h-8 rounded-full shrink-0" />
          <ShimmerBlock className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  );
}

export function SquadCardSkeleton() {
  return (
    <div className="bg-surface-1 rounded-xl p-4 border border-white/[0.04]">
      <div className="flex items-center gap-3 mb-3">
        <ShimmerBlock className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-4 w-28" />
          <ShimmerBlock className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div className="bg-surface-1 rounded-xl overflow-hidden border border-white/[0.04]">
      <ShimmerBlock className="h-40 rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBlock className="h-4 w-3/4" />
        <ShimmerBlock className="h-3 w-1/2" />
        <ShimmerBlock className="h-4 w-16" />
      </div>
    </div>
  );
}
