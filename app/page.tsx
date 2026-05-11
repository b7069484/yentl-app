import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Factify</h1>
      <p className="text-muted-foreground">Live fact-checking & bias/fallacy detection.</p>
      <Button asChild>
        <Link href="/session">Start session</Link>
      </Button>
    </main>
  );
}
