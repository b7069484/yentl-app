export const SOURCE_ANALYSIS_CONSENT_HEADER = "x-yentl-source-consent";
export const SOURCE_ANALYSIS_CONSENT_VALUE = "source-analysis-v1";

export function sourceAnalysisConsentHeaders(): Record<string, string> {
  return { [SOURCE_ANALYSIS_CONSENT_HEADER]: SOURCE_ANALYSIS_CONSENT_VALUE };
}

export function sourceAnalysisConsentPayload(): string {
  return JSON.stringify({ consent: SOURCE_ANALYSIS_CONSENT_VALUE });
}

export function hasSourceAnalysisConsent(
  request: Request,
  clientPayload?: string | null,
): boolean {
  if (request.headers.get(SOURCE_ANALYSIS_CONSENT_HEADER) === SOURCE_ANALYSIS_CONSENT_VALUE) {
    return true;
  }

  if (!clientPayload) return false;
  try {
    const parsed = JSON.parse(clientPayload) as { consent?: unknown };
    return parsed.consent === SOURCE_ANALYSIS_CONSENT_VALUE;
  } catch {
    return false;
  }
}
