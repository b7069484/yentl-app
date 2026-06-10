import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scoreHardWindows } from "@/scripts/test-corpus/score-speaker-attribution";

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yentl-speaker-score-"));
  tempRoots.push(root);
  return root;
}

async function writeTranscript(root: string, sourceId: string): Promise<void> {
  const dir = path.join(root, "test-corpus", "transcripts");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${sourceId}.json`), JSON.stringify({
    results: {
      channels: [{
        alternatives: [{
          words: [
            { word: "hello", punctuated_word: "Hello", start: 0, end: 0.4, speaker: 0, speaker_confidence: 0.9 },
            { word: "world", punctuated_word: "world.", start: 0.4, end: 0.8, speaker: 0, speaker_confidence: 0.9 },
          ],
        }],
      }],
    },
  }, null, 2));
}

async function writeManifest(root: string, labelPath: string): Promise<string> {
  const manifest = path.join(root, "test-corpus", "speaker-attribution-windows.csv");
  await fs.mkdir(path.dirname(manifest), { recursive: true });
  await fs.writeFile(manifest, [
    "window_id,corpus_id,source_id,start_s,end_s,failure_family,expected_risk,review_required,label_path,notes",
    `demo_window,test-corpus,demo,0,1,clean_solo_control,single_speaker,false,${labelPath},Demo`,
  ].join("\n"));
  return manifest;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("speaker-attribution hard-window scoring", () => {
  it("reports missing sidecars as missing labels instead of passing the window", async () => {
    const root = await makeTempRoot();
    await writeTranscript(root, "demo");
    const manifest = await writeManifest(root, "speaker-attribution/sidecars/demo.json");

    const report = await scoreHardWindows({
      repoRoot: root,
      manifests: [manifest],
      outDir: path.join(root, "out"),
      publicDir: null,
    });

    expect(report.summary.windows).toBe(1);
    expect(report.summary.missing_labels).toBe(1);
    expect(report.windows[0].label_status).toBe("missing");
    expect(report.windows[0].missing_labels[0]).toContain("sidecar:");
  });

  it("scores speaker purity and claim-owner accuracy for a labeled smoke window", async () => {
    const root = await makeTempRoot();
    await writeTranscript(root, "demo");
    const manifest = await writeManifest(root, "speaker-attribution/sidecars/demo.json");
    const sidecarPath = path.join(root, "test-corpus", "speaker-attribution", "sidecars", "demo.json");
    await fs.mkdir(path.dirname(sidecarPath), { recursive: true });
    await fs.writeFile(sidecarPath, JSON.stringify({
      schema_version: 1,
      window_id: "demo_window",
      corpus_id: "test-corpus",
      source_id: "demo",
      start_s: 0,
      end_s: 1,
      transcript_usable: true,
      labels: {
        reference_text: "Hello world.",
        turns: [{ id: "turn-1", start_s: 0, end_s: 1, speaker_id: "speaker_a", expected_provider_speaker_id: 0 }],
        claims: [{ id: "claim-1", start_s: 0, end_s: 1, owner_speaker_id: "speaker_a", expected_provider_speaker_id: 0, stance: "asserted" }],
        markers: [],
        unsafe_attribution_spans: [],
      },
    }, null, 2));

    const report = await scoreHardWindows({
      repoRoot: root,
      manifests: [manifest],
      outDir: path.join(root, "out"),
      publicDir: null,
    });

    expect(report.windows[0].speaker_purity).toBe(1);
    expect(report.windows[0].claim_owner_accuracy).toBe(1);
    expect(report.windows[0].wer).toBe(0);
    expect(report.summary.mean_speaker_purity).toBe(1);
  });
});
