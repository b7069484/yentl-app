import type { MarkerType } from "../types";

export type ExtraEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  aka?: string;
};

export const EXTRAS: ExtraEntry[] = [
  // §I additional cognitive biases (28)
  { canonical_id: "halo_effect",                  type: "bias", display: "Halo Effect" },
  { canonical_id: "horn_effect",                  type: "bias", display: "Horn Effect" },
  { canonical_id: "hindsight_bias",               type: "bias", display: "Hindsight Bias" },
  { canonical_id: "backfire_effect",              type: "bias", display: "Backfire Effect" },
  { canonical_id: "belief_perseverance",          type: "bias", display: "Belief Perseverance" },
  { canonical_id: "illusory_truth_effect",        type: "bias", display: "Illusory Truth Effect", aka: "repetition feels true" },
  { canonical_id: "continued_influence_effect",   type: "bias", display: "Continued Influence Effect", aka: "debunked info still sticks" },
  { canonical_id: "loss_aversion",                type: "bias", display: "Loss Aversion Exploitation" },
  { canonical_id: "endowment_effect",             type: "bias", display: "Endowment Effect" },
  { canonical_id: "survivorship_bias",            type: "bias", display: "Survivorship Bias" },
  { canonical_id: "selection_bias",               type: "bias", display: "Selection Bias" },
  { canonical_id: "base_rate_neglect",            type: "bias", display: "Base Rate Neglect" },
  { canonical_id: "conjunction_fallacy_bias",     type: "bias", display: "Conjunction Fallacy", aka: "Linda problem" },
  { canonical_id: "gamblers_fallacy_bias",        type: "bias", display: "Gambler's Fallacy" },
  { canonical_id: "authority_bias",               type: "bias", display: "Authority Bias" },
  { canonical_id: "mere_exposure_effect",         type: "bias", display: "Mere-Exposure Effect" },
  { canonical_id: "false_consensus_effect",       type: "bias", display: "False Consensus Effect" },
  { canonical_id: "just_world_hypothesis",        type: "bias", display: "Just-World Hypothesis" },
  { canonical_id: "self_serving_bias",            type: "bias", display: "Self-Serving Bias" },
  { canonical_id: "fundamental_attribution_error",type: "bias", display: "Fundamental Attribution Error" },
  { canonical_id: "naive_realism",                type: "bias", display: "Naïve Realism" },
  { canonical_id: "bias_blind_spot",              type: "bias", display: "Bias Blind Spot" },
  { canonical_id: "outcome_bias",                 type: "bias", display: "Outcome Bias" },
  { canonical_id: "optimism_bias",                type: "bias", display: "Optimism Bias" },
  { canonical_id: "affect_heuristic",             type: "bias", display: "Affect Heuristic" },
  { canonical_id: "representativeness_heuristic", type: "bias", display: "Representativeness Heuristic" },
  { canonical_id: "spotlight_effect",             type: "bias", display: "Spotlight Effect" },
  { canonical_id: "curse_of_knowledge",           type: "bias", display: "Curse of Knowledge" },

  // §II additional fallacies (25)
  { canonical_id: "tu_quoque",                    type: "fallacy", display: "Tu Quoque", aka: "whataboutism" },
  { canonical_id: "no_true_scotsman",             type: "fallacy", display: "No True Scotsman" },
  { canonical_id: "composition_fallacy",          type: "fallacy", display: "Composition Fallacy" },
  { canonical_id: "division_fallacy",             type: "fallacy", display: "Division Fallacy" },
  { canonical_id: "genetic_fallacy",              type: "fallacy", display: "Genetic Fallacy" },
  { canonical_id: "loaded_question",              type: "fallacy", display: "Loaded Question", aka: "complex question" },
  { canonical_id: "begging_the_question",         type: "fallacy", display: "Begging the Question" },
  { canonical_id: "appeal_to_popularity",         type: "fallacy", display: "Appeal to Popularity", aka: "bandwagon fallacy" },
  { canonical_id: "appeal_to_consequences",       type: "fallacy", display: "Appeal to Consequences" },
  { canonical_id: "texas_sharpshooter",           type: "fallacy", display: "Texas Sharpshooter" },
  { canonical_id: "gish_gallop",                  type: "fallacy", display: "Gish Gallop" },
  { canonical_id: "galileo_gambit",               type: "fallacy", display: "Galileo Gambit" },
  { canonical_id: "argument_from_incredulity",    type: "fallacy", display: "Argument from Incredulity" },
  { canonical_id: "argument_from_silence",        type: "fallacy", display: "Argument from Silence" },
  { canonical_id: "middle_ground_fallacy",        type: "fallacy", display: "Middle Ground Fallacy", aka: "argument to moderation" },
  { canonical_id: "special_pleading",             type: "fallacy", display: "Special Pleading" },
  { canonical_id: "fallacy_fallacy",              type: "fallacy", display: "Fallacy Fallacy" },
  { canonical_id: "continuum_fallacy",            type: "fallacy", display: "Continuum Fallacy", aka: "fallacy of the beard" },
  { canonical_id: "single_cause_fallacy",         type: "fallacy", display: "Single Cause Fallacy" },
  { canonical_id: "is_ought_fallacy",             type: "fallacy", display: "Is-Ought Fallacy" },
  { canonical_id: "reification_fallacy",          type: "fallacy", display: "Reification Fallacy" },
  { canonical_id: "plurium_interrogationum",      type: "fallacy", display: "Plurium Interrogationum", aka: "many questions" },
  { canonical_id: "ad_lapidem",                   type: "fallacy", display: "Argumentum ad Lapidem", aka: "dismissal without reason" },
  { canonical_id: "stolen_concept",               type: "fallacy", display: "Stolen Concept" },
  { canonical_id: "etymological_fallacy",         type: "fallacy", display: "Etymological Fallacy" },

  // §III rhetorical patterns (15)
  { canonical_id: "loaded_language",              type: "rhetoric", display: "Loaded Language" },
  { canonical_id: "weasel_words",                 type: "rhetoric", display: "Weasel Words", aka: '"some say", "many believe"' },
  { canonical_id: "false_urgency",                type: "rhetoric", display: "False Urgency" },
  { canonical_id: "absolutism",                   type: "rhetoric", display: "Absolutism", aka: "never / always / only" },
  { canonical_id: "vagueness",                    type: "rhetoric", display: "Vagueness / Hand-waving" },
  { canonical_id: "glittering_generalities",      type: "rhetoric", display: "Glittering Generalities" },
  { canonical_id: "dog_whistles",                 type: "rhetoric", display: "Dog Whistles" },
  { canonical_id: "innuendo",                     type: "rhetoric", display: "Innuendo" },
  { canonical_id: "repetition_emphasis",          type: "rhetoric", display: "Repetition for Emphasis" },
  { canonical_id: "pejorative_framing",           type: "rhetoric", display: "Pejorative Framing" },
  { canonical_id: "euphemism",                    type: "rhetoric", display: "Euphemism" },
  { canonical_id: "dysphemism",                   type: "rhetoric", display: "Dysphemism" },
  { canonical_id: "imprecise_quantifiers",        type: "rhetoric", display: "Imprecise Quantifiers" },
  { canonical_id: "hedge_words",                  type: "rhetoric", display: "Hedge Words", aka: '"might", "could be"' },
  { canonical_id: "code_words",                   type: "rhetoric", display: "Code Words" },
];
