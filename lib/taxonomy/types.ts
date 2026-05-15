export type FurtherReading = {
  source: "wikipedia" | "sep" | "other";
  slug_or_path: string;
  title: string;
  mins?: number;
};
