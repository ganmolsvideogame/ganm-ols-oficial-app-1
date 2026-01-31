"use client";

import { useRef } from "react";

type ShelfCarouselProps = {
  children: React.ReactNode;
  itemMinWidth?: number;
};

export default function ShelfCarousel({
  children,
  itemMinWidth = 240,
}: ShelfCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (direction: "prev" | "next") => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = scroller.clientWidth * 0.85;
    scroller.scrollBy({
      left: direction === "prev" ? -amount : amount,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 pr-8 scroll-smooth [scrollbar-width:thin] motion-reduce:scroll-auto"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-2 pr-2 md:flex">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scrollByAmount("prev")}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
        >
          <span aria-hidden="true">&lt;</span>
        </button>
        <button
          type="button"
          aria-label="Proximo"
          onClick={() => scrollByAmount("next")}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
      <style jsx>{`
        .shelf-item {
          min-width: ${itemMinWidth}px;
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  );
}
