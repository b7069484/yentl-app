export type PrimaryLabel =
  | "TRUE"
  | "MOSTLY_TRUE"
  | "PARTIAL"
  | "MISLEADING"
  | "OMISSION"
  | "FALSE"
  | "UNVERIFIABLE"
  | "OPINION";

export type ClaimStatus = "checking" | "provisional" | "confirmed";

export type ReputationTier = "high" | "mid" | "low";

export type Stance = "supports" | "contradicts" | "mixed";

export type Source = {
  url: string;
  domain: string;
  title: string;
  reputation_tier: ReputationTier;
  stance: Stance;
  excerpt?: string;
};

export type ClaimCard = {
  id: string;
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  primary_label: PrimaryLabel;
  score: number;
  annotations: string[];
  explanation: string;
  status: ClaimStatus;
  sources: Source[];
};

export type MarkerType = "fallacy" | "bias" | "rhetoric";
export type MarkerSeverity = "subtle" | "clear" | "blatant";

export type RhetoricMarker = {
  id: string;
  type: MarkerType;
  name: string;       // canonical id from taxonomy
  display: string;    // human label
  excerpt: string;
  start_time: number;
  end_time: number;
  severity: MarkerSeverity;
  explanation: string;
};

export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
  is_final: boolean;
};

export type Session = {
  title: string;
  started_at: string;   // ISO8601
  ended_at?: string;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
};
