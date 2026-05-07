//app\(buyer)\comprar\components\KronixBannerSlider.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LOCAL_PROMO_BANNERS = [
  {
    id: "comprar-1",
    src: "/branding/kronix/banner1.png",
    alt: "Promo KroniX Comprar 1",
  },
  {
    id: "comprar-2",
    src: "/branding/kronix/banner2.png",
    alt: "Promo KroniX Comprar 2",
  },
  {
    id: "comprar-3",
    src: "/branding/kronix/banner3.png",
    alt: "Promo KroniX Comprar 3",
  },
  {
    id: "comprar-4",
    src: "/branding/kronix/banner4.png",
    alt: "Promo KroniX Comprar 4",
  },
  {
    id: "comprar-5",
    src: "/branding/kronix/banner5.png",
    alt: "Promo KroniX Comprar 5",
  },
];

const AUTO_MS = 5000;
const SWIPE_THRESHOLD = 50;

export default function KronixBannerSlider() {
  const total = LOCAL_PROMO_BANNERS.length;

  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const mouseDownXRef = useRef<number | null>(null);

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % total);
  }, [total]);

  const prevBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToBanner = useCallback(
    (index: number) => {
      const safe = ((index % total) + total) % total;
      setCurrentBanner(safe);
    },
    [total]
  );

  useEffect(() => {
    if (isPaused || isDragging || total <= 1) return;

    const timer = window.setInterval(() => {
      nextBanner();
    }, AUTO_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused, isDragging, nextBanner, total]);

  const trackStyle = useMemo(() => {
    const translatePercent = -currentBanner * 100;
    return {
      transform: `translate3d(calc(${translatePercent}% + ${dragOffset}px), 0, 0)`,
      transition: isDragging ? "none" : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
    };
  }, [currentBanner, dragOffset, isDragging]);

  function resetDragState() {
    setIsDragging(false);
    setDragOffset(0);
    touchStartXRef.current = null;
    touchCurrentXRef.current = null;
    mouseDownXRef.current = null;
  }

  function commitSwipe(deltaX: number) {
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      resetDragState();
      return;
    }

    if (deltaX < 0) {
      nextBanner();
    } else {
      prevBanner();
    }

    resetDragState();
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return;
    setIsPaused(true);
    setIsDragging(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchCurrentXRef.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!isDragging || touchStartXRef.current === null) return;
    touchCurrentXRef.current = e.touches[0].clientX;
    const delta = touchCurrentXRef.current - touchStartXRef.current;
    setDragOffset(delta);
  }

  function handleTouchEnd() {
    if (!isDragging || touchStartXRef.current === null || touchCurrentXRef.current === null) {
      resetDragState();
      setIsPaused(false);
      return;
    }

    const delta = touchCurrentXRef.current - touchStartXRef.current;
    commitSwipe(delta);
    setIsPaused(false);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setIsPaused(true);
    setIsDragging(true);
    mouseDownXRef.current = e.clientX;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging || mouseDownXRef.current === null) return;
    const delta = e.clientX - mouseDownXRef.current;
    setDragOffset(delta);
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging || mouseDownXRef.current === null) {
      resetDragState();
      setIsPaused(false);
      return;
    }

    const delta = e.clientX - mouseDownXRef.current;
    commitSwipe(delta);
    setIsPaused(false);
  }

  function handleMouseLeave() {
    if (!isDragging) {
      setIsPaused(false);
      return;
    }
    resetDragState();
    setIsPaused(false);
  }

  return (
    <div
      className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative aspect-[40/12] w-full select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          resetDragState();
          setIsPaused(false);
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="flex h-full w-full"
          style={trackStyle}
        >
          {LOCAL_PROMO_BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className="relative h-full w-full shrink-0"
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                className="pointer-events-none object-cover"
                priority={index === 0}
                draggable={false}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/10 to-transparent" />

        <button
          type="button"
          onClick={() => {
            setIsPaused(true);
            prevBanner();
          }}
          aria-label="Banner anterior"
          className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white md:grid"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPaused(true);
            nextBanner();
          }}
          aria-label="Banner siguiente"
          className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white md:grid"
        >
          ›
        </button>

        <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-2">
          {LOCAL_PROMO_BANNERS.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => {
                setIsPaused(true);
                goToBanner(index);
              }}
              aria-label={`Ver banner ${index + 1}`}
              className={[
                "h-2.5 rounded-full transition-all duration-300",
                currentBanner === index
                  ? "w-7 bg-white shadow"
                  : "w-2.5 bg-white/65",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}