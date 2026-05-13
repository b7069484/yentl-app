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
