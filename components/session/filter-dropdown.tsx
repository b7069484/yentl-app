"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = {
  value: string;
  label: string;
};

export function FilterDropdown({
  label,
  options,
  active,
  onChange,
  variant = "default",
}: {
  label: string;
  options: DropdownOption[];
  active: string[] | string | null;
  onChange: (next: string[]) => void;
  variant?: "default" | "active";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const activeClass =
    variant === "active"
      ? "bg-ink-1 text-paper border-ink-1"
      : "bg-paper text-ink-2 border-line hover:border-ink-4";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${activeClass}`}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="2,3.5 5,6.5 8,3.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 left-0 min-w-[160px] bg-paper border border-line rounded-lg shadow-lg p-1">
          {options.map((opt) => {
            const isActive = Array.isArray(active)
              ? active.includes(opt.value)
              : active === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (Array.isArray(active)) {
                    const next = isActive
                      ? active.filter((v) => v !== opt.value)
                      : [...active, opt.value];
                    onChange(next);
                  } else {
                    onChange([opt.value]);
                  }
                  setOpen(false);
                }}
                className={`block w-full text-left px-2 py-1.5 text-[11px] rounded transition-colors hover:bg-cream-2 ${
                  isActive ? "font-semibold text-ink" : "text-ink-2"
                }`}
              >
                {opt.label}
                {isActive && (
                  <span className="float-right text-ink-3">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
