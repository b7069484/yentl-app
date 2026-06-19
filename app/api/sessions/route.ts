import { NextResponse } from "next/server";
import {
  clearCloudSessions,
  CloudSessionError,
  listCloudSessions,
  saveCloudSession,
} from "@/lib/server/cloud-session-store";

async function parseJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new CloudSessionError(
      400,
      "invalid_request",
      "Request body must be valid JSON.",
    );
  }
}

function cloudError(error: unknown) {
  if (error instanceof CloudSessionError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "cloud_error",
        message: "Yentl could not reach account-synced saved sessions.",
      },
    },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const sessions = await listCloudSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    return cloudError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJsonBody(req);
    const session = await saveCloudSession({
      id: typeof body?.id === "string" ? body.id : undefined,
      name: typeof body?.name === "string" ? body.name : undefined,
      session: body?.session,
    });
    return NextResponse.json({ session });
  } catch (error) {
    return cloudError(error);
  }
}

export async function DELETE() {
  try {
    await clearCloudSessions();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cloudError(error);
  }
}
