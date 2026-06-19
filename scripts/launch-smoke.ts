type JsonValue = Record<string, unknown> | unknown[];

const baseUrl = process.env.YENTL_SMOKE_BASE_URL?.replace(/\/+$/, "");
const authHeader = process.env.YENTL_SMOKE_AUTH_HEADER;
const runRateLimit = process.env.YENTL_SMOKE_RATE_LIMIT === "1";
const runBlobToken = process.env.YENTL_SMOKE_BLOB_TOKEN === "1";
const expectProductAuth = process.env.YENTL_SMOKE_EXPECT_AUTH === "1";
const skipInternalExposure = process.env.YENTL_SMOKE_SKIP_INTERNAL === "1";

if (!baseUrl) {
  console.error("Set YENTL_SMOKE_BASE_URL, for example https://yentl.it");
  process.exit(1);
}

function smokeHeaders(extra?: HeadersInit, includeAuth = true): HeadersInit {
  return {
    ...(includeAuth && authHeader ? { Authorization: authHeader } : {}),
    ...extra,
  };
}

async function readText(
  path: string,
  init?: RequestInit,
  options?: { includeAuth?: boolean },
): Promise<{ status: number; text: string }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: smokeHeaders(init?.headers, options?.includeAuth),
    cache: "no-store",
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

