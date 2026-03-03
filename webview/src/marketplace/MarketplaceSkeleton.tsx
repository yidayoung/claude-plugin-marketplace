import { type VSCodeTheme } from './useVSCodeTheme';

interface MarketplaceSkeletonProps {
  count?: number;
  theme: VSCodeTheme;
}

export function MarketplaceSkeleton({ count = 6, theme }: MarketplaceSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm h-full flex flex-col overflow-hidden"
          style={{
            borderTopColor: '#7C3AED',
            borderTopWidth: '4px',
            animationDelay: `${index * 100}ms`
          }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full" />
          </div>

          {/* Icon Skeleton */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-border/50 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 bg-border/50 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-border/50 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-border/50 animate-pulse" />
          </div>

          {/* Category Badge Skeleton */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 h-7 px-3.5 rounded-full bg-border/30 animate-pulse w-24" />
          </div>

          {/* Description Skeleton */}
          <div className="mb-5 space-y-2">
            <div className="h-4 bg-border/50 rounded animate-pulse" />
            <div className="h-4 bg-border/50 rounded animate-pulse w-5/6" />
          </div>

          {/* Buttons Skeleton */}
          <div className="flex gap-2.5 mt-auto">
            <div className="flex-1 h-10 bg-border/50 rounded-lg animate-pulse" />
            <div className="flex-1 h-10 bg-border/50 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
