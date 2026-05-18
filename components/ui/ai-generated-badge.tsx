import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIGeneratedBadge({ className }: { className?: string }) {
  return (
    <span
      aria-label="AI-generated content"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800",
        // Contrast: violet-800 (#3730a3) on violet-100 (#ede9fe) → ~7.8:1 (WCAG AA)
        className
      )}
    >
      <Sparkles aria-hidden="true" className="size-3" />
      <span>AI</span>
    </span>
  );
}
