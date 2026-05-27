import { NextResponse } from "next/server";
import { hasSourceAnalysisConsent } from "@/lib/source-consent";
import { emitSecurityEvent, routeForRequest } from "@/lib/server/security-events";

export function requireSourceAnalysisConsent(
  request: Request,
  clientPayload?: string | null,
): NextResponse | null {
  if (hasSourceAnalysisConsent(request, clientPayload)) return null;

  emitSecurityEvent("source_consent_missing", {
    route: routeForRequest(request),
    client_payload_present: Boolean(clientPayload),
  });

  return NextResponse.json(
    {
      error: {
        code: "SOURCE_CONSENT_REQUIRED",
        message: "Source analysis consent is required for this request.",
      },
    },
    { status: 428 },
  );
}
