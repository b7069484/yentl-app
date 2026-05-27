import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type FlowComment = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  screenshot: string;
  sourcePath: string;
  xPct: number;
  yPct: number;
  text: string;
  createdAt: string;
};

const commentsDir = path.join(process.cwd(), ".project/review-comments");
const latestPath = path.join(commentsDir, "yentl-flow-review-latest.json");
const roundsPath = path.join(commentsDir, "yentl-flow-review-rounds.jsonl");

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    const parsed = JSON.parse(raw) as { comments?: FlowComment[]; savedAt?: string };
    return NextResponse.json({
      savedAt: parsed.savedAt ?? null,
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    });
  } catch {
    return NextResponse.json({ savedAt: null, comments: [] });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null) as { comments?: FlowComment[] } | null;
  const comments = Array.isArray(body?.comments)
    ? body.comments.filter(isFlowComment)
    : [];
  const savedAt = new Date().toISOString();
  const payload = {
    savedAt,
    comments,
  };

  await fs.mkdir(commentsDir, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.appendFile(roundsPath, `${JSON.stringify(payload)}\n`, "utf8");

  return NextResponse.json({
    ok: true,
    savedAt,
    count: comments.length,
    path: path.relative(process.cwd(), latestPath),
  });
}

function isFlowComment(value: unknown): value is FlowComment {
  if (!value || typeof value !== "object") return false;
  const comment = value as Partial<FlowComment>;
  return typeof comment.id === "string" &&
    typeof comment.nodeId === "string" &&
    typeof comment.nodeTitle === "string" &&
    typeof comment.screenshot === "string" &&
    typeof comment.sourcePath === "string" &&
    typeof comment.xPct === "number" &&
    typeof comment.yPct === "number" &&
    typeof comment.text === "string" &&
    typeof comment.createdAt === "string";
}
