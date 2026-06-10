import { generateText } from "ai";
import type { GenerateTextResult, ToolSet } from "ai";

type AIOutput = import("ai").Output.Output;
type GenerateTextArgs<TOOLS extends ToolSet, OUTPUT extends AIOutput> =
  Parameters<typeof generateText<TOOLS, OUTPUT>>[0];

export const DEFAULT_AI_TIMEOUT_MS = 30_000;
export const DEFAULT_AI_MAX_RETRIES = 3;

export type AiCallOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
};

function linkAbortSignal(
  source: AbortSignal | undefined,
  target: AbortController,
): () => void {
  if (!source) return () => {};
  if (source.aborted) {
    target.abort(source.reason);
    return () => {};
  }

  const onAbort = () => target.abort(source.reason);
  source.addEventListener("abort", onAbort, { once: true });
  return () => source.removeEventListener("abort", onAbort);
}

/**
 * Shared resilience policy for Yentl's AI SDK calls.
 *
 * Calls stay behind the configured Vercel AI Gateway models. This wrapper adds
 * a single retry/timeout policy without bypassing OIDC auth, cost visibility,
 * provider routing, or Gateway-level failover configuration.
 */
export async function aiGenerateText<
  TOOLS extends ToolSet,
  OUTPUT extends AIOutput = import("ai").Output.Output<string, string>,
>(
  args: GenerateTextArgs<TOOLS, OUTPUT>,
  options: AiCallOptions = {},
): Promise<GenerateTextResult<TOOLS, OUTPUT>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? args.maxRetries ?? DEFAULT_AI_MAX_RETRIES;
  const timeoutController = new AbortController();
  const unlinkCallerSignal = linkAbortSignal(options.signal, timeoutController);
  const unlinkArgsSignal = linkAbortSignal(args.abortSignal, timeoutController);
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    return await generateText<TOOLS, OUTPUT>({
      ...args,
      maxRetries,
      abortSignal: timeoutController.signal,
    });
  } finally {
    clearTimeout(timer);
    unlinkCallerSignal();
    unlinkArgsSignal();
  }
}