async function readJson(
  path: string,
  init?: RequestInit,
  options?: { includeAuth?: boolean },
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: smokeHeaders(init?.headers, options?.includeAuth),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postJson(path: string, body: JsonValue, init?: RequestInit) {
  return readJson(path, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
}

async function checkSessionEntry() {
  const { status } = await readText("/session", { redirect: "manual" });
  if (expectProductAuth) {
    assert(
      status === 401 || status === 403 || status === 404 || (status >= 300 && status < 400),
      `session entry did not require auth; returned ${status}`,
    );
    console.log(`ok session entry requires auth (${status})`);
    return;
  }

  assert(status === 200, `guest-first session entry returned ${status}`);
  console.log("ok guest-first session entry");
}

async function checkContactPage() {
  const { status, text } = await readText("/contact");
  assert(status === 200, `contact page returned ${status}`);
  assert(text.includes("privacy@yentl.it") || text.includes("Yentl privacy"), "contact page missing privacy contact");
  assert(text.includes("accessibility@yentl.it") || text.includes("accessibility"), "contact page missing accessibility contact");
  console.log("ok public contact page");
}

async function checkPublicEntryPages() {
  const pages = [
    { path: "/", mustInclude: ["Yentl checks what is being said", "/pricing", "/faq", "/demo"] },
    { path: "/pricing", mustInclude: ["Free public preview", "no published paid plan"] },
    { path: "/faq", mustInclude: ["Do I need an account?", "What can I check?"] },
    { path: "/demo", mustInclude: ["Try Yentl before deciding", "Open sample text"] },
  ];

  for (const page of pages) {
    const { status, text } = await readText(page.path);
    assert(status === 200, `${page.path} returned ${status}`);
    for (const expected of page.mustInclude) {
      assert(text.includes(expected), `${page.path} missing ${expected}`);
    }
  }
  console.log("ok public entry pages");
}

async function checkMobileEntry() {
  const { status, text } = await readText("/mobile");
  assert(status === 200, `mobile page returned ${status}`);
  assert(text.includes("Yentl on iOS, Android, and mobile web."), "mobile page missing primary heading");
  assert(text.includes("Mobile paths stay honest"), "mobile page missing platform-limit copy");
  assert(text.includes("Native iOS and Android store shells are not shipped in v1"), "mobile page missing native-shell boundary");
  assert(text.includes("Installed-capable browsers can hand audio, video, captions"), "mobile page missing file-open capability copy");
  console.log("ok mobile/PWA entry page");
}

async function checkRoomModeEntry() {
  const { status, text } = await readText("/tv");
  assert(status === 200, `TV room page returned ${status}`);
  assert(text.includes("Open a Yentl session on the big screen."), "TV room page missing empty-room heading");
  assert(text.includes("Room mode is a read-only display"), "TV room page missing room-mode purpose copy");
  assert(text.includes("/session"), "TV room page missing session handoff link");
  console.log("ok TV room entry page");
}

async function checkManifest() {
  const { status, json } = await readJson("/manifest.webmanifest");
  assert(status === 200, `manifest returned ${status}`);
  const manifest = json as {
    start_url?: string;
    display?: string;
    display_override?: string[];
    launch_handler?: { client_mode?: string[] };
    share_target?: { action?: string; params?: Record<string, string> };
    file_handlers?: Array<{ action?: string; accept?: Record<string, string[]> }>;
  };

  assert(manifest.start_url === "/mobile", "manifest start_url is not /mobile");
  assert(manifest.display === "standalone", "manifest display is not standalone");
  assert(manifest.display_override?.includes("minimal-ui"), "manifest display_override missing minimal-ui fallback");
  assert(manifest.launch_handler?.client_mode?.includes("focus-existing"), "manifest launch_handler missing focus-existing");
  assert(manifest.launch_handler?.client_mode?.includes("navigate-new"), "manifest launch_handler missing navigate-new");

  const shareTarget = manifest.share_target;
  assert(shareTarget, "manifest share_target missing");
  assert(shareTarget.action === "/session", "manifest share_target.action is not /session");
  assert(shareTarget.params?.url === "url", "manifest share_target url param missing");

  const accept = manifest.file_handlers?.find((handler) => handler.action === "/session")?.accept;
  assert(accept, "manifest file_handlers missing /session handler");
  const requiredAccept: Record<string, string[]> = {
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/webm": [".webm"],
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/webm": [".webm"],
  };
  for (const [mime, extensions] of Object.entries(requiredAccept)) {
    assert(Array.isArray(accept[mime]), `manifest file handler missing ${mime}`);
    for (const extension of extensions) {
      assert(accept[mime].includes(extension), `manifest ${mime} missing ${extension}`);
    }
  }
  console.log("ok manifest PWA/share/file-handler contract");
}

async function checkInternalDemoExposure() {
  const { status, json } = await readJson(
    "/api/corpus-sample?id=solo_005",
    undefined,
    { includeAuth: false },
  );
  if (status === 401 || status === 403 || status === 404) {
    console.log(`ok internal corpus sample not publicly exposed (${status})`);
    return;
  }

  throw new Error(`internal corpus sample is exposed with status ${status}: ${JSON.stringify(json)}`);
}

async function checkInternalProjectExposure() {
  const dashboard = await readText("/project/validation", { redirect: "manual" }, { includeAuth: false });
  assert(
    dashboard.status === 401 ||
      dashboard.status === 403 ||
      dashboard.status === 404 ||
      (dashboard.status >= 300 && dashboard.status < 400),
    `internal project dashboard is publicly exposed with status ${dashboard.status}`,
  );

  const api = await readJson("/api/project-flow-comments", undefined, { includeAuth: false });
  assert(
    api.status === 401 || api.status === 403 || api.status === 404,
    `internal project comment API is publicly exposed with status ${api.status}: ${JSON.stringify(api.json)}`,
  );
  console.log("ok internal project surfaces not publicly exposed");
}

async function checkRateLimit() {
  let sawLimited = false;
  for (let i = 0; i < 260; i += 1) {
    const { status } = await postJson("/api/source-preview", { urls: [] });
    if (status === 401 || status === 403) {
      throw new Error("rate-limit smoke needs YENTL_SMOKE_AUTH_HEADER for this deployment");
    }
    if (status === 429) {
      sawLimited = true;
      break;
    }
    if (status >= 500) {
      throw new Error(`source-preview returned ${status} before rate limiting`);
    }
  }
  assert(sawLimited, "source-preview did not rate-limit within 260 requests");
  console.log("ok shared rate limit reached");
}

async function checkBlobToken() {
  const { status, json } = await postJson(
    "/api/upload-audio",
    {
      type: "blob.generate-client-token",
      payload: {
        pathname: "launch-smoke-video.mp4",
        callbackUrl: `${baseUrl}/api/upload-audio`,
        clientPayload: JSON.stringify({ consent: "source-analysis-v1" }),
        multipart: false,
      },
    },
    {
      headers: {
        "x-yentl-source-consent": "source-analysis-v1",
      },
    },
  );

  if (status === 401 || status === 403) {
    throw new Error("blob-token smoke needs YENTL_SMOKE_AUTH_HEADER for this deployment");
  }
  assert(status === 200, `upload-audio token generation returned ${status}: ${JSON.stringify(json)}`);
  assert(JSON.stringify(json).includes("clientToken"), "upload-audio response did not include a client token");
  console.log("ok video Blob upload token generation");
}

async function main() {
  try {
    await checkManifest();
    await checkPublicEntryPages();
    await checkMobileEntry();
    await checkRoomModeEntry();
    await checkContactPage();
    await checkSessionEntry();
    if (skipInternalExposure) {
      console.log("skip internal exposure checks; YENTL_SMOKE_SKIP_INTERNAL=1 is for local release-candidate smoke only");
    } else {
      await checkInternalDemoExposure();
      await checkInternalProjectExposure();
    }
    if (runRateLimit) {
      await checkRateLimit();
    } else {
      console.log("skip rate-limit exhaustion; set YENTL_SMOKE_RATE_LIMIT=1 to run it");
    }
    if (runBlobToken) {
      await checkBlobToken();
    } else {
      console.log("skip Blob token check; set YENTL_SMOKE_BLOB_TOKEN=1 to run it");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
