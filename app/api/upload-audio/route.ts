import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
];

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Guard: ensure the blob token is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not set on the server." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, _clientPayload) => {
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("blob upload completed", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
