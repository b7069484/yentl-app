import { NextResponse } from "next/server";
import {
  CloudSessionError,
  deleteCloudSession,
  loadCloudSession,
  renameCloudSession,
} from "@/lib/server/cloud-session-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await loadCloudSession(id);
    return NextResponse.json({ session });
  } catch (error) {
    return cloudError(error);
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    await renameCloudSession(id, typeof body?.name === "string" ? body.name : "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cloudError(error);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteCloudSession(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cloudError(error);
  }
}
