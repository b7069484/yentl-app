import { NextResponse } from "next/server";
import { mintToken } from "@/lib/server/deepgram";

export const runtime = "nodejs";

export async function POST() {
  try {
    const token = await mintToken();
    return NextResponse.json(token);
  } catch (e) {
    console.error("deepgram token mint failed", e);
    return NextResponse.json({ error: "token mint failed" }, { status: 500 });
  }
}
