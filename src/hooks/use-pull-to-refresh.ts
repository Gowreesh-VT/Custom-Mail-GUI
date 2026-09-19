import { useEffect, useState, useRef } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void> | void, threshold = 60) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scroll position is at the very top
      if (window.scrollY === 0) {
        isAtTop = true;
        touchStartRef.current = e.touches[0].clientY;
      } else {
        isAtTop = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartRef.current;

      if (diff > 0) {
        // Friction factor so pulling feels heavier the further down it goes
        const distance = Math.min(diff * 0.4, threshold * 1.5);
        pullDistanceRef.current = distance;
        setPullDistance(distance);

        // Prevent body bounce scroll on iOS
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isAtTop || isRefreshing) return;

      const finalDistance = pullDistanceRef.current;
      pullDistanceRef.current = 0;
      setPullDistance(0);

      if (finalDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, threshold, isRefreshing]);

  return { pullDistance, isRefreshing };
}
