"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type HeaderDropdownProps = {
  trigger: ReactNode;
  children: ReactNode;
  panelClassName?: string;
  wrapperClassName?: string;
};

export default function HeaderDropdown({
  trigger,
  children,
  panelClassName = "",
  wrapperClassName = "",
}: HeaderDropdownProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className={`relative ${wrapperClassName}`.trim()} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="contents"
      >
        {trigger}
      </button>
      {isOpen ? (
        <div
          className={panelClassName}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("a,button")) {
              setIsOpen(false);
            }
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
