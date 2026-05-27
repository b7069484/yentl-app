import { getMarkerAsset } from "@/lib/visual-evidence/marker-assets";
import type { MarkerType } from "@/lib/types";

const TYPE_ACCENT: Record<MarkerType, string> = {
  bias: "border-amber-200 bg-amber-50",
  fallacy: "border-rose-200 bg-rose-50",
  rhetoric: "border-teal-200 bg-teal-50",
};

export function MarkerAssetIcon({
  canonicalId,
  type,
  display,
  size = "md",
}: {
  canonicalId: string;
  type: MarkerType;
  display: string;
  size?: "sm" | "md" | "lg";
}) {
  const asset = getMarkerAsset(canonicalId);
  const dimension = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const imageSize = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-12 w-12" : "h-8 w-8";

  return (
    <span
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-lg border ${TYPE_ACCENT[type]}`}
      title={`${display} marker icon`}
    >
      {asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.static_svg_path}
          alt=""
          aria-hidden="true"
          className={`${imageSize} object-contain`}
        />
      ) : (
        <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      )}
    </span>
  );
}
