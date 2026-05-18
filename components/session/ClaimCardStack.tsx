"use client";
import { useSession } from "@/lib/client/session-store";
import { ClaimCard } from "./ClaimCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ClaimCardStack() {
  const claims = useSession((s) => s.claims);
  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-3">
        {claims.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Claims will appear here as you speak.
          </p>
        )}
        {claims
          .slice()
          .reverse()
          .map((c) => (
            <ClaimCard key={c.id} card={c} />
          ))}
      </div>
    </ScrollArea>
  );
}
