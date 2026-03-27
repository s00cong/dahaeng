import { useRef, useState, useLayoutEffect, Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GlobeViewer = lazy(() =>
  import("./GlobeViewer").then((m) => ({ default: m.GlobeViewer })),
);

interface GlobeContainerProps {
  className?: string;
}

function GlobeFallback() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-3" style={{ background: "#0d1b2e" }}>
      <Loader2 className="size-8 animate-spin text-blue-400" aria-hidden="true" />
      <p className="text-sm text-white/50">지도를 불러오는 중...</p>
    </div>
  );
}

export function GlobeContainer({ className }: GlobeContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
const [size, setSize] = useState({ width: 800, height: 500 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      setSize({
        width: Math.max(Math.round(width), 100),
        height: Math.max(Math.round(height), 100),
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-tutorial="globe"
      className={cn("flex items-center justify-center", className)}
      aria-label="2D 세계 지도"
    >
      <Suspense fallback={<GlobeFallback />}>
        <GlobeViewer width={size.width} height={size.height} />
      </Suspense>
    </div>
  );
}
