import {
  Megaphone, XCircle, GitBranch, ArrowRightLeft, AlertTriangle,
  Crown, HeartHandshake, CloudFog, Repeat, Split, Zap,
  Users, Filter, Scale, Fingerprint, HelpCircle,
  type LucideIcon,
} from "lucide-react";

export const ARCHETYPES = [
  "appeal_to",
  "dismissal",
  "generalization",
  "redirection",
  "fear",
  "authority",
  "emotion",
  "vagueness",
  "repetition",
  "false_binary",
  "false_causation",
  "in_group",
  "framing",
  "burden",
  "identity",
  "unknown",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export function isArchetype(s: string): s is Archetype {
  return (ARCHETYPES as readonly string[]).includes(s);
}

export const ARCHETYPE_ICONS: Record<Archetype, LucideIcon> = {
  appeal_to: Megaphone,
  dismissal: XCircle,
  generalization: GitBranch,
  redirection: ArrowRightLeft,
  fear: AlertTriangle,
  authority: Crown,
  emotion: HeartHandshake,
  vagueness: CloudFog,
  repetition: Repeat,
  false_binary: Split,
  false_causation: Zap,
  in_group: Users,
  framing: Filter,
  burden: Scale,
  identity: Fingerprint,
  unknown: HelpCircle,
};
