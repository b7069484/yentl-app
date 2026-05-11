import type { Session } from "@/lib/types";

export function toJSON(session: Session): string {
  const obj: Record<string, unknown> = {
    title: session.title,
    started_at: session.started_at,
  };
  if (session.ended_at) {
    obj.ended_at = session.ended_at;
    obj.duration_seconds = Math.round(
      (new Date(session.ended_at).getTime() -
        new Date(session.started_at).getTime()) /
        1000,
    );
  }
  obj.transcript = session.transcript;
  obj.claims = session.claims;
  obj.markers = session.markers;
  return JSON.stringify(obj, null, 2);
}
