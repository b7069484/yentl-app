"use client";

import { useEffect, useMemo, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Link as LinkIcon,
  LockKeyhole,
  Maximize2,
  MessageSquarePlus,
  Mic,
  MonitorPlay,
  Pencil,
  PlayCircle,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

type FlowNode = {
  id: string;
  title: string;
  branch: string;
  screenshot: string;
  sourcePath: string;
  screenshotStatus: "current" | "reference" | "stale" | "missing";
  screenshotNote: string;
  missingStates?: string[];
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: string[];
  userJob: string;
  screenJob: string;
  desktopTarget: string;
  mobileTarget: string;
  reviewAnchor: string;
  targetActual?: boolean;
};

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

type RouteScreenshotSeed = Pick<
  FlowNode,
  | "id"
  | "title"
  | "screenshot"
  | "sourcePath"
  | "screenshotNote"
  | "x"
  | "y"
  | "userJob"
  | "desktopTarget"
  | "reviewAnchor"
> &
  Partial<Pick<FlowNode, "missingStates" | "screenJob" | "mobileTarget">>;

type SaveState = "idle" | "saving" | "saved" | "error";

const CARD_W = 230;
const CARD_H = 172;
const CANVAS_W = 4600;
const CANVAS_H = 2920;

const screenshotStatusLabels = {
  current: "Current capture",
  reference: "Reference only",
  stale: "Stale / failure capture",
  missing: "Target missing",
} satisfies Record<FlowNode["screenshotStatus"], string>;

const screenshotStatusClasses = {
  current: "border-green/30 bg-green-soft text-green",
  reference: "border-teal/30 bg-teal-soft text-teal",
  stale: "border-amber-2/30 bg-amber-soft text-amber-2",
  missing: "border-red/25 bg-red-soft text-red",
} satisfies Record<FlowNode["screenshotStatus"], string>;

const targetActualNodeIds = new Set([
  "promo-anchors",
  "promo-trust",
  "auth",
  "auth-recovery",
  "guest-demo",
  "source",
  "source-selected",
  "source-unavailable",
  "mobile-share-sheet",
  "youtube",
  "youtube-preview-shell",
  "youtube-valid-preview",
  "youtube-invalid-url",
  "youtube-processing",
  "youtube-metadata",
  "youtube-captions",
  "youtube-transcript-build",
  "youtube-claim-extraction",
  "youtube-verification",
  "youtube-ready",
  "youtube-no-captions",
  "youtube-playback-blocked",
  "youtube-edit-url",
  "extension",
  "extension-install",
  "extension-popup",
  "extension-panel",
  "extension-text-capture",
  "extension-audio-permission",
  "extension-audio-meter",
  "extension-no-audio",
  "extension-transcript-tab",
  "extension-claims-tab",
  "extension-markers-tab",
  "extension-highlight-detail",
  "extension-export-menu",
  "extension-full-workspace",
  "extension-live-sync",
]);

const routeScreenshotNodes: FlowNode[] = ([
  {
    id: "route-home",
    title: "Home / Product Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-home.png",
    sourcePath: "app/page.tsx",
    screenshotNote: "Fresh full-page route capture for /, including public product story, examples, method, trust, pricing, FAQ, and app entry points.",
    x: 40,
    y: 2090,
    userJob: "Understand Yentl before starting a session.",
    desktopTarget: "Public homepage should sell, explain, and route into guest or account flows without hiding trust evidence.",
    reviewAnchor: "Comment on any homepage section that feels incomplete, repetitive, or misleading.",
  },
  {
    id: "route-pricing",
    title: "Pricing Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-pricing.png",
    sourcePath: "app/pricing/page.tsx",
    screenshotNote: "Fresh full-page route capture for /pricing.",
    x: 300,
    y: 2090,
    userJob: "Understand cost, local-first behavior, and account value before signing up.",
    desktopTarget: "Pricing should be honest about guest/local use, account-backed behavior, and launch limitations.",
    reviewAnchor: "Does pricing match the actual product state rather than future sync promises?",
  },
  {
    id: "route-mobile",
    title: "Mobile App Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-mobile.png",
    sourcePath: "app/mobile/page.tsx; app/manifest.ts; lib/launch-files.ts",
    screenshotNote: "Fresh route capture for /mobile, the PWA start URL that explains iOS, Android, and mobile-web entry paths.",
    x: 560,
    y: 2090,
    userJob: "Understand how to use Yentl from a phone or installed PWA.",
    desktopTarget: "Mobile page should route to share/import, saved work, source picking, and room display without promising native-only capabilities.",
    mobileTarget: "At 390px, the install/share/import story should read as a phone-first control hub with no horizontal crop.",
    reviewAnchor: "Does the PWA start page explain mobile capabilities and limits honestly?",
  },
  {
    id: "route-faq",
    title: "FAQ Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-faq.png",
    sourcePath: "app/faq/page.tsx",
    screenshotNote: "Fresh full-page route capture for /faq.",
    x: 820,
    y: 2090,
    userJob: "Resolve objections about evidence, privacy, source handling, and saved work.",
    desktopTarget: "FAQ should answer launch-critical questions without burying caveats.",
    reviewAnchor: "Which question still leaves uncertainty for a first-time reviewer?",
  },
  {
    id: "route-demo",
    title: "Guest Demo Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-demo.png",
    sourcePath: "app/demo/page.tsx",
    screenshotNote: "Fresh full-page route capture for /demo.",
    x: 1080,
    y: 2090,
    userJob: "Try Yentl without creating an account.",
    desktopTarget: "Demo should explain guest mode, local persistence, and prepared source options clearly.",
    reviewAnchor: "Does the demo route feel like a real entry path, not a placeholder?",
  },
  {
    id: "route-signin",
    title: "Sign In Fallback",
    screenshot: "/visual-evidence/flow-screenshots/current/route-signin.png",
    sourcePath: "app/signin/[[...rest]]/page.tsx",
    screenshotNote: "Fresh full-page route capture for /signin with Clerk absent.",
    missingStates: ["configured Clerk sign-in", "invalid credentials", "password reset"],
    x: 1340,
    y: 2090,
    userJob: "Sign in or understand why account features are unavailable locally.",
    desktopTarget: "Fallback should preserve trust and route users back to guest work when auth is not configured.",
    reviewAnchor: "Does the fallback explain the account gap without looking broken?",
  },
  {
    id: "route-signup",
    title: "Sign Up Fallback",
    screenshot: "/visual-evidence/flow-screenshots/current/route-signup.png",
    sourcePath: "app/signup/[[...rest]]/page.tsx",
    screenshotNote: "Fresh full-page route capture for /signup with Clerk absent.",
    missingStates: ["configured Clerk sign-up", "email verification", "post-sign-up redirect"],
    x: 1600,
    y: 2090,
    userJob: "Create an account or continue as a guest with clear expectations.",
    desktopTarget: "Sign-up fallback should not overpromise live sync when only local snapshots are available.",
    reviewAnchor: "Is account value explained honestly before the user hits a wall?",
  },
  {
    id: "route-about",
    title: "About Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-about.png",
    sourcePath: "app/about/page.tsx",
    screenshotNote: "Fresh full-page route capture for /about.",
    x: 40,
    y: 2288,
    userJob: "Understand the product mission and boundaries.",
    desktopTarget: "About should connect Yentl's purpose to concrete source-review behavior.",
    reviewAnchor: "Does this page build confidence in the product's judgment layer?",
  },
  {
    id: "route-methodology",
    title: "Methodology Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-methodology.png",
    sourcePath: "app/methodology/page.tsx",
    screenshotNote: "Fresh full-page route capture for /methodology.",
    x: 300,
    y: 2288,
    userJob: "See how Yentl moves from source material to judgment.",
    desktopTarget: "Methodology should make the analysis chain inspectable without making unsupported benchmark claims.",
    reviewAnchor: "Does the method page give enough proof to trust the workflow?",
  },
  {
    id: "route-privacy",
    title: "Privacy Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-privacy.png",
    sourcePath: "app/privacy/page.tsx",
    screenshotNote: "Fresh full-page route capture for /privacy.",
    x: 560,
    y: 2288,
    userJob: "Know what data Yentl touches and what persists.",
    desktopTarget: "Privacy copy should distinguish browser-local snapshots from account/server behavior.",
    reviewAnchor: "Does the privacy page match the real save/export/session behavior?",
  },
  {
    id: "route-terms",
    title: "Terms Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-terms.png",
    sourcePath: "app/terms/page.tsx",
    screenshotNote: "Fresh full-page route capture for /terms.",
    x: 820,
    y: 2288,
    userJob: "Understand permitted use and limitations.",
    desktopTarget: "Terms should be readable and consistent with the product's public claims.",
    reviewAnchor: "Does any term conflict with the launch story?",
  },
  {
    id: "route-subprocessors",
    title: "Subprocessors Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-subprocessors.png",
    sourcePath: "app/subprocessors/page.tsx",
    screenshotNote: "Fresh full-page route capture for /subprocessors.",
    x: 1080,
    y: 2288,
    userJob: "See which third-party services may handle content.",
    desktopTarget: "Subprocessor details should be specific enough for a serious buyer or reviewer.",
    reviewAnchor: "Are vendor roles and data surfaces concrete enough?",
  },
  {
    id: "route-accessibility",
    title: "Accessibility Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-accessibility.png",
    sourcePath: "app/accessibility/page.tsx",
    screenshotNote: "Fresh full-page route capture for /accessibility.",
    x: 1340,
    y: 2288,
    userJob: "Understand accessibility posture and contact route.",
    desktopTarget: "Accessibility page should name concrete commitments, not only generic compliance language.",
    reviewAnchor: "Does this page sound test-backed and actionable?",
  },
  {
    id: "route-contact",
    title: "Contact Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-contact.png",
    sourcePath: "app/contact/page.tsx",
    screenshotNote: "Fresh full-page route capture for /contact.",
    x: 40,
    y: 2486,
    userJob: "Reach the team with questions, privacy requests, or launch feedback.",
    desktopTarget: "Contact should support practical launch/review conversations and route back into product use.",
    reviewAnchor: "Does the contact path feel real enough for launch review?",
  },
  {
    id: "route-changelog",
    title: "Changelog Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-changelog.png",
    sourcePath: "app/changelog/page.tsx",
    screenshotNote: "Fresh full-page route capture for /changelog.",
    x: 300,
    y: 2486,
    userJob: "Review methodology and model-change transparency.",
    desktopTarget: "Changelog should communicate material methodology changes without pretending to be a full code release log.",
    reviewAnchor: "Is the changelog useful enough as a launch transparency artifact?",
  },
  {
    id: "route-sessions",
    title: "Saved Sessions Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-sessions.png",
    sourcePath: "app/sessions/page.tsx",
    screenshotNote: "Fresh full-page route capture for /sessions.",
    missingStates: ["saved sessions populated state", "clear-all confirmation", "restore failure"],
    x: 560,
    y: 2486,
    userJob: "Find, restore, export, or delete saved local sessions.",
    desktopTarget: "Saved sessions should clearly label browser-local snapshots and destructive actions.",
    reviewAnchor: "Does the library make local persistence obvious?",
  },
  {
    id: "route-session-source-picker",
    title: "Session Source Picker",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-source-picker.png",
    sourcePath: "app/session/page.tsx; components/session/source-picker.tsx",
    screenshotNote: "Fresh full-page route capture for /session.",
    x: 820,
    y: 2486,
    userJob: "Choose the right source path for a new analysis session.",
    desktopTarget: "Source picker should expose all launch-ready source modes and platform-aware limitations.",
    reviewAnchor: "Can a user pick a source without reading hidden docs?",
  },
  {
    id: "route-session-youtube-preview",
    title: "YouTube Preview Route",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-youtube-preview.png",
    sourcePath: "app/session/page.tsx; components/session/ingest-panes/youtube-ingest-pane.tsx",
    screenshotNote: "Fresh full-page route capture for /session with a YouTube URL prefilled.",
    missingStates: ["captions unavailable", "invalid URL", "processing failure"],
    x: 1080,
    y: 2486,
    userJob: "Preview a YouTube source before analysis.",
    desktopTarget: "YouTube preview should show identity, metadata, transcript availability, and the next action.",
    reviewAnchor: "Does the preview make the source identity unmistakable?",
  },
  {
    id: "route-session-text-prefill",
    title: "Text Prefill Route",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-text-prefill.png",
    sourcePath: "app/session/page.tsx; components/session/ingest-panes/text-ingest-pane.tsx",
    screenshotNote: "Fresh full-page route capture for /session with text and title query parameters.",
    x: 1340,
    y: 2486,
    userJob: "Arrive from a share/import route with text already loaded.",
    desktopTarget: "Text prefill should preserve imported content, title, and source-context copy.",
    reviewAnchor: "Does imported text feel ready for review immediately?",
  },
  {
    id: "route-project-validation",
    title: "Validation Lab",
    screenshot: "/visual-evidence/flow-screenshots/current/route-project-validation.png",
    sourcePath: "app/project/validation/page.tsx",
    screenshotNote: "Fresh full-page route capture for /project/validation.",
    x: 40,
    y: 2684,
    userJob: "Inspect internal validation samples and routes.",
    desktopTarget: "Validation lab should be useful as an internal QA and launch evidence surface.",
    reviewAnchor: "Does validation evidence connect clearly to real app routes?",
  },
  {
    id: "route-project-flows",
    title: "Project Flow Dashboard",
    screenshot: "/visual-evidence/flow-screenshots/current/route-project-flows.png",
    sourcePath: "app/project/flows/page.tsx; components/session/ux-flow-dashboard.tsx; components/session/az-flow-dashboard.tsx",
    screenshotNote: "Fresh full-page route capture for /project/flows after the commentable screenshot dashboard update.",
    x: 300,
    y: 2684,
    userJob: "Review every captured page and leave comments on exact screenshot points.",
    desktopTarget: "Dashboard should open directly to screenshot review, then preserve atlas and visual evidence tabs.",
    reviewAnchor: "Can a reviewer find a page, open its screenshot, and comment on the exact spot?",
  },
  {
    id: "route-session-detail-claim-empty",
    title: "Claim Detail Empty State",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-claim-empty.png",
    sourcePath: "app/session/detail/[type]/[id]/page.tsx; components/session/item-detail.tsx",
    screenshotNote: "Fresh route capture for /session/detail/claim/c-1 with no hydrated current-session item.",
    missingStates: ["populated claim detail", "sibling navigation", "claim source expansion"],
    x: 560,
    y: 2684,
    userJob: "Recover when a deep link points to a claim outside the current browser session.",
    desktopTarget: "Empty detail route should be calm, clear, and route back without implying data loss.",
    reviewAnchor: "Does the empty claim detail state explain what happened?",
  },
  {
    id: "route-session-detail-marker-empty",
    title: "Marker Detail Empty State",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-marker-empty.png",
    sourcePath: "app/session/detail/[type]/[id]/page.tsx; components/session/item-detail.tsx",
    screenshotNote: "Fresh route capture for /session/detail/marker/marker-123 with no hydrated current-session item.",
    missingStates: ["populated marker detail", "pattern source context", "sibling navigation"],
    x: 820,
    y: 2684,
    userJob: "Recover when a marker deep link no longer exists in the current session.",
    desktopTarget: "Marker detail empty state should clearly distinguish missing current-session data from an app error.",
    reviewAnchor: "Does the empty marker detail state avoid looking like a broken page?",
  },
  {
    id: "route-session-learn-marker",
    title: "Marker Learn Page",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-marker.png",
    sourcePath: "app/session/learn/[type]/[id]/page.tsx; components/session/marker-learn-more.tsx",
    screenshotNote: "Fresh route capture for /session/learn/marker/loaded_language.",
    missingStates: ["learn page with session occurrences"],
    x: 1080,
    y: 2684,
    userJob: "Learn what a detected rhetoric marker means.",
    desktopTarget: "Learn page should teach the pattern and connect examples back to session occurrences when available.",
    reviewAnchor: "Is the marker explanation useful without current-session context?",
  },
  {
    id: "route-session-learn-claim-empty",
    title: "Claim Learn Empty State",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-claim-empty.png",
    sourcePath: "app/session/learn/[type]/[id]/page.tsx; components/session/claim-learn-more.tsx",
    screenshotNote: "Fresh route capture for /session/learn/claim/c-1 with no hydrated current-session claim.",
    missingStates: ["populated claim learn page"],
    x: 1340,
    y: 2684,
    userJob: "Recover when a claim learning link has no current-session claim.",
    desktopTarget: "Claim learn empty state should be actionable and should not imply a failed fact-check.",
    reviewAnchor: "Does the empty claim learn state tell the user what to do next?",
  },
] satisfies RouteScreenshotSeed[]).map((node) => ({
  branch: "Route screenshot review",
  screenshotStatus: "current",
  missingStates: [],
  screenJob: "Expose this route as a screenshot-backed comment target in the project dashboard.",
  mobileTarget: "Route should keep content hierarchy, controls, and trust copy usable on narrow viewports.",
  ...node,
}));

const mobileRouteScreenshotNodes: FlowNode[] = routeScreenshotNodes.map((node, index) => ({
  ...node,
  id: `${node.id}-mobile`,
  title: `${node.title} Mobile`,
  branch: "Mobile route screenshot review",
  screenshot: mobileRouteScreenshotPath(node.screenshot),
  sourcePath: `docs/superpowers/validation/screenshots/${node.id}-mobile.png; ${node.sourcePath}`,
  screenshotNote: `390px mobile route capture for ${node.title}. Generated with npm run visual:capture-launch using Chrome DevTools device metrics, so this is not a cropped desktop screenshot.`,
  missingStates: node.missingStates ?? [],
  x: 40 + (index % 6) * 260,
  y: 2882 + Math.floor(index / 6) * 198,
  screenJob: "Expose this route's 390px mobile capture as a screenshot-backed comment target.",
  reviewAnchor: `Mobile review: ${node.reviewAnchor}`,
}));

const populatedDynamicRouteNodes: FlowNode[] = [
  {
    id: "route-session-detail-claim-populated",
    title: "Claim Detail Populated",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-claim-populated.png",
    sourcePath: "app/session/detail/[type]/[id]/page.tsx; components/session/validation-sample-hydrator.tsx; components/session/item-detail.tsx",
    screenshotStatus: "current",
    screenshotNote: "Direct route capture hydrated from validation sample cable_008 so the claim detail page shows real current-session claim context instead of the empty deep-link state.",
    missingStates: ["claim source expansion for replay samples with sources"],
    x: 40,
    y: 3680,
    userJob: "Inspect a specific claim from a hydrated session.",
    screenJob: "Prove that claim detail deep links can render populated session data for validation review.",
    desktopTarget: "Claim status, confidence, explanation, speaker/time context, and next actions stay grouped around the quote.",
    mobileTarget: "Full-screen detail keeps back/next and source evidence near the claim.",
    reviewAnchor: "Does populated claim detail feel like a continuation of the current session?",
  },
  {
    id: "route-session-detail-marker-populated",
    title: "Marker Detail Populated",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-marker-populated.png",
    sourcePath: "app/session/detail/[type]/[id]/page.tsx; components/session/validation-sample-hydrator.tsx; components/session/item-detail.tsx",
    screenshotStatus: "current",
    screenshotNote: "Direct route capture hydrated from validation sample cable_008 so marker detail shows the loaded-language occurrence and session speaker context.",
    missingStates: [],
    x: 300,
    y: 3680,
    userJob: "Inspect the exact rhetorical pattern Yentl marked.",
    screenJob: "Prove that marker detail deep links can render populated session data for validation review.",
    desktopTarget: "Pattern, quote, severity, speaker/time context, and learning route stay inspectable.",
    mobileTarget: "Marker detail reads as one focused pattern card with a clear return path.",
    reviewAnchor: "Does populated marker detail make the pattern and quote relationship obvious?",
  },
  {
    id: "route-session-learn-claim-populated",
    title: "Claim Learn Populated",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-claim-populated.png",
    sourcePath: "app/session/learn/[type]/[id]/page.tsx; components/session/validation-sample-hydrator.tsx; components/session/claim-learn-more.tsx",
    screenshotStatus: "current",
    screenshotNote: "Direct learn-route capture hydrated from validation sample cable_008 so the claim learning page has the current claim available.",
    missingStates: ["source-backed claim examples when replay sources are present"],
    x: 560,
    y: 3680,
    userJob: "Learn why a specific claim was classified the way it was.",
    screenJob: "Connect the educational layer back to the actual hydrated claim.",
    desktopTarget: "Learning context, current claim, and source/evidence explanation appear together.",
    mobileTarget: "Learning detail stays readable without losing the current claim.",
    reviewAnchor: "Does the populated claim learning route teach without detaching from the claim?",
  },
  {
    id: "route-session-learn-marker-populated",
    title: "Marker Learn Populated",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-marker-populated.png",
    sourcePath: "app/session/learn/[type]/[id]/page.tsx; components/session/validation-sample-hydrator.tsx; components/session/marker-learn-more.tsx",
    screenshotStatus: "current",
    screenshotNote: "Direct learn-route capture hydrated from validation sample cable_008 so loaded-language education includes an occurrence from the current session.",
    missingStates: [],
    x: 820,
    y: 3680,
    userJob: "Learn a rhetoric marker and jump back to the detected occurrence.",
    screenJob: "Connect marker education to session occurrences rather than a generic glossary only.",
    desktopTarget: "Definition, how-to-spot bullets, reading links, and current occurrences are all visible.",
    mobileTarget: "One concept per screen, with the current occurrence below the teaching card.",
    reviewAnchor: "Does marker learning now feel grounded in this session?",
  },
  {
    id: "route-session-detail-claim-populated-mobile",
    title: "Claim Detail Populated Mobile",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-claim-populated-mobile.png",
    sourcePath: "docs/superpowers/validation/screenshots/route-session-detail-claim-populated-mobile.png; components/session/item-detail.tsx",
    screenshotStatus: "current",
    screenshotNote: "390px mobile capture of the hydrated claim detail route.",
    missingStates: ["claim source expansion for replay samples with sources"],
    x: 1080,
    y: 3680,
    userJob: "Inspect a current claim on a phone-sized viewport.",
    screenJob: "Prove the populated claim detail route survives narrow layout constraints.",
    desktopTarget: "Desktop target is covered by the populated claim detail capture.",
    mobileTarget: "Claim quote, score, explanation, and session actions stack without horizontal crop.",
    reviewAnchor: "Can the claim be read and acted on at 390px?",
  },
  {
    id: "route-session-detail-marker-populated-mobile",
    title: "Marker Detail Populated Mobile",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-detail-marker-populated-mobile.png",
    sourcePath: "docs/superpowers/validation/screenshots/route-session-detail-marker-populated-mobile.png; components/session/item-detail.tsx",
    screenshotStatus: "current",
    screenshotNote: "390px mobile capture of the hydrated marker detail route.",
    missingStates: [],
    x: 1340,
    y: 3680,
    userJob: "Inspect a current marker on a phone-sized viewport.",
    screenJob: "Prove the populated marker detail route survives narrow layout constraints.",
    desktopTarget: "Desktop target is covered by the populated marker detail capture.",
    mobileTarget: "Pattern, quote, severity, and learning action stay readable without horizontal crop.",
    reviewAnchor: "Can the marker be understood and acted on at 390px?",
  },
  {
    id: "route-session-learn-claim-populated-mobile",
    title: "Claim Learn Populated Mobile",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-claim-populated-mobile.png",
    sourcePath: "docs/superpowers/validation/screenshots/route-session-learn-claim-populated-mobile.png; components/session/claim-learn-more.tsx",
    screenshotStatus: "current",
    screenshotNote: "390px mobile capture of the hydrated claim learning route.",
    missingStates: ["source-backed claim examples when replay sources are present"],
    x: 40,
    y: 3878,
    userJob: "Learn about a current claim on a phone-sized viewport.",
    screenJob: "Prove claim learning remains connected to session data on mobile.",
    desktopTarget: "Desktop target is covered by the populated claim learn capture.",
    mobileTarget: "Current claim and learning copy stack without hiding the return path.",
    reviewAnchor: "Does claim learning remain legible and grounded at 390px?",
  },
  {
    id: "route-session-learn-marker-populated-mobile",
    title: "Marker Learn Populated Mobile",
    branch: "Populated dynamic route review",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-learn-marker-populated-mobile.png",
    sourcePath: "docs/superpowers/validation/screenshots/route-session-learn-marker-populated-mobile.png; components/session/marker-learn-more.tsx",
    screenshotStatus: "current",
    screenshotNote: "390px mobile capture of the hydrated marker learning route after fixing the long-heading overflow.",
    missingStates: [],
    x: 300,
    y: 3878,
    userJob: "Learn about a current rhetoric marker on a phone-sized viewport.",
    screenJob: "Prove marker learning remains connected to session occurrences on mobile.",
    desktopTarget: "Desktop target is covered by the populated marker learn capture.",
    mobileTarget: "Definition, how-to-spot bullets, reading links, and occurrences fit without horizontal crop.",
    reviewAnchor: "Does marker learning stay usable at 390px?",
  },
];

function mobileRouteScreenshotPath(screenshot: string): string {
  return screenshot.replace(/\.png$/, "-mobile.png");
}

const flowNodes: FlowNode[] = [
  {
    id: "promo",
    title: "Promo / Product Page",
    branch: "Public entry",
    screenshot: "/visual-evidence/flow-screenshots/current/public-homepage-full.png",
    sourcePath: "app/page.tsx",
    screenshotStatus: "current",
    screenshotNote: "Current public homepage now includes hero, examples, source paths, method, feature, trust, pricing, FAQ, and guest/account entry routes. Desktop full-page capture refreshed 2026-05-25.",
    missingStates: ["mobile promo capture"],
    x: 40,
    y: 380,
    children: ["auth", "promo-anchors", "source"],
    userJob: "Understand what Yentl does, see examples, then decide whether to try the demo or create an account.",
    screenJob: "Explain the product promise, use cases, proof moments, features, trust posture, pricing, and FAQ before routing inward.",
    desktopTarget: "Promo is an actual product page: hero, examples, live-demo proof, five ways in, features, privacy, pricing, and FAQ.",
    mobileTarget: "A scannable product story with sticky/simple CTA, examples, trust cues, and no assumption that the user is already in-session.",
    reviewAnchor: "Does the public page sell and explain Yentl before asking the user to enter the app?",
  },
  {
    id: "promo-anchors",
    title: "Promo Section Anchors",
    branch: "Public entry",
    screenshot: "/visual-evidence/flow-screenshots/current/public-homepage-full.png",
    sourcePath: "app/page.tsx",
    screenshotStatus: "current",
    screenshotNote: "Homepage nav now jumps to examples, ways-in, method, trust, pricing, and FAQ sections, with direct session/demo/methodology/pricing/FAQ links.",
    missingStates: [],
    x: 330,
    y: 330,
    children: ["promo-trust", "source"],
    userJob: "Skim the product story without being forced directly into a session.",
    screenJob: "Show what each public section contributes before the user chooses demo, sign up, or sign in.",
    desktopTarget: "Each nav anchor lands on a complete section with real examples, method proof, trust copy, pricing, and FAQ.",
    mobileTarget: "Section jumps keep context and always leave a clear route to demo/sign-up.",
    reviewAnchor: "Can a reviewer inspect the full public product story, not only the first viewport?",
  },
  {
    id: "promo-trust",
    title: "Trust / Method / Pricing",
    branch: "Public entry",
    screenshot: "/visual-evidence/flow-screenshots/current/public-homepage-full.png",
    sourcePath: "app/page.tsx; app/pricing/page.tsx; app/faq/page.tsx; app/contact/page.tsx; app/privacy/page.tsx; app/accessibility/page.tsx",
    screenshotStatus: "current",
    screenshotNote: "Trust route set now includes methodology, privacy, terms, subprocessors, accessibility, contact, pricing, and FAQ. Pricing and FAQ routes were added in the 2026-05-25 completion pass.",
    missingStates: ["mobile trust route captures"],
    x: 40,
    y: 590,
    children: ["auth", "source"],
    userJob: "Decide whether Yentl is trustworthy enough to use on consequential material.",
    screenJob: "Explain evidence handling, privacy, limitations, pricing, accessibility, and the audit posture in plain language.",
    desktopTarget: "Trust surfaces are readable product pages tied directly to source capture and saved-session behavior.",
    mobileTarget: "Short sections, expandable details, and persistent return-to-demo/account actions.",
    reviewAnchor: "Does trust feel product-specific instead of boilerplate legal furniture?",
  },
  {
    id: "auth",
    title: "Sign in / Sign up",
    branch: "Account",
    screenshot: "/visual-evidence/flow-screenshots/current/auth-signin-fallback.png",
    sourcePath: "app/signin/[[...rest]]/page.tsx; app/signup/[[...rest]]/page.tsx",
    screenshotStatus: "current",
    screenshotNote: "Auth routes now render user-facing guest-first fallback states when Clerk is absent, and configured Clerk deployments get product context panels with guest/privacy exits.",
    missingStates: ["configured-Clerk error capture", "configured-Clerk recovery capture", "post-auth redirect"],
    x: 330,
    y: 110,
    children: ["auth-recovery", "post-auth-redirect", "guest-demo"],
    userJob: "Know why an account matters before creating one.",
    screenJob: "Connect auth to saved sessions, exports, cross-device sync, and privacy.",
    desktopTarget: "Auth is compact and tied to value; it should not feel like a wall before the product.",
    mobileTarget: "Guest continuation, recovery, and privacy wording stay visible above the fold.",
    reviewAnchor: "Does account creation feel useful rather than arbitrary friction?",
  },
  {
    id: "auth-recovery",
    title: "Auth Errors / Recovery",
    branch: "Account",
    screenshot: "/visual-evidence/flow-screenshots/current/landing.png",
    sourcePath: "Target state missing: sign-in error, password reset, email verification, and post-auth redirect captures.",
    screenshotStatus: "missing",
    screenshotNote: "Auth error and recovery states are not captured. This node prevents the map from pretending auth is one happy path.",
    missingStates: ["invalid credentials", "forgot password", "email verification", "expired session", "post-auth redirect", "mobile auth recovery"],
    x: 40,
    y: 190,
    children: ["source"],
    userJob: "Recover from account friction and still understand how to reach the product.",
    screenJob: "Make errors actionable, privacy copy visible, and route the user back to the intended source/session.",
    desktopTarget: "Recovery states preserve destination context and explain what is saved or not saved while unauthenticated.",
    mobileTarget: "Recovery controls remain thumb-reachable with clear email/app handoff states.",
    reviewAnchor: "Does account friction preserve momentum instead of losing the user's intended task?",
  },
  {
    id: "post-auth-redirect",
    title: "Post-Auth Redirect",
    branch: "Account",
    screenshot: "/visual-evidence/flow-screenshots/current/source-picker.png",
    sourcePath: "Target state missing: post-auth return state that preserves the user's intended source/session.",
    screenshotStatus: "missing",
    screenshotNote: "The spec calls out post-auth redirect as a visible state. The atlas now keeps it separate from sign-in so auth cannot silently dump users into a generic page.",
    missingStates: ["return to chosen source", "resume interrupted session", "save/export after login", "redirect failure", "mobile app/browser return"],
    x: 40,
    y: 0,
    children: ["source"],
    userJob: "Return to the task that prompted sign-in.",
    screenJob: "Preserve source choice, session context, and save/export intent after authentication.",
    desktopTarget: "A short transition or restored source picker confirms what was preserved and what the user can do next.",
    mobileTarget: "Mobile returns from email/browser/app auth without losing share/import context.",
    reviewAnchor: "Does auth return the user to the reason they signed in?",
  },
  {
    id: "guest-demo",
    title: "Guest / Live Demo",
    branch: "Account",
    screenshot: "/visual-evidence/flow-screenshots/current/guest-demo-entry.png",
    sourcePath: "app/demo/page.tsx",
    screenshotStatus: "current",
    screenshotNote: "Guest demo route now explains what works without an account, what persists locally, and offers a prepared text sample plus source-picker exit.",
    missingStates: ["mobile guest continuation capture", "save requires account capture for configured account deployments"],
    x: 40,
    y: 790,
    children: ["source"],
    userJob: "Try Yentl before committing to account creation.",
    screenJob: "Expose the product quickly while explaining what will not persist until sign-up.",
    desktopTarget: "Demo mode opens a believable sample or live source path with save/export expectations made clear.",
    mobileTarget: "Guest mode keeps a short path into share/import/mic while protecting unsaved work.",
    reviewAnchor: "Can a skeptical first-time user experience value before creating an account?",
  },
  {
    id: "source",
    title: "Source Choice",
    branch: "Home",
    screenshot: "/visual-evidence/flow-screenshots/current/source-picker.png",
    sourcePath: "docs/superpowers/validation/screenshots/source-picker-desktop-chrome-variant.png",
    screenshotStatus: "current",
    screenshotNote: "Current platform-aware source picker. Desktop Chrome now gets current-tab capture, grouped source jobs, and clean user-facing alternatives; mobile and non-Chrome variants have separate captures below.",
    missingStates: [],
    x: 330,
    y: 590,
    children: ["source-selected", "source-unavailable", "mobile-share-sheet"],
    userJob: "Pick the right path for the media in front of them.",
    screenJob: "Route by use case: video URL, any browser page, file, mic, document, or media URL.",
    desktopTarget: "Choices are grouped by user job, with the recommended path and recovery paths clear.",
    mobileTarget: "Source selection becomes a short task launcher, not six identical cards squeezed down.",
    reviewAnchor: "Does the screen reduce decision burden instead of multiplying it?",
  },
  {
    id: "source-selected",
    title: "Source Selected",
    branch: "Home",
    screenshot: "/visual-evidence/flow-screenshots/current/source-picker.png",
    sourcePath: "docs/superpowers/validation/screenshots/source-picker-desktop-chrome-variant.png",
    screenshotStatus: "current",
    screenshotNote: "Source choice and active-session source switching now have explicit user-facing states. Switching from an active session opens a confirmation dialog with save/export exits before reset.",
    missingStates: [],
    x: 330,
    y: 790,
    children: ["youtube", "extension", "audio", "mic", "document", "media-url", "claim-quick-check"],
    userJob: "Confirm the chosen source path and see what happens next.",
    screenJob: "Turn the source picker into clean source launchers and protect active work before a source change.",
    desktopTarget: "Selected source paths route to their setup panes, and active sessions require a save/export/confirm choice before reset.",
    mobileTarget: "Selection works as a launcher with one recommended path visible at a time.",
    reviewAnchor: "Does choosing a source preview the reward instead of only changing button color?",
  },
  {
    id: "source-unavailable",
    title: "Unavailable / Platform Limits",
    branch: "Home",
    screenshot: "/visual-evidence/flow-screenshots/current/source-picker.png",
    sourcePath: "docs/superpowers/validation/screenshots/source-picker-desktop-other-variant.png",
    screenshotStatus: "current",
    screenshotNote: "Desktop non-Chrome now shows the Chrome-only limit, keeps link/upload/text/mic/media alternatives available, and offers the Chrome extension as an alternate path instead of implying current-browser capture.",
    missingStates: [],
    x: 330,
    y: 980,
    children: ["mobile-share-sheet", "extension"],
    userJob: "Understand why a source path is unavailable and what alternative to use.",
    screenJob: "Explain platform limits without blaming the user or implying unsupported app-audio capture.",
    desktopTarget: "Unavailable states route to the next honest path: extension, upload, media URL, paste transcript, or mic.",
    mobileTarget: "Show share sheet, file import, microphone, URL, and document options without promising arbitrary other-app audio capture.",
    reviewAnchor: "Are Chrome, iOS, Android, and mobile-web limits represented honestly?",
  },
  {
    id: "mobile-share-sheet",
    title: "Mobile Share / Import",
    branch: "Mobile entry",
    screenshot: "/visual-evidence/flow-screenshots/landing-mobile.png",
    sourcePath: "docs/superpowers/validation/screenshots/mobile-share-target-text-prefill-390.png",
    screenshotStatus: "current",
    screenshotNote: "Mobile variants now have dedicated source-picker states for iOS Share Sheet handoff, Android share intents, generic mobile web, file import, text, links, microphone, and explicit no-tab-capture limits. The web app manifest registers Yentl as a share target and routes shared title/text/url payloads into the matching source pane.",
    missingStates: [],
    x: 40,
    y: 980,
    children: ["document", "media-url", "mic"],
    userJob: "Send source material into Yentl from a phone or tablet.",
    screenJob: "Bridge native share/import/mic flows into the same analysis contract.",
    desktopTarget: "Desktop docs still explain mobile parity and platform limits clearly.",
    mobileTarget: "Native-feeling share/import entry routes into source-specific reward previews.",
    reviewAnchor: "Does mobile have honest first-class entry points instead of desktop leftovers?",
  },
  {
    id: "youtube",
    title: "YouTube URL Entry",
    branch: "Input state",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-preview-identity.png",
    sourcePath: "components/session/ingest-panes/youtube-ingest-pane.tsx",
    screenshotStatus: "current",
    screenshotNote: "Current YouTube entry uses a destination-shaped pane with URL readiness, identity preview, caption-fetch action, and recovery paths.",
    missingStates: ["paste from clipboard", "mobile URL entry capture"],
    x: 640,
    y: 40,
    children: ["youtube-preview-shell", "youtube-invalid-url", "youtube-no-captions"],
    userJob: "Paste a YouTube link while understanding what reward comes next.",
    screenJob: "Accept the URL inside a destination-shaped review surface, not inside an empty utility hallway.",
    desktopTarget: "The input belongs inside a preview of the eventual video-analysis workspace: video well, evidence rail, transcript ghost rows, and source/claim counters as placeholders.",
    mobileTarget: "The link field should sit in a compact preview shell with a video placeholder, bottom-sheet analysis preview, and reassuring next-step copy.",
    reviewAnchor: "Where does the user paste the link, and does that room feel as designed as the destination?",
  },
  {
    id: "youtube-preview-shell",
    title: "YouTube Preview Shell",
    branch: "Before submit",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-preview-identity.png",
    sourcePath: "components/session/ingest-panes/youtube-ingest-pane.tsx",
    screenshotStatus: "current",
    screenshotNote: "The YouTube pane now has a pre-submit video preview shell with URL readiness, thumbnail area, and recovery ladder. Current capture shows the resolved identity state; empty shell remains in the same component.",
    missingStates: ["transcript ghost rows", "claim/evidence placeholder rail", "mobile preview shell capture"],
    x: 900,
    y: 40,
    children: ["youtube-valid-preview"],
    userJob: "See the destination before committing the link.",
    screenJob: "Show where the video, transcript, claims, markers, and Yentl's read will appear once the link resolves.",
    desktopTarget: "Use the watch layout as scaffolding before a video exists: the link input occupies the video area or sits as the main action within that visual system.",
    mobileTarget: "Preview the reward in one screen: video placeholder first, link field second, evidence layers hinted but inactive.",
    reviewAnchor: "Does the empty state promise the destination instead of collapsing into a bare form?",
  },
  {
    id: "youtube-valid-preview",
    title: "Valid URL Preview",
    branch: "Before submit",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-preview-identity.png",
    sourcePath: "components/session/ingest-panes/youtube-ingest-pane.tsx; app/api/youtube-preview/route.ts",
    screenshotStatus: "current",
    screenshotNote: "Valid YouTube URLs now resolve title, channel, thumbnail, video id, and thumbnail provenance before caption fetch. Caption availability is explicitly deferred to the fetch step.",
    missingStates: ["duration", "caption availability precheck", "edit URL confirmation"],
    x: 1160,
    y: 40,
    children: ["youtube-processing"],
    userJob: "Confirm Yentl found the intended video before spending time analyzing it.",
    screenJob: "Validate URL shape, identity, thumbnail, and caption availability inside the destination shell.",
    desktopTarget: "A validated source card appears beside the video placeholder, with edit and continue controls.",
    mobileTarget: "Compact metadata card sits between the URL field and the first progress stage.",
    reviewAnchor: "Can the user catch a wrong or malformed YouTube link before processing?",
  },
  {
    id: "youtube-invalid-url",
    title: "Invalid URL",
    branch: "Error path",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-url-entry.png",
    sourcePath: "Target state missing: invalid, unsupported, private, and non-video URL errors.",
    screenshotStatus: "missing",
    screenshotNote: "Invalid URL handling must keep the target shell visible and explain how to recover.",
    missingStates: ["malformed URL", "private video", "playlist/channel URL", "shorts/embed normalization", "paste example", "mobile keyboard state"],
    x: 640,
    y: 1130,
    children: ["youtube"],
    userJob: "Fix the URL without losing confidence in the product.",
    screenJob: "Explain exactly what Yentl can read and provide examples plus alternate capture paths.",
    desktopTarget: "Inline error appears in the preview shell with example URLs and no layout collapse.",
    mobileTarget: "Error copy sits near the keyboard field and leaves fallback actions visible.",
    reviewAnchor: "Does a bad URL teach the next move instead of ending the branch?",
  },
  {
    id: "youtube-processing",
    title: "Link Resolving",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-processing-overview.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/09-after-process-redirect.png",
    screenshotStatus: "reference",
    screenshotNote: "Existing post-process/overview capture, not a complete staged build-up. Needs distinct resolving, captions, transcript, extraction, verification, and ready states.",
    missingStates: ["resolving metadata", "fetching captions", "building transcript", "extracting claims", "checking sources", "ready partial/complete"],
    x: 1420,
    y: 40,
    children: ["youtube-metadata"],
    userJob: "Know Yentl is fetching captions, metadata, transcript, and first-pass claims.",
    screenJob: "Animate the workspace filling in, with visible progress for metadata, captions, transcript, claims, and source search.",
    desktopTarget: "The page should build up in place around the future player, not jump from form to finished analysis without orientation.",
    mobileTarget: "Use stacked progress states and keep the eventual watch surface visible enough to preserve momentum.",
    reviewAnchor: "Does the build-up make the analysis feel alive and worth waiting for?",
  },
  {
    id: "youtube-metadata",
    title: "Resolving Metadata",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-preview-identity.png",
    sourcePath: "app/api/youtube-preview/route.ts; lib/server/youtube-oembed.ts",
    screenshotStatus: "current",
    screenshotNote: "Metadata resolution now runs through a dedicated preview API. The UI shows resolved identity and whether the thumbnail came from YouTube oEmbed or the static YouTube thumbnail fallback.",
    missingStates: ["timeout/retry", "mobile progress capture"],
    x: 1680,
    y: 40,
    children: ["youtube-captions"],
    userJob: "Know the system is identifying the video and source metadata.",
    screenJob: "Show source metadata progress before transcript/caption work begins.",
    desktopTarget: "Source card fills in progressively with clear retry if metadata fails.",
    mobileTarget: "Single-stage progress card with source identity ghost state.",
    reviewAnchor: "Is the metadata stage visible and distinguishable from later analysis?",
  },
  {
    id: "youtube-captions",
    title: "Fetching Captions",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-processing-overview.png",
    sourcePath: "Target state missing: caption fetch stage with no-caption branch.",
    screenshotStatus: "missing",
    screenshotNote: "Caption availability and failure routes need an exact state, not a hidden server dependency.",
    missingStates: ["caption language selection", "caption unavailable", "auto-caption warning", "blocked caption retry", "mobile caption stage"],
    x: 1940,
    y: 40,
    children: ["youtube-transcript-build", "youtube-no-captions"],
    userJob: "See whether captions are available and what language/quality Yentl found.",
    screenJob: "Make caption fetch a named, recoverable step with visible fallback routes.",
    desktopTarget: "Caption status sits near the transcript rail and can branch cleanly to fallback.",
    mobileTarget: "Caption result is a concise step with one best fallback action.",
    reviewAnchor: "Can the user tell whether caption access, not Yentl itself, is the blocker?",
  },
  {
    id: "youtube-transcript-build",
    title: "Transcript Building",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-processing-overview.png",
    sourcePath: "Target state missing: transcript rows filling in from fetched captions.",
    screenshotStatus: "missing",
    screenshotNote: "The transcript build-up needs staged row population, partial success, and failure capture.",
    missingStates: ["partial transcript rows", "speaker/timestamp preparation", "language warning", "transcript parse error", "mobile transcript skeleton"],
    x: 2200,
    y: 40,
    children: ["youtube-claim-extraction"],
    userJob: "Watch useful material arrive before final verification completes.",
    screenJob: "Fill the transcript rail progressively and show when enough text exists to continue.",
    desktopTarget: "Transcript ghost rows become real rows while the video card remains stable.",
    mobileTarget: "Transcript preview appears below the video shell without pushing progress offscreen.",
    reviewAnchor: "Does the waiting state become informative instead of dead time?",
  },
  {
    id: "youtube-claim-extraction",
    title: "Extracting Claims",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-processing-overview.png",
    sourcePath: "Target state missing: claim extraction queue stage.",
    screenshotStatus: "missing",
    screenshotNote: "Claim extraction needs a named state with provisional claims and status semantics.",
    missingStates: ["provisional claim queue", "quote anchors", "confidence skeleton", "no claims found", "mobile claim queue"],
    x: 2460,
    y: 40,
    children: ["youtube-verification"],
    userJob: "See what Yentl thinks is worth checking before final evidence lands.",
    screenJob: "Show candidate claims as provisional, anchored to exact transcript moments.",
    desktopTarget: "Claim cards appear as in-progress objects, not final verdicts.",
    mobileTarget: "Candidate claims are short, expandable, and clearly still checking.",
    reviewAnchor: "Are preliminary claims labeled as provisional and anchored to the source?",
  },
  {
    id: "youtube-verification",
    title: "Verifying Sources",
    branch: "Build-up",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-processing-overview.png",
    sourcePath: "Target state missing: evidence/source search stage with no final unverifiable verdict.",
    screenshotStatus: "missing",
    screenshotNote: "Verification status must show evidence quality and avoid ending the user-facing result as 'unverifiable'.",
    missingStates: ["source search in progress", "validated thumbnail found", "no valid backing found", "mixed/caveated result", "still checking", "Devil's Advocate queued"],
    x: 2720,
    y: 40,
    children: ["youtube-ready"],
    userJob: "Understand what evidence Yentl is searching and when a conclusion is still provisional.",
    screenJob: "Show source search, evidence quality, Devil's Advocate challenge, and final status vocabulary.",
    desktopTarget: "Evidence cards fill with validated thumbnails or explicit no-thumbnail/no-backing reasons.",
    mobileTarget: "Source status is compact, but still distinguishes supported, contradicted, mixed, no backing, and still checking.",
    reviewAnchor: "Does the verification stage avoid a lazy final 'unverifiable' label?",
  },
  {
    id: "youtube-ready",
    title: "Video Ready",
    branch: "Loaded source",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-player-ready.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/12-watch-view-rendering.png",
    screenshotStatus: "reference",
    screenshotNote: "Existing loaded-video proof, but final ready state needs the intended video/source card, source thumbnail, transcript count, and explicit next action.",
    missingStates: ["metadata validated", "thumbnail trusted", "analysis ready", "playback blocked", "wrong video / edit URL"],
    x: 2980,
    y: 40,
    children: ["video-review", "youtube-playback-blocked", "youtube-edit-url"],
    userJob: "Confirm this is the right video and understand what Yentl has prepared.",
    screenJob: "Show source metadata, playable video, transcript count, initial claims/markers, and the route into live review.",
    desktopTarget: "Video is dominant, with ready-state metrics and no buried confirmation step.",
    mobileTarget: "Video thumbnail/player, source identity, and start-analysis controls fit in a single confident stack.",
    reviewAnchor: "Can the user see the video is ready before the analysis starts landing?",
  },
  {
    id: "youtube-playback-blocked",
    title: "Playback Blocked",
    branch: "Error path",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-no-captions.png",
    sourcePath: "Target state missing: blocked player, embeds disabled, age/private/restricted video recovery.",
    screenshotStatus: "missing",
    screenshotNote: "A ready analysis can still face playback problems; the atlas needs the recovery state.",
    missingStates: ["embed disabled", "private/age restricted", "open on YouTube", "continue transcript-only", "mobile blocked playback"],
    x: 3500,
    y: 260,
    children: ["video-review"],
    userJob: "Continue reviewing even if the embedded player cannot load.",
    screenJob: "Separate playback limitations from transcript/evidence availability and offer a sensible route.",
    desktopTarget: "The video well explains the block while transcript, claims, and evidence remain usable.",
    mobileTarget: "Show open-source and transcript-only continuation actions without hiding the reason.",
    reviewAnchor: "Does playback failure preserve analysis instead of looking like total failure?",
  },
  {
    id: "youtube-edit-url",
    title: "Wrong Video / Edit URL",
    branch: "Correction path",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-player-ready.png",
    sourcePath: "Target state missing: edit-source drawer or confirmation state.",
    screenshotStatus: "missing",
    screenshotNote: "The user needs a correction path when the parsed video is not the intended source.",
    missingStates: ["edit URL drawer", "discard current analysis", "keep old session", "replace source confirmation", "mobile edit sheet"],
    x: 3500,
    y: 450,
    children: ["youtube"],
    userJob: "Fix a wrong source without silently destroying work.",
    screenJob: "Make source replacement explicit and preserve or discard current analysis by choice.",
    desktopTarget: "Edit-source appears as a drawer/dialog with clear consequences.",
    mobileTarget: "A bottom sheet confirms whether to replace the source or start a new session.",
    reviewAnchor: "Can the user correct a wrong video safely?",
  },
  {
    id: "youtube-no-captions",
    title: "Caption Fallback",
    branch: "Error path",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-no-captions.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/06b-youtube-no-captions-error.png",
    screenshotStatus: "reference",
    screenshotNote: "Recovery branch exists, but target should keep the source context and route to browser capture, upload, media URL, or transcript without feeling like a dead end.",
    missingStates: ["browser capture fallback", "upload downloaded audio/video", "paste transcript fallback", "try another URL", "diagnostics details"],
    x: 900,
    y: 1280,
    children: ["media-url", "audio"],
    userJob: "Recover when YouTube captions are missing or blocked.",
    screenJob: "Explain what failed and offer browser-tab capture, upload, media URL, or manual transcript without losing the source context.",
    desktopTarget: "Fallback feels like a guided alternate route within the same destination shell, not an abrupt dead end.",
    mobileTarget: "Show the error, best alternate path, and one-tap retry/share-sheet alternatives.",
    reviewAnchor: "Does the fallback keep the user moving with dignity?",
  },
  {
    id: "extension",
    title: "Chrome Extension",
    branch: "Any browser page",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-realistic-page-preview.png",
    screenshotStatus: "reference",
    screenshotNote: "Representative extension preview. Still needs installed-extension proof, live same-page capture states, and real site variants.",
    missingStates: ["extension popup closed/open", "panel injected", "capture permission", "audio meter", "article-only text capture", "live video capture"],
    x: 640,
    y: 330,
    children: ["extension-install", "extension-popup"],
    userJob: "Analyze the page or playing tab without losing context.",
    screenJob: "Show selected tab, page source, capture status, and analysis in one relationship.",
    desktopTarget: "The page remains visible; Yentl overlays analysis without swallowing the original content.",
    mobileTarget: "Mobile browser/extension limits are explicit; use share sheet and app handoff honestly.",
    reviewAnchor: "Does the extension path feel like same-context analysis, not a detached popup?",
  },
  {
    id: "extension-install",
    title: "Extension Install / Options",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-surface.png",
    screenshotStatus: "reference",
    screenshotNote: "Reference panel exists, but installed-proof, options origin setup, privacy, diagnostics, and permissions states need separate captures.",
    missingStates: ["installed proof", "origin setup", "privacy copy", "diagnostics", "permission denied", "mobile unavailable alternative"],
    x: 900,
    y: 330,
    children: ["extension-popup"],
    userJob: "Know the extension is installed, connected, and pointed at the correct local/app origin.",
    screenJob: "Make setup, permissions, privacy, and diagnostics visible before capture starts.",
    desktopTarget: "Options page has app-origin, language, capture behavior, privacy, and diagnostics grouped clearly.",
    mobileTarget: "Mobile equivalents explain extension unavailability and route to share/import.",
    reviewAnchor: "Can a reviewer prove the extension is installed and configured?",
  },
  {
    id: "extension-popup",
    title: "Extension Popup",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-demo-analysis.png",
    screenshotStatus: "reference",
    screenshotNote: "Representative popup/panel evidence, but real popup closed/open and target-tab states need current captures.",
    missingStates: ["popup closed", "popup open", "target tab detected", "start capture", "stop capture", "permission error"],
    x: 1160,
    y: 330,
    children: ["extension-panel"],
    userJob: "Start analysis from the page currently in view.",
    screenJob: "Show target tab, page identity, capture readiness, and the route into side-panel/workspace analysis.",
    desktopTarget: "Popup is small but precise: current tab, capture mode, audio status, start/stop, and open workspace.",
    mobileTarget: "Explain that mobile uses native share/import, not Chrome extension capture.",
    reviewAnchor: "Does the popup make the selected source and next action unmistakable?",
  },
  {
    id: "extension-panel",
    title: "Same-Page Panel",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-same-page-preview.png",
    screenshotStatus: "reference",
    screenshotNote: "Same-page panel preview exists, but needs article, video, YouTube, and live sync variants.",
    missingStates: ["panel injected", "real article", "real video page", "YouTube page", "narrow panel", "open full workspace"],
    x: 1420,
    y: 330,
    children: ["extension-text-capture", "extension-audio-permission"],
    userJob: "Keep the original page visible while Yentl analyzes it.",
    screenJob: "Anchor analysis beside the page instead of disconnecting into an unrelated tab.",
    desktopTarget: "The panel coexists with the page, with source identity and active mode always visible.",
    mobileTarget: "Mobile maps this same idea to share/import plus in-app reader/review.",
    reviewAnchor: "Does Yentl live beside the source rather than replacing it?",
  },
  {
    id: "extension-text-capture",
    title: "Page Text Detected",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/real-webpage-wikinews-text-candidate.png",
    screenshotStatus: "reference",
    screenshotNote: "Real-page candidate evidence exists, but text detection needs exact highlight/source-readback states.",
    missingStates: ["article text detected", "selection highlight", "source thumbnail validation", "claim anchors", "reader/full workspace handoff"],
    x: 1680,
    y: 330,
    children: ["extension-transcript-tab", "article-review"],
    userJob: "Analyze an article/page without copying text manually.",
    screenJob: "Show detected page text, source metadata, and the claims/markers Yentl can derive.",
    desktopTarget: "Article text remains visible with highlight anchors and side-panel analysis.",
    mobileTarget: "Share-sheet import opens a readable article surface with the same anchors.",
    reviewAnchor: "Can page text capture be audited against the visible article?",
  },
  {
    id: "extension-audio-permission",
    title: "Audio Permission",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-tab-waiting.png",
    sourcePath: "docs/superpowers/validation/screenshots/browser-tab-permission-recovery.png",
    screenshotStatus: "current",
    screenshotNote: "App-side selected-tab permission denial now lands in a recovery card with upload, media URL, paste text, and microphone alternatives. Selected-tab-changed status is implemented separately in browser-tab-selected-tab-changed-recovery.png. The exact Chrome permission prompt still needs capture from the extension surface.",
    missingStates: ["capture permission prompt", "diagnostic details"],
    x: 1680,
    y: 520,
    children: ["extension-audio-meter", "extension-no-audio"],
    userJob: "Grant capture safely and understand what Yentl can hear.",
    screenJob: "Make permission, selected tab, source title, and privacy guarantees obvious.",
    desktopTarget: "Permission state is tied to the visible page and a clear audio-health meter.",
    mobileTarget: "Equivalent mobile copy routes to microphone/share/import rather than tab audio.",
    reviewAnchor: "Does capture permission feel controlled and source-specific?",
  },
  {
    id: "extension-audio-meter",
    title: "Audio Meter Active",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-sample.png",
    sourcePath: "docs/superpowers/validation/screenshots/browser-pane-working-sample-loaded.png",
    screenshotStatus: "reference",
    screenshotNote: "Working sample proves browser capture, but the active audio meter state still needs an exact extension panel capture.",
    missingStates: ["responsive audio meter", "live transcript", "capture health", "stop/retry", "workspace sync"],
    x: 1940,
    y: 520,
    children: ["extension-transcript-tab", "video-review"],
    userJob: "Know Yentl is actually hearing the tab.",
    screenJob: "Use audio activity, transcript lines, and capture status as proof of live work.",
    desktopTarget: "Meter, transcript, claims queue, and source page stay visually linked.",
    mobileTarget: "Mobile live mode uses microphone meter instead of tab meter.",
    reviewAnchor: "Is there visible proof that tab audio is being captured now?",
  },
  {
    id: "extension-no-audio",
    title: "No Audio Detected",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-tab-waiting.png",
    sourcePath: "docs/superpowers/validation/screenshots/browser-tab-no-audio-recovery.png",
    screenshotStatus: "current",
    screenshotNote: "No-audio browser capture now explains that Yentl connected but did not hear usable speech, then routes to upload, media URL, paste text, or microphone.",
    missingStates: ["audio meter diagnosis", "selected tab identity", "retry exact tab"],
    x: 2200,
    y: 520,
    children: ["audio", "media-url"],
    userJob: "Fix capture when nothing is coming through.",
    screenJob: "Diagnose likely causes and route to an alternate source path without losing context.",
    desktopTarget: "No-audio state shows checklist, meter, retry, and upload/media-url alternatives.",
    mobileTarget: "Offer share/import/mic alternatives with platform-honest explanation.",
    reviewAnchor: "Does no-audio recovery tell the user what to do next?",
  },
  {
    id: "extension-transcript-tab",
    title: "Extension Transcript Tab",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-demo-analysis-full.png",
    screenshotStatus: "reference",
    screenshotNote: "Full panel evidence exists, but tab-level states for transcript, claims, markers, and highlights need exact captures.",
    missingStates: ["transcript tab", "search transcript", "timestamp jump", "speaker label", "live update", "mobile reader equivalent"],
    x: 2200,
    y: 330,
    children: ["extension-claims-tab", "extension-markers-tab", "extension-full-workspace"],
    userJob: "Inspect what Yentl heard or read inside the same-page panel.",
    screenJob: "Make transcript/source text scannable with highlight, timestamp, and jump behavior.",
    desktopTarget: "Transcript tab is compact but still provides search, highlight, and source jumps.",
    mobileTarget: "Use reader/search sheet after share/import.",
    reviewAnchor: "Can the panel transcript be audited without opening a full dashboard?",
  },
  {
    id: "extension-claims-tab",
    title: "Extension Claims Tab",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "Target state missing: extension claim tab with Devil's Advocate and thumbnail states.",
    screenshotStatus: "missing",
    screenshotNote: "Claims tab needs exact evidence cards, status vocabulary, Devil's Advocate, and no-thumbnail fallback in the constrained panel.",
    missingStates: ["claim list", "status filters", "source thumbnail", "no-thumbnail reason", "Devil's Advocate", "open workspace detail"],
    x: 2460,
    y: 330,
    children: ["extension-highlight-detail", "claim-detail"],
    userJob: "See the highest-value claims without leaving the page.",
    screenJob: "Summarize claim status and evidence in a small, auditable panel.",
    desktopTarget: "Claims tab uses compact rows with evidence status and open-detail actions.",
    mobileTarget: "Equivalent appears as a claims sheet after share/import.",
    reviewAnchor: "Does constrained claim review still preserve auditability?",
  },
  {
    id: "extension-markers-tab",
    title: "Extension Markers Tab",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "Target state missing: extension marker tab with icon and learning popover.",
    screenshotStatus: "missing",
    screenshotNote: "Markers tab needs iconography, rationale, quote context, and learning/detail popover states.",
    missingStates: ["marker list", "taxonomy icon", "severity filter", "quote context", "related markers", "reduced motion"],
    x: 2460,
    y: 520,
    children: ["extension-highlight-detail", "markers"],
    userJob: "Understand rhetorical markers while staying on the source page.",
    screenJob: "Keep markers educational, contextual, and clearly tied to source text/time.",
    desktopTarget: "Marker rows include icon, quote, severity, source jump, and learn-more affordance.",
    mobileTarget: "Markers become a compact learning sheet with one concept at a time.",
    reviewAnchor: "Does marker review teach instead of just labeling?",
  },
  {
    id: "extension-highlight-detail",
    title: "Highlight Detail",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "Target state missing: same-page highlight popover/sheet.",
    screenshotStatus: "missing",
    screenshotNote: "The source highlight popover/sheet is a required overlay and needs its own capture.",
    missingStates: ["highlight popover", "claim drawer", "marker drawer", "source quote", "jump/open workspace", "mobile sheet"],
    x: 2720,
    y: 250,
    children: ["claim-detail", "markers"],
    userJob: "Tap a highlighted source moment and understand exactly why it was marked.",
    screenJob: "Connect source quote, claim/marker rationale, and deeper review without losing page context.",
    desktopTarget: "Popover is anchored to the highlight and can promote to a full drawer/workspace.",
    mobileTarget: "Highlight opens a bottom sheet with quote, rationale, and next step.",
    reviewAnchor: "Do highlights explain themselves at the point of use?",
  },
  {
    id: "extension-export-menu",
    title: "Extension Export Menu",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "Target state missing: extension Markdown/JSON/report export menu.",
    screenshotStatus: "missing",
    screenshotNote: "The extension export path needs a constrained menu plus confirmation states.",
    missingStates: ["export menu", "Markdown download", "JSON download", "copy link", "open report preview", "failure/toast"],
    x: 2980,
    y: 520,
    children: ["export"],
    userJob: "Take the same-page analysis out of the panel in a durable form.",
    screenJob: "Offer export formats with clear scope and success/failure feedback.",
    desktopTarget: "Menu fits the panel and routes to full report when the result is too large.",
    mobileTarget: "Share sheet/export options mirror the web library/report contract.",
    reviewAnchor: "Can extension results become a durable record?",
  },
  {
    id: "extension-full-workspace",
    title: "Open Full Workspace",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-sample.png",
    sourcePath: "Target state missing: extension-to-workspace snapshot and future live sync state.",
    screenshotStatus: "missing",
    screenshotNote: "The handoff from same-page panel to full workspace needs current snapshot and future live-sync captures.",
    missingStates: ["open workspace", "snapshot loaded", "live sync on", "live sync paused", "source tab lost", "mobile handoff"],
    x: 2720,
    y: 520,
    children: ["extension-live-sync", "video-review", "article-review"],
    userJob: "Move from quick panel review to full analysis without losing the source.",
    screenJob: "Preserve source identity, transcript, claims, markers, and sync status when opening the workspace.",
    desktopTarget: "Workspace opens with explicit extension-source banner and sync status.",
    mobileTarget: "Mobile opens the imported source in a full review stack.",
    reviewAnchor: "Does panel-to-workspace handoff preserve continuity?",
  },
  {
    id: "extension-live-sync",
    title: "Future Live Sync",
    branch: "Extension",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-sample.png",
    sourcePath: "Target state missing: full workspace live sync with extension tab.",
    screenshotStatus: "missing",
    screenshotNote: "Future live workspace sync is called out in the spec and should remain explicit until implemented.",
    missingStates: ["live sync connected", "sync lag", "sync disconnected", "tab closed", "reconnect", "mobile unavailable"],
    x: 2980,
    y: 710,
    children: ["video-review", "article-review"],
    userJob: "Trust that the full workspace is still connected to the active browser source.",
    screenJob: "Expose sync health, lag, and recovery states.",
    desktopTarget: "Workspace has a persistent source/sync health strip.",
    mobileTarget: "No false mobile promise; route to share/import/mic flows.",
    reviewAnchor: "Is live browser sync represented as a real state rather than implied magic?",
  },
  {
    id: "audio",
    title: "Audio / Media File",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/05-audio-file-pane.png",
    screenshotStatus: "stale",
    screenshotNote: "Old upload pane. Final target needs a dominant audio/video-file experience with format affordances, privacy, waveform/progress, and failure recovery.",
    missingStates: ["drag hover", "file selected", "upload progress", "transcoding", "transcription progress", "unsupported file", "mobile file picker"],
    x: 640,
    y: 520,
    children: ["audio-drag-hover", "audio-file-selected", "audio-unsupported"],
    userJob: "Turn a recording, podcast, or downloaded media file into a review surface.",
    screenJob: "Show accepted formats, upload state, privacy, progress, and the next review step.",
    desktopTarget: "Upload progress leads into the same live review language, not a dead utility box.",
    mobileTarget: "File picker/share-sheet import, retry, and background progress are explicit.",
    reviewAnchor: "Does file upload feel like a continuation into analysis?",
  },
  {
    id: "audio-drag-hover",
    title: "Upload Drag Hover",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: upload hover, focused picker, and accepted-format affordance.",
    screenshotStatus: "missing",
    screenshotNote: "The upload branch needs hover/focus/drag states so file input behavior is reviewable.",
    missingStates: ["drag hover", "keyboard focus", "accepted formats", "drop rejected", "mobile file picker"],
    x: 900,
    y: 1090,
    children: ["audio-file-selected"],
    userJob: "Know the file drop/picker is ready before releasing a media file.",
    screenJob: "Make accepted file types, limits, and privacy clear while the user is choosing a file.",
    desktopTarget: "Drop zone responds visibly and explains format/duration/privacy constraints.",
    mobileTarget: "Native file picker/share import is clear, with supported-source copy.",
    reviewAnchor: "Does upload input feel designed rather than a plain file control?",
  },
  {
    id: "audio-file-selected",
    title: "File Selected",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: selected media metadata preview.",
    screenshotStatus: "missing",
    screenshotNote: "Selected-file state should preview filename, size, type, duration when possible, privacy, and next action.",
    missingStates: ["filename/size", "duration/type", "remove file", "replace file", "start upload", "mobile selected file"],
    x: 1160,
    y: 1090,
    children: ["audio-uploading"],
    userJob: "Confirm the correct file before uploading.",
    screenJob: "Show detected media facts and let the user remove/replace or continue.",
    desktopTarget: "Selected file becomes a media card with detected facts and analysis preview.",
    mobileTarget: "Selected file summary remains above the continue button.",
    reviewAnchor: "Can the user catch a wrong upload before sending it?",
  },
  {
    id: "audio-uploading",
    title: "Uploading",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: upload progress and cancellation.",
    screenshotStatus: "missing",
    screenshotNote: "Upload progress needs a state separate from transcription/transcoding.",
    missingStates: ["upload percent", "cancel upload", "network retry", "large-file warning", "mobile background warning"],
    x: 1420,
    y: 1090,
    children: ["audio-transcoding"],
    userJob: "Know the file is being transferred and whether it can be canceled.",
    screenJob: "Separate network upload from server-side processing.",
    desktopTarget: "Progress includes percent, file size, privacy, cancel, and retry.",
    mobileTarget: "Warn about connection/background behavior and preserve resumable progress where possible.",
    reviewAnchor: "Is upload progress distinct from analysis progress?",
  },
  {
    id: "audio-transcoding",
    title: "Transcoding",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: media processing/transcoding stage.",
    screenshotStatus: "missing",
    screenshotNote: "Transcoding should be explicit for videos and unsupported audio containers.",
    missingStates: ["processing queue", "format normalization", "duration validation", "transcode error", "mobile waiting state"],
    x: 1680,
    y: 1090,
    children: ["audio-transcribing"],
    userJob: "Understand why a media file may take time before transcript appears.",
    screenJob: "Explain format conversion and validation without hiding errors.",
    desktopTarget: "Show stage name, ETA, detected media facts, and retry/fallback.",
    mobileTarget: "Compact stage card with clear wait/retry language.",
    reviewAnchor: "Does transcoding feel like progress, not a hang?",
  },
  {
    id: "audio-transcribing",
    title: "Transcribing",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: transcription progress.",
    screenshotStatus: "missing",
    screenshotNote: "Transcription needs its own stage with partial transcript and failure states.",
    missingStates: ["partial transcript", "speaker detection", "claim extraction queued", "transcription failed", "mobile transcript skeleton"],
    x: 1940,
    y: 1090,
    children: ["audio-review"],
    userJob: "See transcript work starting before final review is ready.",
    screenJob: "Stream partial transcript and show the route into audio-only review.",
    desktopTarget: "Waveform/transcript skeleton fills as transcription progresses.",
    mobileTarget: "Transcript preview and analysis stage stack cleanly below playback controls.",
    reviewAnchor: "Can the user see transcription progress as useful output?",
  },
  {
    id: "audio-unsupported",
    title: "Unsupported File",
    branch: "Upload",
    screenshot: "/visual-evidence/flow-screenshots/current/audio-upload.png",
    sourcePath: "Target state missing: unsupported format and too-large file recovery.",
    screenshotStatus: "missing",
    screenshotNote: "Unsupported upload failures need exact recovery routes and format guidance.",
    missingStates: ["unsupported MIME", "file too large", "encrypted/DRM", "convert guidance", "try media URL", "mobile unsupported"],
    x: 640,
    y: 1490,
    children: ["media-url", "document"],
    userJob: "Recover when a file cannot be processed.",
    screenJob: "Explain why the file failed and offer conversion/import alternatives.",
    desktopTarget: "Failure card lists accepted formats and one-click alternate routes.",
    mobileTarget: "Use native share/import advice and visible retry/replace controls.",
    reviewAnchor: "Does upload failure point to a useful next path?",
  },
  {
    id: "mic",
    title: "Live Mic",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/01-watch-redirect-from-mic.png",
    screenshotStatus: "reference",
    screenshotNote: "Mic pre-capture now has explicit consent gating and device selection before browser permission. The live capture surface still needs final proof states for audio activity and correction controls.",
    missingStates: ["browser permission prompt", "listening with audio meter", "silence/no audio", "pause/resume", "speaker correction"],
    x: 640,
    y: 710,
    children: ["mic-consent"],
    userJob: "Trust that Yentl is actually hearing the room.",
    screenJob: "Make mic permission, input activity, transcript flow, pause/end, and privacy legible.",
    desktopTarget: "A responsive audio visualizer and live transcript are the primary proof-of-work.",
    mobileTarget: "Audio meter, pause/end, and consent stay thumb-reachable and impossible to miss.",
    reviewAnchor: "Does the screen prove that listening is live and under the user's control?",
  },
  {
    id: "mic-consent",
    title: "Mic Consent",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/mic-prerecord-consent-gated.png",
    screenshotStatus: "current",
    screenshotNote: "Mic pre-record now includes a microphone input selector, refresh action, explicit record/analyze consent, disabled start until consent, mobile OS permission guidance, and non-live source escape before browser permission is requested.",
    missingStates: [],
    x: 900,
    y: 710,
    children: ["mic-permission"],
    userJob: "Choose to start room audio capture knowingly.",
    screenJob: "Explain what will be heard, saved, and controlled before the browser permission prompt.",
    desktopTarget: "Consent state has a dominant visualizer preview, device picker, and clear privacy copy.",
    mobileTarget: "Large start/pause controls and privacy text stay above the fold.",
    reviewAnchor: "Does mic mode earn consent before asking the browser for permission?",
  },
  {
    id: "mic-permission",
    title: "Browser Permission",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/mic-permission-recovery.png",
    screenshotStatus: "current",
    screenshotNote: "Mic permission denial now returns to the mic-ready pane, preserves the selected input, and shows browser site-settings help plus retry/upload/text/single-claim recovery actions.",
    missingStates: ["browser prompt", "mobile OS permission"],
    x: 1160,
    y: 710,
    children: ["mic-listening", "mic-silence"],
    userJob: "Allow or recover microphone access.",
    screenJob: "Show exactly what happens when permission is granted, denied, or blocked.",
    desktopTarget: "Permission helper explains browser chrome, retry, and settings recovery.",
    mobileTarget: "OS/browser permission recovery is clear and platform-specific.",
    reviewAnchor: "Is the permission branch represented instead of assumed?",
  },
  {
    id: "mic-listening",
    title: "Listening + Meter",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/04-listening-state-body.png",
    screenshotStatus: "reference",
    screenshotNote: "Listening state exists as older reference. Current target needs responsive visualizer, status, and pause/end controls.",
    missingStates: ["responsive visualizer", "active device", "pause/resume", "end session", "privacy indicator", "mobile controls"],
    x: 1420,
    y: 710,
    children: ["mic-live-transcript", "mic-silence"],
    userJob: "See that Yentl is hearing live audio.",
    screenJob: "Use audio meter and controls as proof that capture is live and controllable.",
    desktopTarget: "Visualizer is dominant, with transcript and claim queue beginning around it.",
    mobileTarget: "Large meter and fixed pause/end controls beat dense dashboards.",
    reviewAnchor: "Is the live mic surface visibly alive?",
  },
  {
    id: "mic-silence",
    title: "Silence / No Audio",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "Target state missing: silence/no-input diagnosis.",
    screenshotStatus: "missing",
    screenshotNote: "No-audio state must distinguish quiet rooms, wrong input, blocked device, and hardware mute.",
    missingStates: ["quiet room", "wrong input device", "muted device", "test mic", "switch source", "mobile no audio"],
    x: 1680,
    y: 710,
    children: ["mic-listening"],
    userJob: "Fix mic input when Yentl is not hearing anything.",
    screenJob: "Diagnose no audio without implying analysis has failed.",
    desktopTarget: "Meter remains visible with actionable device/retry guidance.",
    mobileTarget: "Use short diagnostics and one-tap mic settings/retry guidance.",
    reviewAnchor: "Does silence recovery protect user trust?",
  },
  {
    id: "mic-live-transcript",
    title: "Live Transcript",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/01-watch-redirect-from-mic.png",
    screenshotStatus: "reference",
    screenshotNote: "Live mic proof exists, but the target must show transcript lines arriving with claim/marker hit effects.",
    missingStates: ["streaming transcript", "claim hit", "marker hit", "speaker label", "timestamp", "reduced motion"],
    x: 1940,
    y: 710,
    children: ["mic-claim-hit", "mic-marker-hit", "mic-review"],
    userJob: "Watch useful analysis form during a live conversation.",
    screenJob: "Make transcript and analysis hits feel synchronized to live audio.",
    desktopTarget: "Transcript, Yentl Opinion, and hit queue update in one live command center.",
    mobileTarget: "Transcript stream is readable, with hits summarized as compact cards.",
    reviewAnchor: "Do live transcript and analysis hits land as connected events?",
  },
  {
    id: "mic-claim-hit",
    title: "Live Claim Hit",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "Target state missing: live claim hit animation and provisional verification state.",
    screenshotStatus: "missing",
    screenshotNote: "Claim-hit effects need reduced-motion behavior and a provisional/still-checking status.",
    missingStates: ["claim hit effect", "still checking", "source search", "jump to quote", "reduced motion", "mobile hit card"],
    x: 2200,
    y: 710,
    children: ["claim-detail"],
    userJob: "Notice a check-worthy claim without mistaking it for a final verdict.",
    screenJob: "Flag a live claim, anchor it to a quote, and show that verification is still in progress.",
    desktopTarget: "Hit animation is restrained and accessible, with source search state nearby.",
    mobileTarget: "Claim hit appears as a compact, dismissible card.",
    reviewAnchor: "Is a live claim hit exciting but not overclaiming?",
  },
  {
    id: "mic-marker-hit",
    title: "Live Marker Hit",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "Target state missing: live marker hit with taxonomy icon.",
    screenshotStatus: "missing",
    screenshotNote: "Marker hits need taxonomy icon, rationale, quote, and reduced-motion handling.",
    missingStates: ["taxonomy icon", "quote context", "severity", "related marker", "reduced motion", "mobile marker card"],
    x: 2200,
    y: 900,
    children: ["markers"],
    userJob: "Understand a detected rhetorical pattern as it happens.",
    screenJob: "Show marker icon/rationale in context without interrupting the live session.",
    desktopTarget: "Marker hit is visible, educational, and tied to exact transcript text.",
    mobileTarget: "Marker card can be expanded later without crowding the mic controls.",
    reviewAnchor: "Does marker detection teach while preserving the live conversation?",
  },
  {
    id: "mic-pause-end",
    title: "Pause / Resume / End",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: "Target state missing: pause/resume/end controls and end confirmation.",
    screenshotStatus: "missing",
    screenshotNote: "Live control states and the end-session confirmation need exact captures.",
    missingStates: ["pause state", "resume state", "end confirmation", "save before end", "discard warning", "mobile fixed controls"],
    x: 2460,
    y: 710,
    children: ["end-dialog", "export"],
    userJob: "Control live capture and leave with a saved result.",
    screenJob: "Make pause/resume/end deliberate and preserve work before ending.",
    desktopTarget: "Controls remain fixed and end opens a confirmation with save/export context.",
    mobileTarget: "Pause/end are large, persistent, and separated enough to avoid mistakes.",
    reviewAnchor: "Can live capture stop safely without accidental data loss?",
  },
  {
    id: "mic-speaker-correction",
    title: "Speaker Correction",
    branch: "Room audio",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/22-reassign-menu-open.png",
    screenshotStatus: "reference",
    screenshotNote: "Older speaker-reassign proof exists, but live mic needs current correction menu and phrase-split states.",
    missingStates: ["speaker menu", "split phrase", "new speaker", "undo correction", "audit trail", "mobile correction sheet"],
    x: 2460,
    y: 900,
    children: ["speaker-reassign"],
    userJob: "Correct speaker labels so evidence remains trustworthy.",
    screenJob: "Make speaker edits precise, reversible, and tied to transcript spans.",
    desktopTarget: "Speaker correction is a contextual menu with split/assign/undo behavior.",
    mobileTarget: "Correction opens a focused sheet with phrase preview and speaker picker.",
    reviewAnchor: "Can a user fix speaker-label mistakes without breaking the record?",
  },
  {
    id: "document",
    title: "PDF / Text",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/text-transcript-success.png",
    screenshotStatus: "reference",
    screenshotNote: "Text transcript proof, not the full PDF/document flow. Needs upload/paste/URL/OCR, document structure, excerpts, and citation-preserving review.",
    missingStates: ["paste text", "PDF upload", "OCR progress", "document outline", "highlighted claim anchors", "source citation extraction"],
    x: 640,
    y: 900,
    children: ["text-paste", "text-url-import", "pdf-upload"],
    userJob: "Review a transcript, article, PDF, or pasted document.",
    screenJob: "Preserve document structure, citations, excerpts, claims, and marker context.",
    desktopTarget: "Document reading pane and analysis rail should feel like one annotated document.",
    mobileTarget: "Use a reading-first stack with expandable claim/source sheets.",
    reviewAnchor: "Does the document branch respect the source text instead of flattening it?",
  },
  {
    id: "text-paste",
    title: "Paste Text",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/02-text-doc-pane.png",
    screenshotStatus: "reference",
    screenshotNote: "Older paste text proof exists. Needs current structure detection, reward preview, and error states.",
    missingStates: ["empty paste", "text pasted", "speaker/timestamp detection", "too short", "cleanup preview", "mobile paste"],
    x: 900,
    y: 1490,
    children: ["document-outline"],
    userJob: "Paste article, transcript, or notes and see how Yentl will structure them.",
    screenJob: "Detect document shape before flattening into analysis.",
    desktopTarget: "Paste surface shows reading pane preview plus future claim/source rail.",
    mobileTarget: "Text input is large enough to edit, with preview below.",
    reviewAnchor: "Does pasted text keep its reading context?",
  },
  {
    id: "text-url-import",
    title: "Article/Text URL Import",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: article URL import, source fetch, blocked site, and fallback.",
    screenshotStatus: "missing",
    screenshotNote: "Article/text URL import is a separate branch from direct media URL and needs its own validation states.",
    missingStates: ["article URL entry", "page detected", "blocked fetch", "reader extraction", "paste fallback", "mobile URL share"],
    x: 1160,
    y: 1390,
    children: ["document-outline", "article-review"],
    userJob: "Analyze a written webpage without manual copy-paste.",
    screenJob: "Detect that this is text/article content and route to reader-style review.",
    desktopTarget: "URL import validates page title/source/thumbnail and previews reader extraction.",
    mobileTarget: "Shared URL enters a reader preview with fallback to paste.",
    reviewAnchor: "Can the app tell article URLs from media URLs and recover cleanly?",
  },
  {
    id: "pdf-upload",
    title: "PDF Upload",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: PDF upload and OCR progress.",
    screenshotStatus: "missing",
    screenshotNote: "PDF handling needs upload, OCR, outline, page thumbnails, and OCR failure states.",
    missingStates: ["PDF selected", "OCR progress", "page thumbnails", "scanned PDF warning", "OCR failed", "mobile PDF import"],
    x: 1160,
    y: 1580,
    children: ["pdf-ocr"],
    userJob: "Bring a PDF into Yentl while preserving pages and citations.",
    screenJob: "Convert pages into readable review context without losing source structure.",
    desktopTarget: "PDF preview and OCR status show page count, outline, and analysis preview.",
    mobileTarget: "Imported PDF opens with page preview and compact OCR status.",
    reviewAnchor: "Does PDF import preserve document identity?",
  },
  {
    id: "pdf-ocr",
    title: "OCR / Progress",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: OCR stage with partial page extraction.",
    screenshotStatus: "missing",
    screenshotNote: "OCR/progress needs separate stages for page extraction, low-confidence text, and failure recovery.",
    missingStates: ["page OCR progress", "low confidence", "manual correction", "OCR failed", "continue partial", "mobile OCR progress"],
    x: 1420,
    y: 1580,
    children: ["document-outline"],
    userJob: "See the PDF becoming searchable and reviewable.",
    screenJob: "Show page-level OCR progress and quality warnings.",
    desktopTarget: "OCR progress is attached to page thumbnails and emerging outline.",
    mobileTarget: "Page-level progress cards avoid hiding the document preview.",
    reviewAnchor: "Can OCR uncertainty be inspected before claims are extracted?",
  },
  {
    id: "document-outline",
    title: "Document Outline",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: document outline, sections, and source structure.",
    screenshotStatus: "missing",
    screenshotNote: "The document branch needs an outline state before jumping into generic review.",
    missingStates: ["section outline", "page anchors", "speaker/headings", "source citations", "claim extraction preview", "mobile outline"],
    x: 1680,
    y: 1390,
    children: ["document-claim-anchor", "document-review"],
    userJob: "Understand how Yentl parsed the document before relying on findings.",
    screenJob: "Show detected sections/pages/speakers/citations and let the user inspect them.",
    desktopTarget: "Reading pane plus outline and analysis rail preview.",
    mobileTarget: "Outline appears as a collapsible table of contents above review.",
    reviewAnchor: "Does the document flow reveal structure before analysis?",
  },
  {
    id: "document-claim-anchor",
    title: "In-Document Claim Anchor",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: in-document highlights and claim/source drawer.",
    screenshotStatus: "missing",
    screenshotNote: "Claim anchors and citation drawers are required overlays for document review.",
    missingStates: ["highlighted claim", "claim drawer", "citation drawer", "source preview", "jump between anchors", "mobile bottom sheet"],
    x: 1940,
    y: 1390,
    children: ["document-source-drawer", "claim-detail"],
    userJob: "Click a highlighted passage and inspect the claim in its document context.",
    screenJob: "Connect quote, claim status, sources, and citations without leaving the document.",
    desktopTarget: "Claim drawer stays tied to the highlighted passage and page/section location.",
    mobileTarget: "Bottom sheet keeps quote/source/details together with a back-to-document action.",
    reviewAnchor: "Are document claims anchored to the text itself?",
  },
  {
    id: "document-source-drawer",
    title: "Source / Citation Drawer",
    branch: "Document",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "Target state missing: citation/source drawer with validated thumbnail/no-thumbnail fallback.",
    screenshotStatus: "missing",
    screenshotNote: "Document source/citation extraction needs a drawer and validated visual-evidence states.",
    missingStates: ["citation extraction", "source card", "validated thumbnail", "no-thumbnail reason", "copy citation", "mobile citation sheet"],
    x: 2200,
    y: 1390,
    children: ["source-detail", "visual-source-thumbnail", "visual-no-thumbnail", "export"],
    userJob: "Audit where document evidence came from and export citations.",
    screenJob: "Show extracted citations, source status, visual evidence, and export actions.",
    desktopTarget: "Citation drawer is dense, source-aware, and tied to the selected passage.",
    mobileTarget: "Citation/source sheet is readable and easy to dismiss.",
    reviewAnchor: "Can document evidence be traced and exported cleanly?",
  },
  {
    id: "media-url",
    title: "Media URL",
    branch: "Direct URL",
    screenshot: "/visual-evidence/flow-screenshots/current/media-url-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/media-url-watch-success.png",
    screenshotStatus: "current",
    screenshotNote: "Current successful direct-media review proof. Entry, detected media facts, progress, unsupported URL, and recovery states still need separate captures.",
    missingStates: ["URL entry", "media detected", "duration/type validation", "remote fetch blocked", "unsupported MIME", "mobile URL share"],
    x: 930,
    y: 900,
    children: ["media-url-entry"],
    userJob: "Analyze a direct MP3, MP4, stream, or podcast URL.",
    screenJob: "Validate media type and duration before routing to the review surface.",
    desktopTarget: "Detected media facts should be visible before analysis starts.",
    mobileTarget: "Unsupported-page URLs route to browser/share alternatives with no dead end.",
    reviewAnchor: "Does URL validation teach the user what kind of source they supplied?",
  },
  {
    id: "media-url-entry",
    title: "Direct URL Entry",
    branch: "Direct URL",
    screenshot: "/visual-evidence/flow-screenshots/current/media-url-review.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/07-media-url-pane.png",
    screenshotStatus: "reference",
    screenshotNote: "Old direct URL pane exists, but target needs validation, detected media facts, and webpage-vs-media guidance.",
    missingStates: ["URL entry", "live validation", "webpage URL warning", "direct media example", "mobile URL share"],
    x: 1160,
    y: 900,
    children: ["media-detected", "media-fetch-blocked"],
    userJob: "Paste a direct media URL and learn whether it is usable.",
    screenJob: "Distinguish MP3/MP4/stream URLs from ordinary webpages before analysis starts.",
    desktopTarget: "Entry sits inside a waveform/media preview shell with examples and validation.",
    mobileTarget: "Shared/pasted URL validates in place and routes unsupported links to browser/share alternatives.",
    reviewAnchor: "Does the user understand what counts as a direct media URL?",
  },
  {
    id: "media-detected",
    title: "Media Detected",
    branch: "Direct URL",
    screenshot: "/visual-evidence/flow-screenshots/current/media-url-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/media-url-watch-success.png",
    screenshotStatus: "current",
    screenshotNote: "Current successful media-URL proof. A distinct pre-analysis detected-type/duration/source metadata state is still missing.",
    missingStates: ["media type", "duration", "size/stream", "source host", "start analysis", "mobile detected state"],
    x: 1420,
    y: 900,
    children: ["audio-transcribing", "audio-review"],
    userJob: "Confirm Yentl found actual playable media before waiting for analysis.",
    screenJob: "Preview detected media facts and analysis destination.",
    desktopTarget: "Detected media card leads into waveform/transcript review.",
    mobileTarget: "Detected media summary stays compact with one continue action.",
    reviewAnchor: "Can detected media be verified before processing?",
  },
  {
    id: "media-fetch-blocked",
    title: "Remote Fetch Blocked",
    branch: "Direct URL",
    screenshot: "/visual-evidence/flow-screenshots/current/media-url-review.png",
    sourcePath: "Target state missing: remote fetch blocked, unsupported MIME, and recovery.",
    screenshotStatus: "missing",
    screenshotNote: "Blocked fetch and unsupported MIME states need exact recovery routes.",
    missingStates: ["CORS/auth blocked", "unsupported MIME", "expired URL", "download/upload alternative", "browser capture alternative", "mobile fallback"],
    x: 1420,
    y: 1280,
    children: ["audio", "extension"],
    userJob: "Recover from a media URL Yentl cannot fetch directly.",
    screenJob: "Explain the fetch problem and route to upload or browser capture.",
    desktopTarget: "Blocked state lists reason, retry, upload, and extension capture options.",
    mobileTarget: "Offer file import/share and explain protected links plainly.",
    reviewAnchor: "Does direct URL failure avoid becoming a dead end?",
  },
  {
    id: "claim-quick-check",
    title: "Claim-Only Quick Check",
    branch: "Claim-only",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "docs/superpowers/validation/screenshots/claim-quick-check-pane.png",
    screenshotStatus: "current",
    screenshotNote: "Standalone claim entry now exists as a source-picker path with claim text, optional context/source note, too-vague validation, and direct provisional/confirmed verification handoff.",
    missingStates: ["duplicate/recent claim notice", "guest limits", "mobile quick-check capture", "dedicated result variants"],
    x: 640,
    y: 1680,
    children: ["claim-quick-verification"],
    userJob: "Ask Yentl to check one specific claim when there is no media or document to ingest.",
    screenJob: "Capture a precise claim, ask for optional context/source, and set expectations about evidence search limits.",
    desktopTarget: "A focused claim entry card previews the eventual evidence/result surface and asks for context without feeling like a chatbot blank box.",
    mobileTarget: "A single-claim entry sheet keeps the text area, context prompt, and start-check action above the fold.",
    reviewAnchor: "Can a user check a single claim without fabricating a source workflow?",
  },
  {
    id: "claim-quick-verification",
    title: "Claim-Only Verification",
    branch: "Claim-only",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: claim-only verification stages and result vocabulary.",
    screenshotStatus: "missing",
    screenshotNote: "Standalone verification needs visible source search, evidence quality, Devil's Advocate, and a final vocabulary that does not end at user-facing 'unverifiable'.",
    missingStates: ["source search", "supported result", "contradicted result", "mixed/caveated result", "no valid backing found", "Devil's Advocate"],
    x: 900,
    y: 1680,
    children: ["claim-detail", "devil-advocate", "export"],
    userJob: "See what Yentl found for a single claim and decide whether to save or share it.",
    screenJob: "Show search progress, validated sources/no-thumbnail reasons, evidence quality, and adversarial review in a compact result surface.",
    desktopTarget: "The result view reads like a focused claim report with source cards, caveats, and save/export actions.",
    mobileTarget: "The claim result stacks status, evidence, Devil's Advocate, and export without losing the original claim.",
    reviewAnchor: "Does standalone checking stay rigorous without pretending a missing source is a final answer?",
  },
  {
    id: "video-review",
    title: "Essential Video Review",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/current/youtube-live-analysis.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/03-watch-view-annotations-rendered.png",
    screenshotStatus: "reference",
    screenshotNote: "Good relationship reference for video + transcript, but final YouTube review needs validated source cards, Yentl Opinion, Devil's Advocate, thumbnails, and gamified hit effects.",
    missingStates: ["claim hit animation", "Yentl Opinion live update", "source cards opened", "Devil's Advocate open", "reduced motion", "mobile bottom sheets"],
    x: 3240,
    y: 40,
    w: 260,
    h: 188,
    children: ["overview", "transcript-view", "claims-list", "markers-list", "yentl-opinion", "claim-detail", "markers", "export"],
    userJob: "Watch the media while Yentl layers analysis around it.",
    screenJob: "Give the video pride of place, with transcript, claims, sources, markers, and Yentl's read orbiting it.",
    desktopTarget: "Video is dominant; transcript and findings synchronize without competing for attention.",
    mobileTarget: "Video stays inspectable; analysis becomes layered bottom sheets and short stacks.",
    reviewAnchor: "Is the video unmistakably the center of the experience?",
  },
  {
    id: "article-review",
    title: "Essential Article Review",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/current/extension-article.png",
    sourcePath: "docs/superpowers/validation/screenshots/extension-panel-realistic-page-preview.png",
    screenshotStatus: "reference",
    screenshotNote: "Extension/article preview, not final article review workspace. Needs article-reader mode, highlighted source text, page thumbnail/source cards, and mobile share-sheet equivalent.",
    missingStates: ["article text highlight", "article source drawer", "side-panel narrow width", "mobile share-sheet import", "reader/full workspace handoff"],
    x: 2980,
    y: 330,
    w: 260,
    h: 188,
    children: ["overview", "claims-list", "markers-list", "claim-detail", "markers", "export"],
    userJob: "Read the page and see Yentl's analysis in context.",
    screenJob: "Keep article content, source metadata, highlighted claims, and evidence cards together.",
    desktopTarget: "Article page is visible; Yentl annotates, summarizes, and expands only when asked.",
    mobileTarget: "Share-sheet flow opens a clean reader with collapsible evidence layers.",
    reviewAnchor: "Does the article remain readable while the analysis feels alive?",
  },
  {
    id: "audio-review",
    title: "Essential Audio Review",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-sample.png",
    sourcePath: "docs/superpowers/validation/screenshots/browser-pane-working-sample-loaded.png",
    screenshotStatus: "missing",
    screenshotNote: "Placeholder from browser sample. A real audio-only review surface with waveform, playback, transcript, and claim timing is missing.",
    missingStates: ["waveform anchor", "audio scrubber", "speaker lanes", "claim timing markers", "source evidence rail", "mobile playback stack"],
    x: 2200,
    y: 1090,
    w: 260,
    h: 188,
    children: ["overview", "transcript-view", "claims-list", "markers-list", "claim-detail", "markers", "export"],
    userJob: "Listen, scrub, and inspect claims without a visual video anchor.",
    screenJob: "Use waveform/activity, transcript timing, speaker turns, claims, and source evidence as the anchor.",
    desktopTarget: "Waveform and transcript carry the visual weight; claim cards should not float disconnected.",
    mobileTarget: "Playback controls and claim stack stay stable; details open as sheets.",
    reviewAnchor: "Does the audio surface create enough sensory proof and orientation?",
  },
  {
    id: "mic-review",
    title: "Essential Live Mic Review",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/01-watch-redirect-from-mic.png",
    screenshotStatus: "reference",
    screenshotNote: "Reference only. The essential live mic screen needs a purpose-built visualizer, live transcript, claim queue, consent/status, and pause/end controls.",
    missingStates: ["active visualizer", "live transcript hits", "combo/highlight effect", "no audio", "speaker split/correction", "mobile live controls"],
    x: 2720,
    y: 710,
    w: 260,
    h: 188,
    children: ["overview", "transcript-view", "claims-list", "markers-list", "mic-pause-end", "mic-speaker-correction", "export"],
    userJob: "See that live listening, transcript capture, and analysis are working now.",
    screenJob: "Lead with audio visualizer, active speaker, transcript hits, claim queue, and stop controls.",
    desktopTarget: "Input meter, transcript, and Yentl's read form one live command center.",
    mobileTarget: "Large controls, responsive meter, and glanceable top-line analysis beat dense tables.",
    reviewAnchor: "Does it feel live, lightweight, and controllable?",
  },
  {
    id: "document-review",
    title: "Essential Document Review",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/current/text-review.png",
    sourcePath: "docs/superpowers/validation/screenshots/text-transcript-success.png",
    screenshotStatus: "reference",
    screenshotNote: "Text proof only. Final document review needs source pages, document thumbnails, in-text anchors, claim/source side sheets, and exportable citations.",
    missingStates: ["PDF page view", "search within doc", "claim anchor click", "source thumbnail drawer", "citation export", "mobile document sheets"],
    x: 2460,
    y: 1390,
    w: 260,
    h: 188,
    children: ["overview", "transcript-view", "claims-list", "markers-list", "claim-detail", "source-detail", "export"],
    userJob: "Move through document text with claim/source layers available on demand.",
    screenJob: "Show document structure, highlighted claims, source evidence, and marker education without clutter.",
    desktopTarget: "Reading pane is primary; analysis rail is dense but subordinate.",
    mobileTarget: "Use section cards and bottom sheets so source evidence does not bury the document.",
    reviewAnchor: "Does the screen feel like annotated reading rather than generic transcript rows?",
  },
  {
    id: "overview",
    title: "Overview Command Center",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/overview.png",
    sourcePath: ".project/screenshots/v1.4-sweep/03-steve-jobs-overview.png",
    screenshotStatus: "reference",
    screenshotNote: "Older overview/reference state. Final needs Yentl Opinion, verdict mix without final unverifiable, topics, recent activity, and source health.",
    missingStates: ["Yentl Opinion", "verdict mix", "good-faith/bad-faith meta-read", "source health", "recent activity", "mobile overview"],
    x: 3240,
    y: 560,
    children: ["yentl-opinion", "claims-list", "markers-list", "export"],
    userJob: "Get the top-line read before opening transcripts or details.",
    screenJob: "Summarize what matters, what is still checking, and where to drill next.",
    desktopTarget: "A calm command center with synthesis, metrics, current source status, and actionable activity.",
    mobileTarget: "Top-line read, key metrics, and next actions stack before dense details.",
    reviewAnchor: "Does Overview answer what just happened and what to inspect first?",
  },
  {
    id: "transcript-view",
    title: "Transcript Search / Follow",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/watch-view.png",
    sourcePath: ".project/screenshots/v1.1-rebuild/10-transcript-desktop-1280.png",
    screenshotStatus: "reference",
    screenshotNote: "Transcript proof exists, but current target needs search, highlights, playhead follow, and correction overlays.",
    missingStates: ["search", "highlight filter", "follow playhead", "speaker correction", "jump to media", "mobile transcript"],
    x: 3240,
    y: 900,
    children: ["speaker-reassign", "claim-detail", "markers"],
    userJob: "Read or search the exact words behind Yentl's results.",
    screenJob: "Make timestamps, speakers, search, highlighted claims/markers, and playhead behavior auditable.",
    desktopTarget: "Transcript is a precise reading surface connected to media, claims, markers, and corrections.",
    mobileTarget: "Single-column transcript with search and expandable findings sheet.",
    reviewAnchor: "Can the user inspect exact words and timing without losing orientation?",
  },
  {
    id: "claims-list",
    title: "Claims List",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/overview.png",
    sourcePath: ".project/screenshots/v1.1-rebuild/05-claims-false-desktop-1280.png",
    screenshotStatus: "reference",
    screenshotNote: "Older claims-list reference. Final needs filters/sort/status semantics and no final 'unverifiable' vocabulary.",
    missingStates: ["filter by status", "sort by confidence/source count", "no valid backing found", "still checking", "bulk export", "mobile filters"],
    x: 3500,
    y: 900,
    children: ["claim-detail", "export"],
    userJob: "Triage claims by importance, status, confidence, and evidence quality.",
    screenJob: "Provide dense but understandable rows, filters, and routes into auditable details.",
    desktopTarget: "Rows show quote, status, source count, confidence, timing, and next action.",
    mobileTarget: "Filters become chips/bottom sheet and rows remain tap-friendly.",
    reviewAnchor: "Can a reviewer scan the claim inventory without flattening meaning?",
  },
  {
    id: "markers-list",
    title: "Markers List",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/markers.png",
    sourcePath: ".project/screenshots/v1.1-rebuild/09-markers-list-desktop-1280.png",
    screenshotStatus: "reference",
    screenshotNote: "Marker list reference exists, but final needs taxonomy icons, severity, related markers, and learning routes.",
    missingStates: ["taxonomy icon", "severity filters", "speaker/time grouping", "quote context", "related markers", "mobile marker filters"],
    x: 3500,
    y: 1090,
    children: ["markers", "visual-marker-icons", "export"],
    userJob: "Inspect rhetoric/fallacy/bias markers as patterns, not scattered labels.",
    screenJob: "Group markers by pattern, severity, speaker, quote context, and learning value.",
    desktopTarget: "Dense marker rows include icon, definition cue, quote, severity, and timestamp jump.",
    mobileTarget: "One concept per row with expandable definition and context.",
    reviewAnchor: "Does the markers list guide learning instead of just flagging?",
  },
  {
    id: "yentl-opinion",
    title: "Yentl Opinion",
    branch: "Core experience",
    screenshot: "/visual-evidence/flow-screenshots/overview.png",
    sourcePath: "Target state missing: live Yentl Opinion and good-faith/bad-faith meta-read.",
    screenshotStatus: "missing",
    screenshotNote: "Yentl Opinion is launch-critical and needs its own live summary, confidence, and meta-read states.",
    missingStates: ["live summary", "good-faith read", "bad-faith read", "uncertainty notes", "update while checking", "mobile summary"],
    x: 3240,
    y: 1090,
    children: ["claim-detail", "markers", "export"],
    userJob: "Hear Yentl's current read in plain language, with caveats.",
    screenJob: "Synthesize evidence and rhetoric without pretending provisional work is final.",
    desktopTarget: "Opinion card separates factual support, contradiction, caveats, and rhetorical read.",
    mobileTarget: "Short top-line summary with expandable reasoning and evidence.",
    reviewAnchor: "Does Yentl Opinion explain the read without overstating certainty?",
  },
  {
    id: "speaker-reassign",
    title: "Speaker Reassign Menu",
    branch: "Overlay",
    screenshot: "/visual-evidence/flow-screenshots/current/mic-review.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/04-reassign-menu-open.png",
    screenshotStatus: "reference",
    screenshotNote: "Reassign menu proof exists; final target needs current transcript and mobile sheet variants.",
    missingStates: ["menu open", "split phrase", "speaker picker", "undo", "audit note", "mobile sheet"],
    x: 2980,
    y: 1090,
    children: ["transcript-view"],
    userJob: "Fix speaker labels from the transcript or live mic surface.",
    screenJob: "Provide contextual, reversible speaker correction without leaving the quote.",
    desktopTarget: "Compact menu includes reassign, split, new speaker, undo, and clear result preview.",
    mobileTarget: "Full-width sheet with phrase preview and speaker list.",
    reviewAnchor: "Is speaker correction represented down to the open menu state?",
  },
  {
    id: "source-detail",
    title: "Source Detail Drawer",
    branch: "Depth layer",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: source card detail with validated thumbnail/no-thumbnail fallback.",
    screenshotStatus: "missing",
    screenshotNote: "Source detail needs exact validated thumbnail, no-thumbnail reason, publisher metadata, and evidence-quality states.",
    missingStates: ["validated thumbnail", "no-thumbnail reason", "publisher metadata", "evidence quality", "open source", "mobile drawer"],
    x: 3760,
    y: 560,
    children: ["visual-source-thumbnail", "visual-no-thumbnail", "export"],
    userJob: "Audit a source behind a claim or citation.",
    screenJob: "Show where evidence came from, what image is validated, and what quality limitations exist.",
    desktopTarget: "Drawer includes exact source image, origin, retrieved facts, quote, and quality note.",
    mobileTarget: "Source drawer remains readable and one tap from the claim/document quote.",
    reviewAnchor: "Can source visuals be trusted as source-provided evidence?",
  },
  {
    id: "claim-detail",
    title: "Claim + Sources",
    branch: "Depth layer",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/10-claim-detail-loads.png",
    screenshotStatus: "stale",
    screenshotNote: "Old claim detail. Final must include validated source thumbnails, evidence quality, no-fake-thumbnail fallback, Devil's Advocate, and no final 'unverifiable' state.",
    missingStates: ["validated thumbnail source", "no-thumbnail reason", "Devil's Advocate", "evidence quality", "edit/challenge claim", "mobile detail"],
    x: 3760,
    y: 120,
    children: ["devil-advocate", "source-detail", "visual-claim-gallery", "export"],
    userJob: "Understand why Yentl reached a result.",
    screenJob: "Show claim, status, exact evidence, source thumbnails, reputation, and Devil's Advocate.",
    desktopTarget: "Side panel or focused page keeps the original media jump available.",
    mobileTarget: "Full-screen detail keeps back/next and source thumbnails close to the claim.",
    reviewAnchor: "Can the user audit the result without being overwhelmed?",
  },
  {
    id: "devil-advocate",
    title: "Devil's Advocate",
    branch: "Depth layer",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: Devil's Advocate challenge and result-strengthening state.",
    screenshotStatus: "missing",
    screenshotNote: "Devil's Advocate must be visible as a rigor layer under/inside claim detail.",
    missingStates: ["challenge weak conclusion", "strengthen supported result", "correct conclusion", "show reasoning", "mobile expansion"],
    x: 4020,
    y: 120,
    children: ["claim-detail"],
    userJob: "See how Yentl challenged its own conclusion.",
    screenJob: "Make the adversarial check visible without creating a second confusing verdict.",
    desktopTarget: "A contained rigor panel explains what was challenged and whether the conclusion changed.",
    mobileTarget: "Expandable section below evidence with concise outcome and reasoning.",
    reviewAnchor: "Is Devil's Advocate a visible rigor layer, not a hidden prompt?",
  },
  {
    id: "markers",
    title: "Marker Learning",
    branch: "Depth layer",
    screenshot: "/visual-evidence/flow-screenshots/current/browser-sample.png",
    sourcePath: "docs/superpowers/validation/screenshots/browser-pane-working-sample-loaded.png",
    screenshotStatus: "missing",
    screenshotNote: "Placeholder only. Marker learning needs taxonomy-specific icons, severity/rationale, quote context, examples, and next-step education.",
    missingStates: ["123-icon gallery links", "marker detail", "related markers", "archetype animation", "reduced motion", "mobile learning card"],
    x: 3760,
    y: 360,
    children: ["visual-marker-icons", "visual-archetype-motion", "export"],
    userJob: "Learn what pattern was detected and why it matters.",
    screenJob: "Use illustration, quote context, severity, definition, examples, and next-step learning.",
    desktopTarget: "Marker detail is educational and specific, not just a warning label.",
    mobileTarget: "One concept per screen; examples and related markers expand progressively.",
    reviewAnchor: "Does the marker teach without accusing or cluttering?",
  },
  {
    id: "visual-source-thumbnail",
    title: "Validated Source Thumbnail",
    branch: "Visual evidence",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: source-provided thumbnail proof from YouTube/oEmbed, Open Graph, Twitter card, schema image, or publisher image.",
    screenshotStatus: "missing",
    screenshotNote: "Visual evidence requires a first-class state showing exactly why a thumbnail is trusted as source-provided evidence.",
    missingStates: ["exact source image", "retrieval/provenance label", "publisher metadata", "claim/source association", "open original source", "mobile source card"],
    x: 4300,
    y: 120,
    userJob: "Trust that a source image belongs to the actual source being cited.",
    screenJob: "Show the image, its origin, retrieval method, and relationship to the claim without using generated art as evidence.",
    desktopTarget: "Source cards show the validated image with provenance and enough publisher context to audit it.",
    mobileTarget: "Thumbnail provenance and source-open actions remain visible inside the source sheet.",
    reviewAnchor: "Can the reviewer tell why this thumbnail is valid evidence?",
  },
  {
    id: "visual-no-thumbnail",
    title: "No-Thumbnail Fallback",
    branch: "Visual evidence",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: designed no-thumbnail card with explicit reason.",
    screenshotStatus: "missing",
    screenshotNote: "The atlas needs a visible fallback state so missing or untrusted source images are not replaced with generated or decorative art.",
    missingStates: ["no image found", "untrusted image rejected", "publisher blocked image", "text-only source card", "reason visible", "mobile fallback card"],
    x: 4300,
    y: 310,
    userJob: "Understand why a source card has no image and still trust the evidence trail.",
    screenJob: "Use a designed fallback with reason, source identity, and evidence quality instead of fake imagery.",
    desktopTarget: "No-thumbnail cards are calm, labeled, and still useful for citation review.",
    mobileTarget: "Fallback reason fits in the source sheet without hiding the source link.",
    reviewAnchor: "Does the absence of a thumbnail feel honest instead of broken?",
  },
  {
    id: "visual-claim-gallery",
    title: "Claim Source Gallery",
    branch: "Visual evidence",
    screenshot: "/visual-evidence/flow-screenshots/current/claim-detail.png",
    sourcePath: "Target state missing: claim detail source gallery with validated-thumbnail and no-thumbnail variants.",
    screenshotStatus: "missing",
    screenshotNote: "Claim detail needs a gallery state that compares multiple sources and their visual-evidence status side by side.",
    missingStates: ["validated thumbnail card", "no-thumbnail card", "mixed source quality", "source count", "evidence quality labels", "mobile gallery"],
    x: 4300,
    y: 500,
    userJob: "Compare the sources behind a claim without opening each one blindly.",
    screenJob: "Show source cards, thumbnail validity, evidence quality, and why each source matters to the result.",
    desktopTarget: "Claim detail includes a compact gallery with provenance, quality, and open-source actions.",
    mobileTarget: "Source gallery becomes a swipeable or stacked evidence section under the claim.",
    reviewAnchor: "Can claim evidence be compared visually without weakening provenance?",
  },
  {
    id: "visual-marker-icons",
    title: "Marker Icon States",
    branch: "Visual evidence",
    screenshot: "/visual-evidence/flow-screenshots/markers.png",
    sourcePath: "Target state missing: marker chip, row, detail, and learning-card icon states for the taxonomy.",
    screenshotStatus: "missing",
    screenshotNote: "The marker system calls for 123 bespoke icons. The atlas needs states for chip, row, detail, and learning contexts before animation work starts.",
    missingStates: ["marker chip icon", "marker row icon", "marker detail icon", "learning card icon", "24px/64px readability", "mobile marker card"],
    x: 4300,
    y: 880,
    userJob: "Recognize a rhetorical marker quickly and learn what it means.",
    screenJob: "Prove iconography remains readable across compact chips, dense rows, and larger educational cards.",
    desktopTarget: "Icons are consistent, text-free, and paired with quote/rationale context.",
    mobileTarget: "Icons help scanning without crowding quote text or controls.",
    reviewAnchor: "Do marker icons work at every size where the product uses them?",
  },
  {
    id: "visual-archetype-motion",
    title: "Archetype Motion / Reduced Motion",
    branch: "Visual evidence",
    screenshot: "/visual-evidence/flow-screenshots/markers.png",
    sourcePath: "Target state missing: archetype animation loops and prefers-reduced-motion fallback.",
    screenshotStatus: "missing",
    screenshotNote: "Motion is planned for high-frequency markers and archetypes, but the atlas needs a reduced-motion state so animation never becomes required for comprehension.",
    missingStates: ["archetype loop", "high-frequency marker loop", "paused state", "prefers-reduced-motion static", "loading/fallback", "mobile reduced motion"],
    x: 4300,
    y: 1070,
    userJob: "Get a richer marker explanation without being forced into motion.",
    screenJob: "Use motion as optional teaching support while preserving a complete static state.",
    desktopTarget: "Animation loops are subtle, stoppable, and paired with exact marker language.",
    mobileTarget: "Reduced-motion/default-static behavior remains readable in tight cards.",
    reviewAnchor: "Does animation support marker learning without becoming the lesson itself?",
  },
  {
    id: "export",
    title: "Export / Library",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/library.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/05c-sessions-library.png",
    screenshotStatus: "reference",
    screenshotNote: "Library reference only. Need export modal variants, report preview, local-save privacy copy, clear all, empty/error states, and mobile library.",
    missingStates: ["export modal", "report preview", "markdown/json saved", "save dialog", "sessions empty", "local privacy", "mobile library"],
    x: 4020,
    y: 600,
    children: ["save-dialog", "export-modal", "end-dialog", "library-empty", "library-saved"],
    userJob: "Leave with a saved, searchable, shareable record.",
    screenJob: "Preserve media, transcript, claims, markers, sources, comments, and review context.",
    desktopTarget: "Export choices are explained by use case, not just file extension.",
    mobileTarget: "Library is search-first, with quick resume/export and clear sync state.",
    reviewAnchor: "Does the user know what is saved and where to find it?",
  },
  {
    id: "save-dialog",
    title: "Save Dialog",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/export-dialog.png",
    sourcePath: ".project/screenshots/v1.4-visual-sweep/05b-save-dialog-open.png",
    screenshotStatus: "reference",
    screenshotNote: "Save dialog proof exists, but target needs naming, privacy, account/guest, and failure states.",
    missingStates: ["name session", "guest save blocked", "saved toast", "save error", "privacy/local copy", "mobile save sheet"],
    x: 3500,
    y: 1470,
    children: ["library-saved"],
    userJob: "Preserve a useful session record.",
    screenJob: "Explain what is saved, where it lives, and what account state changes.",
    desktopTarget: "Save dialog includes name, scope, privacy, and confirmation.",
    mobileTarget: "Save sheet is short, with account prompt only when needed.",
    reviewAnchor: "Does saving feel trustworthy and reversible?",
  },
  {
    id: "export-modal",
    title: "Export Modal",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-report-preview.png",
    sourcePath: "components/session/ExportDialog.tsx; docs/superpowers/validation/screenshots/route-session-report-preview.png",
    screenshotStatus: "current",
    screenshotNote: "Export dialog now includes an in-dialog report preview before opening/saving. Current capture uses validation sample cable_008 with claim and marker samples visible.",
    missingStates: ["transcript export", "download success", "download error", "platform share sheet"],
    x: 3760,
    y: 1470,
    children: ["report-preview", "library-saved"],
    userJob: "Leave with the right kind of record for review, sharing, or audit.",
    screenJob: "Explain export formats by use case and show success/failure feedback.",
    desktopTarget: "Export choices are use-case first, with preview when report format is selected.",
    mobileTarget: "Export/share uses platform sheet while preserving scope explanation.",
    reviewAnchor: "Can a user choose an export format without guessing file semantics?",
  },
  {
    id: "report-preview",
    title: "Report Preview",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-report-preview.png",
    sourcePath: "components/session/ExportDialog.tsx; docs/superpowers/validation/screenshots/route-session-report-preview.png",
    screenshotStatus: "current",
    screenshotNote: "Report preview is now a visible in-dialog state with source summary, utterance/claim/marker counts, claim sample, and marker sample before the user opens or saves the report.",
    missingStates: ["citation list when source-backed claims exist", "print/PDF pagination polish"],
    x: 4020,
    y: 1470,
    children: ["report-preview-mobile", "library-saved"],
    userJob: "Inspect the report before sending or saving it.",
    screenJob: "Show the durable artifact Yentl will produce.",
    desktopTarget: "Preview is readable, printable, and scoped to the selected session/source.",
    mobileTarget: "Preview is paginated or sectioned for phone review before share.",
    reviewAnchor: "Does export include a real preview, not only a download button?",
  },
  {
    id: "report-preview-mobile",
    title: "Report Preview Mobile",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/route-session-report-preview-mobile.png",
    sourcePath: "components/session/ExportDialog.tsx; docs/superpowers/validation/screenshots/route-session-report-preview-mobile.png",
    screenshotStatus: "current",
    screenshotNote: "390px mobile capture of the in-dialog report preview. Content is scrollable in the dialog and text wraps within the modal.",
    missingStates: ["platform share sheet", "citation list when source-backed claims exist"],
    x: 4280,
    y: 1470,
    children: ["library-saved"],
    userJob: "Review the export report before sharing from a phone-sized viewport.",
    screenJob: "Prove report preview is not desktop-only.",
    desktopTarget: "Desktop preview is covered by the report-preview node.",
    mobileTarget: "Preview content wraps inside the modal with counts and samples visible above export choices.",
    reviewAnchor: "Can a phone user understand what the report contains before sharing?",
  },
  {
    id: "end-dialog",
    title: "End Session Dialog",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/export-dialog.png",
    sourcePath: "Target state missing: end-session confirmation and save/export options.",
    screenshotStatus: "missing",
    screenshotNote: "End session is a required modal, especially for live mic/browser capture.",
    missingStates: ["confirm end", "save before ending", "discard warning", "recording stop state", "ended summary", "mobile end sheet"],
    x: 3500,
    y: 1660,
    children: ["library-saved", "export"],
    userJob: "Stop live work without losing the session.",
    screenJob: "Confirm consequences and offer save/export before ending.",
    desktopTarget: "End dialog distinguishes stopping capture from deleting/saving analysis.",
    mobileTarget: "End confirmation is large, explicit, and safely separated from pause.",
    reviewAnchor: "Can a user end live capture deliberately?",
  },
  {
    id: "library-empty",
    title: "Sessions Empty",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/library.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/17-sessions-empty.png",
    screenshotStatus: "reference",
    screenshotNote: "Empty library proof exists; target needs privacy/local-storage copy and route back to useful sources.",
    missingStates: ["empty state", "privacy/local-storage copy", "start new session", "import old session", "mobile empty library"],
    x: 3760,
    y: 1660,
    children: ["source"],
    userJob: "Understand why there are no saved sessions and how to start.",
    screenJob: "Make empty library useful, honest, and privacy-aware.",
    desktopTarget: "Empty state explains storage/account sync and offers source choices.",
    mobileTarget: "Search/filter chrome does not dominate an empty state.",
    reviewAnchor: "Does the empty library teach what will be saved next time?",
  },
  {
    id: "library-saved",
    title: "Saved Sessions",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/library.png",
    sourcePath: ".project/screenshots/v1.2-ingestion/19-sessions-with-saved.png",
    screenshotStatus: "reference",
    screenshotNote: "Saved-session proof exists, but final needs search/filter/sort, clear-all, delete, restore, and mobile variants.",
    missingStates: ["search", "filter", "sort", "restore session", "delete one", "clear all", "mobile library"],
    x: 4020,
    y: 1660,
    children: ["library-clear-all"],
    userJob: "Find, restore, export, or remove saved analysis sessions.",
    screenJob: "Make the durable record searchable and safely editable.",
    desktopTarget: "Library rows show source, status, date, saved artifacts, resume/export/delete actions.",
    mobileTarget: "Search-first list with compact resume/export actions.",
    reviewAnchor: "Does the library feel like a real saved-work surface?",
  },
  {
    id: "library-clear-all",
    title: "Clear All Confirmation",
    branch: "Durable record",
    screenshot: "/visual-evidence/flow-screenshots/current/library.png",
    sourcePath: "Target state missing: destructive clear-all confirmation.",
    screenshotStatus: "missing",
    screenshotNote: "Clear-all is destructive and needs its own confirmation state.",
    missingStates: ["clear all button", "confirmation modal", "irreversible warning", "success state", "mobile confirmation"],
    x: 4020,
    y: 1850,
    children: ["library-empty"],
    userJob: "Delete saved sessions only after understanding the consequence.",
    screenJob: "Protect destructive actions with explicit confirmation and recovery language.",
    desktopTarget: "Confirmation names the scope and explains local/account storage impact.",
    mobileTarget: "Destructive action uses a separate confirmation sheet with cancel prominent.",
    reviewAnchor: "Is destructive library cleanup safely represented?",
  },
  ...routeScreenshotNodes,
  ...mobileRouteScreenshotNodes,
  ...populatedDynamicRouteNodes,
];

const nodeMap = new Map(flowNodes.map((node) => [node.id, node]));

export function AzFlowDashboard() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(flowNodes[0].id);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);
  const [comments, setComments] = useState<FlowComment[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ xPct: number; yPct: number } | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [imageMode, setImageMode] = useState<"full" | "fit">("full");

  const selectedNode = nodeMap.get(selectedNodeId) ?? flowNodes[0];
  const modalNode = modalNodeId ? nodeMap.get(modalNodeId) ?? null : null;
  const selectedHasTargetActual = targetActualNodeIds.has(selectedNode.id);
  const modalHasTargetActual = modalNode ? targetActualNodeIds.has(modalNode.id) : false;
  const commentsForModal = modalNode
    ? comments.filter((comment) => comment.nodeId === modalNode.id)
    : [];
  const activeComment = activeCommentId
    ? comments.find((comment) => comment.id === activeCommentId) ?? null
    : null;

  const edges = useMemo(() => {
    return flowNodes.flatMap((node) =>
      (node.children ?? []).flatMap((childId) => {
        const child = nodeMap.get(childId);
        if (!child) return [];
        const w = node.w ?? CARD_W;
        const h = node.h ?? CARD_H;
        const childH = child.h ?? CARD_H;
        const x1 = node.x + w;
        const y1 = node.y + h / 2;
        const x2 = child.x;
        const y2 = child.y + childH / 2;
        const mid = Math.max(80, (x2 - x1) / 2);
        return [{
          id: `${node.id}-${child.id}`,
          path: `M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}`,
        }];
      }),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/project-flow-comments")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { comments?: FlowComment[] } | null) => {
        if (!cancelled && Array.isArray(data?.comments)) setComments(data.comments);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function openModal(node: FlowNode) {
    setSelectedNodeId(node.id);
    setModalNodeId(node.id);
    setPendingPoint(null);
    setActiveCommentId(null);
    setImageMode("full");
    setDraft("");
  }

  function addPoint(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    setPendingPoint({
      xPct: Math.max(0, Math.min(100, xPct)),
      yPct: Math.max(0, Math.min(100, yPct)),
    });
    setActiveCommentId(null);
    setDraft("");
  }

  function saveDraft() {
    if (!draft.trim()) return;
    if (activeCommentId) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === activeCommentId
            ? { ...comment, text: draft.trim() }
            : comment,
        ),
      );
      setActiveCommentId(null);
      setDraft("");
      return;
    }
    if (!modalNode || !pendingPoint) return;
    setComments((prev) => [
      ...prev,
      {
        id: `${modalNode.id}-${Date.now()}`,
        nodeId: modalNode.id,
        nodeTitle: modalNode.title,
        screenshot: modalNode.screenshot,
        sourcePath: modalNode.sourcePath,
        xPct: Number(pendingPoint.xPct.toFixed(2)),
        yPct: Number(pendingPoint.yPct.toFixed(2)),
        text: draft.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setPendingPoint(null);
    setDraft("");
  }

  function startEdit(comment: FlowComment) {
    setActiveCommentId(comment.id);
    setPendingPoint(null);
    setDraft(comment.text);
  }

  function removeComment(commentId: string) {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
      setDraft("");
    }
  }

  function cancelDraft() {
    setPendingPoint(null);
    setActiveCommentId(null);
    setDraft("");
  }

  async function saveComments() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/project-flow-comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  }

  function downloadComments() {
    const blob = new Blob([JSON.stringify({ savedAt: new Date().toISOString(), comments }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yentl-flow-review-comments.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-5 grid gap-4">
      <div className="rounded-lg border border-line bg-paper p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Screenshot canvas · nodes and branches
            </div>
            <h2 className="mt-1 font-serif text-[26px] font-medium leading-tight text-ink">
              A-to-Z Flow
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">
              Current screenshots arranged left-to-right by relationship. Click any thumbnail to review it full screen,
              place point comments, then save the round into the project review document.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveComments}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-[12px] font-semibold text-ink-2 hover:border-teal/40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save comments"}
            </button>
            <button
              type="button"
              onClick={downloadComments}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-[12px] font-semibold text-ink-2 hover:border-teal/40"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export JSON
            </button>
          </div>
        </div>
        {saveState === "error" && (
          <p className="mt-3 rounded-md border border-red/20 bg-red-soft px-3 py-2 text-[12px] text-red">
            Could not save comments to disk. Export JSON is still available.
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-auto rounded-lg border border-line bg-[#fbfaf6] shadow-sm">
          <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <svg
              className="pointer-events-none absolute inset-0"
              width={CANVAS_W}
              height={CANVAS_H}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              aria-hidden
            >
              <defs>
                <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="#9b9487" />
                </marker>
              </defs>
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke="#d4cdbf"
                  strokeWidth="2"
                  markerEnd="url(#flow-arrow)"
                />
              ))}
            </svg>

            {flowNodes.map((node) => {
              const count = comments.filter((comment) => comment.nodeId === node.id).length;
              const active = selectedNode.id === node.id;
              const hasTargetActual = targetActualNodeIds.has(node.id);
              return (
                <article
                  key={node.id}
                  className={[
                    "absolute overflow-hidden rounded-lg border bg-paper shadow-sm transition-all",
                    active ? "border-teal shadow-md ring-2 ring-teal/20" : "border-line hover:border-teal/40",
                  ].join(" ")}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w ?? CARD_W,
                    height: node.h ?? CARD_H,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openModal(node)}
                    className="group relative block h-[102px] w-full overflow-hidden bg-white text-left"
                    aria-label={`Open ${node.title} ${hasTargetActual ? "target UI" : "screenshot"}`}
                  >
                    {hasTargetActual ? (
                      <TargetActualCard node={node} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={node.screenshot} alt={node.title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                    )}
                    <span
                      className={[
                        "absolute left-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                        hasTargetActual ? "top-2 border-teal/30 bg-teal-soft text-teal" : `top-2 ${screenshotStatusClasses[node.screenshotStatus]}`,
                      ].join(" ")}
                    >
                      {hasTargetActual ? "Target UI" : screenshotStatusLabels[node.screenshotStatus]}
                    </span>
                    {hasTargetActual && (
                      <span
                        className={[
                          "absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em]",
                          screenshotStatusClasses[node.screenshotStatus],
                        ].join(" ")}
                      >
                        {screenshotStatusLabels[node.screenshotStatus]}
                      </span>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-ink shadow-sm">
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className="grid w-full gap-1 p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-teal">
                        {node.branch}
                      </span>
                      {count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-cream px-1.5 py-0.5 text-[10px] text-ink-3">
                          <MessageSquarePlus className="h-3 w-3" aria-hidden />
                          {count}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-serif text-[17px] leading-tight text-ink">{node.title}</h3>
                    <p className="line-clamp-2 text-[11px] leading-snug text-ink-3">{node.reviewAnchor}</p>
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-paper p-4 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-teal">
            Selected node
          </div>
          <h3 className="mt-1 font-serif text-[22px] leading-tight text-ink">{selectedNode.title}</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{selectedNode.reviewAnchor}</p>
          <div
            className={[
              "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
              screenshotStatusClasses[selectedNode.screenshotStatus],
            ].join(" ")}
          >
            {screenshotStatusLabels[selectedNode.screenshotStatus]}
          </div>
          {selectedHasTargetActual && (
            <div className="ml-2 mt-3 inline-flex rounded-full border border-teal/30 bg-teal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-teal">
              Target UI available
            </div>
          )}

          <div className="mt-4 grid gap-3 text-[12px] leading-relaxed">
            {selectedHasTargetActual && (
              <InfoBlock
                label="Rendered target"
                value="This node now has a first-pass target UI rendered directly in the flow atlas. The screenshot status still describes whether the production capture is current, reference-only, stale, or missing."
              />
            )}
            <InfoBlock label="Screenshot status" value={selectedNode.screenshotNote} />
            <InfoBlock label="User job" value={selectedNode.userJob} />
            <InfoBlock label="Screen job" value={selectedNode.screenJob} />
            <InfoBlock label="Desktop target" value={selectedNode.desktopTarget} />
            <InfoBlock label="Mobile target" value={selectedNode.mobileTarget} />
          </div>

          {selectedNode.missingStates && selectedNode.missingStates.length > 0 && (
            <div className="mt-4 rounded-md border border-line bg-cream p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Missing states to capture
              </div>
              <ul className="grid gap-1 text-[11.5px] leading-snug text-ink-3">
                {selectedNode.missingStates.map((state) => (
                  <li key={state}>- {state}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-md border border-line-soft bg-cream px-3 py-2 font-mono text-[10px] text-ink-4">
            {selectedNode.sourcePath}
          </div>
          <div className="mt-4 text-[12px] text-ink-3">
            {comments.filter((comment) => comment.nodeId === selectedNode.id).length} saved comment
            {comments.filter((comment) => comment.nodeId === selectedNode.id).length === 1 ? "" : "s"} on this node.
          </div>
        </aside>
      </div>

      {modalNode && (
        <div className="fixed inset-0 z-50 grid bg-ink/80 p-4">
          <div className="min-h-0 rounded-lg border border-line bg-paper shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-teal">
                  {modalHasTargetActual ? "Target UI review" : "Point review"}
                </div>
                <h3 className="font-serif text-[21px] leading-tight text-ink">{modalNode.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {modalHasTargetActual && (
                    <div className="inline-flex rounded-full border border-teal/30 bg-teal-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-teal">
                      Target UI
                    </div>
                  )}
                  <div
                    className={[
                      "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                      screenshotStatusClasses[modalNode.screenshotStatus],
                    ].join(" ")}
                  >
                    {screenshotStatusLabels[modalNode.screenshotStatus]}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border border-line bg-cream p-1">
                  <button
                    type="button"
                    onClick={() => setImageMode("full")}
                    className={[
                      "rounded px-2.5 py-1.5 text-[11px] font-semibold",
                      imageMode === "full" ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:text-ink",
                    ].join(" ")}
                  >
                    Full length
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("fit")}
                    className={[
                      "rounded px-2.5 py-1.5 text-[11px] font-semibold",
                      imageMode === "fit" ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:text-ink",
                    ].join(" ")}
                  >
                    Fit screen
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNodeId(null)}
                  className="rounded-md border border-line bg-cream p-2 text-ink-2 hover:border-teal/40"
                  aria-label="Close screenshot review"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="grid max-h-[calc(100vh-120px)] min-h-0 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-0 overflow-auto rounded-lg border border-line bg-white p-3">
                <div className={["relative mx-auto", modalHasTargetActual ? "w-full" : "w-fit"].join(" ")}>
                  {modalHasTargetActual ? (
                    <div
                      role="img"
                      aria-label={`${modalNode.title} target UI`}
                      className={[
                        "cursor-crosshair rounded-md border border-line bg-paper shadow-sm",
                        imageMode === "full"
                          ? "w-full"
                          : "w-full max-w-full",
                      ].join(" ")}
                      onClick={addPoint}
                    >
                      <TargetActualSurface node={modalNode} />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={modalNode.screenshot}
                      alt={`${modalNode.title} full screenshot`}
                      className={[
                        "cursor-crosshair rounded-md border border-line",
                        imageMode === "full"
                          ? "max-w-none"
                          : "max-h-[calc(100vh-220px)] max-w-full",
                      ].join(" ")}
                      onClick={addPoint}
                    />
                  )}
                  {commentsForModal.map((comment, index) => (
                    <button
                      type="button"
                      key={comment.id}
                      onClick={() => startEdit(comment)}
                      className={[
                        "absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-md transition",
                        activeCommentId === comment.id ? "bg-orange ring-4 ring-orange/25" : "bg-teal hover:bg-ink-2",
                      ].join(" ")}
                      style={{ left: `${comment.xPct}%`, top: `${comment.yPct}%` }}
                      title={`Edit point ${index + 1}: ${comment.text}`}
                      aria-label={`Edit comment point ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  {pendingPoint && (
                    <>
                      <span
                        className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange shadow-md"
                        style={{ left: `${pendingPoint.xPct}%`, top: `${pendingPoint.yPct}%` }}
                        aria-hidden
                      />
                      <div
                        className="absolute z-10 w-[min(320px,calc(100vw-64px))] rounded-lg border border-line bg-paper p-3 shadow-xl"
                        style={{
                          left: `${Math.min(pendingPoint.xPct + 2, 74)}%`,
                          top: `${Math.min(pendingPoint.yPct + 2, 72)}%`,
                        }}
                      >
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-teal">
                          New point
                        </div>
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder="Write feedback for this exact spot..."
                          className="min-h-[110px] w-full rounded-md border border-line bg-white p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-teal"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={saveDraft}
                            disabled={!draft.trim()}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-teal bg-teal px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-ink-5"
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                            Save point
                          </button>
                          <button
                            type="button"
                            onClick={cancelDraft}
                            className="rounded-md border border-line bg-cream px-3 py-2 text-[12px] font-semibold text-ink-2 hover:border-teal/40"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <aside className="min-h-0 overflow-auto rounded-lg border border-line bg-cream p-3">
                <div className="text-[12px] leading-relaxed text-ink-3">
                  {modalHasTargetActual
                    ? "Click the target UI surface where the issue lives. A point editor opens on the rendered screen; saved points can be edited or removed here."
                    : "Click the screenshot where the issue lives. A point editor opens on the image; saved points can be edited or removed here."}
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    activeComment
                      ? `Editing point ${commentsForModal.findIndex((comment) => comment.id === activeComment.id) + 1}...`
                      : pendingPoint
                        ? "Add feedback for the selected point..."
                        : modalHasTargetActual
                          ? "Click the target UI to place a point, or click an existing point to edit it."
                          : "Click the screenshot to place a point, or click an existing point to edit it."
                  }
                  className="mt-3 min-h-[120px] w-full rounded-md border border-line bg-paper p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-teal"
                />
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={(!pendingPoint && !activeCommentId) || !draft.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-teal bg-teal px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-ink-5"
                  >
                    {activeCommentId ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />}
                    {activeCommentId ? "Save edit" : "Save point"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelDraft}
                    disabled={!pendingPoint && !activeCommentId && !draft}
                    className="rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:border-teal/40 disabled:cursor-not-allowed disabled:text-ink-4"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-5 grid gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    Comments on this screen
                  </div>
                  {commentsForModal.length === 0 ? (
                    <div className="rounded-md border border-line bg-paper px-3 py-3 text-[12px] text-ink-4">
                      No comments yet.
                    </div>
                  ) : (
                    commentsForModal.map((comment, index) => (
                      <div
                        key={comment.id}
                        className={[
                          "rounded-md border bg-paper p-3 text-[12px] text-ink-3",
                          activeCommentId === comment.id ? "border-orange ring-2 ring-orange/15" : "border-line",
                        ].join(" ")}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            className="font-semibold text-ink-2 hover:text-teal"
                          >
                            Point {index + 1}
                          </button>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(comment)}
                              className="rounded border border-line bg-cream p-1.5 text-ink-3 hover:border-teal/40 hover:text-teal"
                              aria-label={`Edit comment point ${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeComment(comment.id)}
                              className="rounded border border-line bg-cream p-1.5 text-ink-3 hover:border-red/40 hover:text-red"
                              aria-label={`Remove comment point ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        </div>
                        <p className="leading-relaxed">{comment.text}</p>
                        <div className="mt-2 font-mono text-[10px] text-ink-4">
                          x {comment.xPct}% · y {comment.yPct}%
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
        {label}
      </div>
      <p className="text-ink-2">{value}</p>
    </div>
  );
}

function TargetActualCard({ node }: { node: FlowNode }) {
  const Icon =
    node.id.startsWith("youtube") ? Video :
    node.id.startsWith("extension") ? MonitorPlay :
    node.id.startsWith("source") || node.id === "mobile-share-sheet" ? MonitorPlay :
    node.id.startsWith("promo") ? ShieldCheck :
    LockKeyhole;
  return (
    <div className="grid h-full w-full gap-1 overflow-hidden bg-[#f8f5ec] p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded border border-teal/25 bg-teal-soft text-teal">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-teal">Rendered target</div>
          <div className="truncate font-serif text-[15px] leading-tight text-ink">{node.title}</div>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-[1.1fr_0.9fr] gap-2">
        <div className="rounded border border-line bg-paper p-2">
          <div className="aspect-video rounded border border-line bg-cream" />
          <div className="mt-1 h-1.5 w-4/5 rounded bg-teal/40" />
          <div className="mt-1 h-1.5 w-3/5 rounded bg-line" />
        </div>
        <div className="grid gap-1">
          <div className="rounded border border-line bg-paper p-1">
            <div className="h-1.5 w-4/5 rounded bg-line" />
            <div className="mt-1 h-1.5 w-3/5 rounded bg-teal/40" />
          </div>
          <div className="rounded border border-line bg-paper p-1">
            <div className="h-1.5 w-2/3 rounded bg-line" />
            <div className="mt-1 h-1.5 w-5/6 rounded bg-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetActualSurface({ node, compact = false }: { node: FlowNode; compact?: boolean }) {
  const content = (() => {
    if (node.id.startsWith("youtube")) return <YouTubeTarget node={node} />;
    if (node.id.startsWith("extension")) return <ExtensionTarget node={node} />;
    if (node.id.startsWith("source") || node.id === "mobile-share-sheet") return <SourceTarget node={node} />;
    if (node.id === "auth" || node.id === "auth-recovery" || node.id === "guest-demo") return <AuthTarget node={node} />;
    if (node.id.startsWith("promo")) return <PublicTarget node={node} />;
    return <GenericTarget node={node} />;
  })();

  return (
    <div className={compact ? "min-h-[408px] w-[920px] overflow-hidden" : "min-h-[720px] w-full overflow-hidden"}>
      {content}
    </div>
  );
}

function TargetShell({
  node,
  Icon,
  title,
  subtitle,
  children,
  right,
}: {
  node: FlowNode;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-[720px] overflow-hidden bg-[#f8f5ec] text-ink">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-teal/25 bg-teal-soft text-teal">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal">
              Target UI actual
            </div>
            <h4 className="truncate font-serif text-[24px] leading-tight text-ink">{title}</h4>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">{subtitle}</p>
          </div>
        </div>
        {right ?? (
          <div className="shrink-0 rounded-md border border-line bg-cream px-3 py-2 text-[11px] font-semibold text-ink-3">
            {node.branch}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function PublicTarget({ node }: { node: FlowNode }) {
  const trust = node.id === "promo-trust";
  return (
    <TargetShell
      node={node}
      Icon={trust ? ShieldCheck : PlayCircle}
      title={trust ? "Trust, Method, Pricing" : "Product Story Anchors"}
      subtitle={trust ? "Readable proof of method, limits, privacy, and pricing before account friction." : "The public page becomes reviewable section by section, not only as a first viewport."}
    >
      <div className="grid gap-6 px-8 py-7">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-lg border border-line bg-paper p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">
              yentl.it
            </div>
            <h5 className="mt-3 max-w-2xl font-serif text-[44px] leading-[1.05] text-ink">
              Live fact-checking that keeps the source in view.
            </h5>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-3">
              Paste a link, capture a page, upload media, use the mic, or review a document. Yentl shows what it heard, what it checked, and what evidence did or did not back the claim.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <TargetButton icon={PlayCircle} label="Try live demo" primary />
              <TargetButton icon={LockKeyhole} label="Create account" />
              <TargetButton icon={ShieldCheck} label="Read method" />
            </div>
          </section>
          <section className="rounded-lg border border-line bg-cream p-4">
            <div className="rounded-md border border-line bg-paper p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">Example proof</span>
                <span className="rounded-full border border-green/30 bg-green-soft px-2 py-1 text-[10px] font-semibold text-green">Live demo</span>
              </div>
              <div className="mt-4 aspect-video rounded-md border border-line bg-[#141414] p-4 text-white">
                <div className="flex h-full flex-col justify-end">
                  <div className="h-2 w-2 rounded-full bg-red" />
                  <div className="mt-2 text-[13px] font-semibold">Debate clip: claim detected at 02:18</div>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <StatusRow label="Supported by 3 sources" tone="green" />
                <StatusRow label="Mixed context on budget claim" tone="amber" />
                <StatusRow label="No valid backing found for quote attribution" tone="red" />
              </div>
            </div>
          </section>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {(trust
            ? ["Methodology", "Privacy", "Pricing", "FAQ"]
            : ["Hero", "Five ways in", "How it works", "Examples"]
          ).map((label, index) => (
            <div key={label} className="rounded-lg border border-line bg-paper p-4">
              <div className="text-[12px] font-semibold text-ink">{label}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
                {trust
                  ? ["Evidence quality, not magic.", "Local/session data explained.", "Free trial and team use.", "Limits and fallbacks opened."][index]
                  : ["Offer and CTA.", "Source job routing.", "Transcript to evidence.", "Real review stories."][index]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </TargetShell>
  );
}

function AuthTarget({ node }: { node: FlowNode }) {
  const recovery = node.id === "auth-recovery";
  const guest = node.id === "guest-demo";
  return (
    <TargetShell
      node={node}
      Icon={guest ? PlayCircle : LockKeyhole}
      title={guest ? "Guest Demo" : recovery ? "Auth Recovery" : "Sign In / Sign Up"}
      subtitle={guest ? "Try the product with a sample session before save/export asks for an account." : "Account screens explain saved sessions and sync instead of becoming a blank wall."}
      right={<TargetButton icon={ShieldCheck} label="Privacy first" />}
    >
      <div className="grid gap-6 px-8 py-7 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">
            Account value
          </div>
          <h5 className="mt-3 font-serif text-[31px] leading-tight text-ink">
            Save sessions, export reports, and resume across devices.
          </h5>
          <div className="mt-5 grid gap-3">
            <AuthBenefit icon={Save} title="Saved records" copy="Media, transcript, claims, markers, sources, and comments stay together." />
            <AuthBenefit icon={Download} title="Export history" copy="Reports, Markdown, JSON, and transcript exports stay findable." />
            <AuthBenefit icon={Smartphone} title="Mobile continuity" copy="Share/import on phone, review in browser, return later." />
          </div>
        </section>
        <section className="rounded-lg border border-line bg-cream p-5">
          <div className="rounded-lg border border-line bg-paper p-5 shadow-sm">
            {guest ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">Live demo</div>
                <h5 className="mt-2 font-serif text-[30px] text-ink">Choose a sample source</h5>
                <div className="mt-4 grid gap-3">
                  <DemoRow icon={Video} title="Watch a captioned video" copy="See transcript, claims, source cards, and Yentl Opinion." />
                  <DemoRow icon={FileText} title="Review an article" copy="Highlights stay attached to the original text." />
                  <DemoRow icon={Mic} title="Preview live mic" copy="Visualizer and hit cards show what live mode will feel like." />
                </div>
                <div className="mt-5 rounded-md border border-amber-2/25 bg-amber-soft p-3 text-[12px] leading-relaxed text-amber-2">
                  Demo sessions can be explored now. Create an account only when saving or exporting.
                </div>
              </>
            ) : recovery ? (
              <>
                <div className="rounded-md border border-red/25 bg-red-soft p-3 text-[12px] font-semibold text-red">
                  We could not verify that sign-in. Check the email, reset your password, or continue as guest.
                </div>
                <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">Email</label>
                <div className="mt-1 rounded-md border border-line bg-white px-3 py-3 text-[13px] text-ink-3">name@example.org</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <TargetButton icon={LockKeyhole} label="Send reset link" primary />
                  <TargetButton icon={PlayCircle} label="Continue demo" />
                </div>
                <div className="mt-4 rounded-md border border-line bg-cream p-3 text-[12px] leading-relaxed text-ink-3">
                  After recovery, return to the source picker you were trying to open.
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex rounded-md border border-line bg-cream p-1">
                  <span className="rounded bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink shadow-sm">Sign in</span>
                  <span className="px-3 py-1.5 text-[12px] font-semibold text-ink-3">Sign up</span>
                </div>
                <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">Email</label>
                <div className="mt-1 rounded-md border border-line bg-white px-3 py-3 text-[13px] text-ink-3">you@example.org</div>
                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">Password</label>
                <div className="mt-1 rounded-md border border-line bg-white px-3 py-3 text-[13px] text-ink-3">••••••••••</div>
                <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                  <TargetButton icon={LockKeyhole} label="Continue" primary />
                  <TargetButton icon={PlayCircle} label="Try demo" />
                </div>
                <button type="button" className="mt-3 text-[12px] font-semibold text-teal">Forgot password?</button>
              </>
            )}
          </div>
        </section>
      </div>
    </TargetShell>
  );
}

function SourceTarget({ node }: { node: FlowNode }) {
  const selected = node.id === "source-selected";
  const unavailable = node.id === "source-unavailable";
  const mobile = node.id === "mobile-share-sheet";
  return (
    <TargetShell
      node={node}
      Icon={mobile ? Smartphone : unavailable ? AlertTriangle : MonitorPlay}
      title={mobile ? "Mobile Share / Import" : unavailable ? "Platform Limits" : selected ? "Source Selected" : "Source Choice"}
      subtitle={mobile ? "Phone entry uses share sheet, files, mic, URLs, and documents without promising arbitrary app-audio capture." : "The picker routes by user job and shows the reward before the user commits."}
    >
      <div className="grid gap-6 px-8 py-7 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">What do you have?</div>
          <div className="mt-4 grid gap-3">
            <SourceChoice icon={Video} title="A video link" copy="YouTube, direct video, or browser page." active={selected} />
            <SourceChoice icon={MonitorPlay} title="A browser page" copy="Article, video, livestream, or page text." disabled={unavailable} />
            <SourceChoice icon={Upload} title="A file" copy="Audio, video, PDF, transcript, or document." />
            <SourceChoice icon={Mic} title="Room audio" copy="Live conversation, meeting, interview, or debate." />
          </div>
        </section>
        {mobile ? (
          <MobileSharePreview />
        ) : unavailable ? (
          <section className="rounded-lg border border-amber-2/25 bg-amber-soft p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-2" aria-hidden />
              <div>
                <h5 className="font-serif text-[28px] leading-tight text-ink">Browser capture is not available here.</h5>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                  Chrome extension capture is a desktop/browser path. On mobile, use share sheet, file import, microphone, pasted URL, or document import.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <FallbackTile icon={Smartphone} title="Use share sheet" />
              <FallbackTile icon={Upload} title="Import a file" />
              <FallbackTile icon={Mic} title="Start microphone" />
              <FallbackTile icon={LinkIcon} title="Paste URL/text" />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="rounded-lg border border-line bg-paper p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">
                    Reward preview
                  </div>
                  <h5 className="mt-1 font-serif text-[30px] text-ink">Watch workspace shell</h5>
                </div>
                <TargetButton icon={PlayCircle} label="Continue" primary />
              </div>
              <div className="mt-4 aspect-video rounded-md border border-line bg-[#151515] p-4 text-white">
                <div className="grid h-full place-items-center rounded border border-white/15">
                  <div className="text-center">
                    <Video className="mx-auto h-9 w-9 text-white/70" aria-hidden />
                    <div className="mt-2 text-[13px] font-semibold">Video or page preview appears here</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniPanel title="Transcript" rows={3} />
                <MiniPanel title="Claims" rows={3} />
                <MiniPanel title="Sources" rows={3} />
              </div>
            </div>
          </section>
        )}
      </div>
    </TargetShell>
  );
}

function YouTubeTarget({ node }: { node: FlowNode }) {
  const stage = getYouTubeStage(node.id);
  return (
    <TargetShell
      node={node}
      Icon={Video}
      title={stage.title}
      subtitle={stage.subtitle}
    >
      <div className="grid gap-5 px-8 py-7 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">YouTube source</div>
              <h5 className="mt-1 font-serif text-[30px] text-ink">{stage.workspaceTitle}</h5>
            </div>
            <span className={["rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", stage.badgeClass].join(" ")}>
              {stage.badge}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-cream p-4">
            <div className={["aspect-video rounded-md border p-5", stage.videoClass].join(" ")}>
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between text-[11px]">
                  <span>{stage.videoEyebrow}</span>
                  <span>{stage.videoMeta}</span>
                </div>
                <div>
                  {stage.videoIcon}
                  <h6 className="mt-3 font-serif text-[27px] leading-tight">{stage.videoHeadline}</h6>
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed opacity-80">{stage.videoCopy}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-line bg-white p-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-teal" aria-hidden />
                <div className="flex-1 truncate text-[13px] text-ink-3">
                  {stage.urlText}
                </div>
                {stage.urlTone === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-red" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green" aria-hidden />
                )}
              </div>
              {stage.inlineNote && (
                <div className={["mt-2 rounded-md px-3 py-2 text-[12px] leading-relaxed", stage.inlineNoteClass].join(" ")}>
                  {stage.inlineNote}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <TargetButton icon={stage.primaryIcon} label={stage.primaryAction} primary />
                <TargetButton icon={LinkIcon} label="Change source" />
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Build stages</div>
            <div className="mt-3 grid gap-2">
              {stage.steps.map((step) => (
                <ProgressRow key={step.label} {...step} />
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-cream p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Workspace preview</div>
            <div className="mt-3 grid gap-3">
              <MiniPanel title="Transcript rail" rows={stage.transcriptRows} active={stage.transcriptRows > 0} />
              <MiniPanel title="Claim queue" rows={stage.claimRows} active={stage.claimRows > 0} />
              <MiniPanel title="Source evidence" rows={stage.sourceRows} active={stage.sourceRows > 0} />
            </div>
          </section>
        </aside>
      </div>
    </TargetShell>
  );
}

type ExtensionSignalTone = "green" | "amber" | "red" | "teal";
type ExtensionSourceMode = "article" | "video" | "setup";
type ExtensionTabName = "Transcript" | "Claims" | "Markers";
type ExtensionHighlightMode = "claim" | "marker" | "both" | "none";

type ExtensionPanelRow = {
  title: string;
  copy: string;
  tone?: ExtensionSignalTone;
};

type ExtensionStageConfig = {
  title: string;
  subtitle: string;
  pageTitle: string;
  pageMeta: string;
  sourceLabel: string;
  sourceMeta: string;
  sourceMode: ExtensionSourceMode;
  captureLabel: string;
  captureCopy: string;
  statusClass: string;
  statusDot: string;
  meter: "idle" | "active" | "silent";
  readSummary: string;
  readLines: string[];
  signals: Array<{ label: string; value: string; tone: ExtensionSignalTone }>;
  activeTab: ExtensionTabName;
  panelRows: ExtensionPanelRow[];
  primaryAction: string;
  secondaryAction: string;
  highlightMode: ExtensionHighlightMode;
  diagnostic?: { title: string; items: string[]; tone: "amber" | "red" };
  showHighlightDetail?: boolean;
  showExportMenu?: boolean;
  showWorkspaceCard?: boolean;
};

function ExtensionTarget({ node }: { node: FlowNode }) {
  const stage = getExtensionStage(node.id);
  return (
    <TargetShell
      node={node}
      Icon={MonitorPlay}
      title={stage.title}
      subtitle={stage.subtitle}
      right={
        <div className="shrink-0 rounded-md border border-teal/25 bg-teal-soft px-3 py-2 text-[11px] font-semibold text-teal">
          Spec target
        </div>
      }
    >
      <div className="grid w-full gap-5 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <section className="min-w-0 rounded-lg border border-line bg-paper p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Visible source</div>
              <h5 className="truncate font-serif text-[27px] leading-tight text-ink">{stage.pageTitle}</h5>
              <p className="mt-1 truncate text-[12px] text-ink-4">{stage.pageMeta}</p>
            </div>
            <TargetButton icon={LinkIcon} label="Open source" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.72fr)]">
            <ExtensionSourcePreview stage={stage} />
            <section className="min-w-0 rounded-lg border border-line bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">Continuity rules</div>
              <h6 className="mt-2 font-serif text-[25px] leading-tight text-ink">One source, one read, deeper review when needed.</h6>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
                The panel stays beside the page, then promotes the same transcript, claims, markers, and source anchors into the full workspace.
              </p>
              <div className="mt-4 grid gap-2">
                <StatusRow label="Source stays visible" tone="green" />
                <StatusRow label="No duplicate top status blocks" tone="green" />
                <StatusRow label="Diagnostics appear only on failure" tone={stage.diagnostic ? stage.diagnostic.tone : "amber"} />
              </div>
              {stage.showWorkspaceCard && (
                <div className="mt-4 rounded-md border border-teal/25 bg-teal-soft p-3">
                  <div className="text-[12px] font-semibold text-teal">Full workspace handoff</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                    Snapshot now, live sync only when explicitly connected and labeled.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>

        <aside className="min-w-0 overflow-hidden rounded-lg border border-line bg-[#fbfaf6] p-3 shadow-sm">
          <section className="rounded-lg border border-line bg-paper p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{stage.sourceLabel}</div>
                <div className="truncate text-[11px] text-ink-4">{stage.sourceMeta}</div>
              </div>
              <span className={["shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", stage.statusClass].join(" ")}>
                {stage.captureLabel}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-cream px-3 py-2">
              <div className={["h-2 w-2 shrink-0 rounded-full", stage.statusDot].join(" ")} />
              <div className="min-w-0 flex-1 text-[12px] leading-snug text-ink-3">{stage.captureCopy}</div>
              <ExtensionMeter mode={stage.meter} />
            </div>
          </section>

          <section className="mt-3 rounded-lg border border-teal/25 bg-teal-soft p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">{"Yentl's Read"}</div>
              <button type="button" className="shrink-0 text-[11px] font-semibold text-teal">Expand</button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{stage.readSummary}</p>
            <div className="mt-3 grid gap-1.5">
              {stage.readLines.map((line) => (
                <div key={line} className="rounded-md border border-teal/20 bg-paper/80 px-3 py-2 text-[11.5px] leading-snug text-ink-3">
                  {line}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-3 grid grid-cols-2 gap-2">
            {stage.signals.map((signal) => (
              <ExtensionSignal key={signal.label} signal={signal} />
            ))}
          </section>

          <div className="mt-3 grid grid-cols-3 rounded-md border border-line bg-cream p-1">
            {(["Transcript", "Claims", "Markers"] as ExtensionTabName[]).map((tabName) => (
              <div
                key={tabName}
                className={[
                  "rounded px-2 py-1.5 text-center text-[11px] font-semibold",
                  stage.activeTab === tabName ? "bg-paper text-ink shadow-sm" : "text-ink-4",
                ].join(" ")}
              >
                {tabName}
              </div>
            ))}
          </div>

          <section className="mt-3 rounded-lg border border-line bg-paper p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">{stage.activeTab}</div>
            <div className="mt-3 grid gap-2">
              {stage.panelRows.map((row) => (
                <ExtensionPanelRowView key={row.title} row={row} />
              ))}
            </div>
            {stage.showHighlightDetail && (
              <div className="mt-3 rounded-md border border-teal/25 bg-teal-soft p-3">
                <div className="text-[12px] font-semibold text-teal">Highlight detail</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                  Quote boundary, claim status, source role, and marker rationale open at the highlighted source line.
                </p>
              </div>
            )}
            {stage.showExportMenu && (
              <div className="mt-3 grid gap-2 rounded-md border border-line bg-cream p-3">
                {["Markdown report", "JSON evidence pack", "Open report preview"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded border border-line bg-paper px-3 py-2 text-[11.5px] font-semibold text-ink-2">
                    <span>{item}</span>
                    <Download className="h-3.5 w-3.5 text-teal" aria-hidden />
                  </div>
                ))}
              </div>
            )}
            {stage.diagnostic && (
              <ExtensionDiagnostic diagnostic={stage.diagnostic} />
            )}
          </section>

          <div className="mt-3 flex flex-wrap gap-2">
            <TargetButton icon={MonitorPlay} label={stage.primaryAction} primary />
            <TargetButton icon={stage.secondaryAction === "Export" ? Download : stage.secondaryAction === "Pause" ? X : FileText} label={stage.secondaryAction} />
          </div>
        </aside>
      </div>
    </TargetShell>
  );
}

function ExtensionSourcePreview({ stage }: { stage: ExtensionStageConfig }) {
  if (stage.sourceMode === "setup") {
    return (
      <section className="min-w-0 rounded-lg border border-line bg-cream p-4">
        <div className="rounded-md border border-line bg-paper p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Extension setup</div>
          <h6 className="mt-2 font-serif text-[26px] leading-tight text-ink">Install, origin, permission, diagnostics.</h6>
          <div className="mt-4 grid gap-2">
            <ExtensionPanelRowView row={{ title: "App origin", copy: "Local Yentl origin is named before capture begins.", tone: "teal" }} />
            <ExtensionPanelRowView row={{ title: "Privacy", copy: "Page text and tab audio are scoped to the selected tab.", tone: "green" }} />
            <ExtensionPanelRowView row={{ title: "Diagnostics", copy: "Only shown when setup, permission, or audio health needs attention.", tone: "amber" }} />
          </div>
        </div>
      </section>
    );
  }

  if (stage.sourceMode === "video") {
    return (
      <section className="min-w-0 rounded-lg border border-line bg-cream p-4">
        <div className="aspect-video rounded-md border border-line bg-[#151515] p-4 text-white">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>Playing tab</span>
              <span>12:04</span>
            </div>
            <div>
              <PlayCircle className="h-10 w-10 text-white/80" aria-hidden />
              <h6 className="mt-3 font-serif text-[27px] leading-tight">Policy debate livestream</h6>
              <p className="mt-2 text-[12px] leading-relaxed text-white/70">Transcript, claims, and markers stay attached to this visible media source.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <ArticleLine active={stage.highlightMode === "claim" || stage.highlightMode === "both"} text="00:41 Speaker: 'This program doubled in cost last year.'" />
          <ArticleLine text="00:58 Speaker: 'The committee published an update this morning.'" />
          <ArticleLine marker={stage.highlightMode === "marker" || stage.highlightMode === "both"} text="01:22 Marker: loaded framing rises as the exchange gets sharper." />
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-lg border border-line bg-cream p-4">
      <div className="rounded-md border border-line bg-white p-4">
        <div className="h-4 w-32 rounded bg-line" />
        <div className="mt-5 h-7 w-4/5 rounded bg-ink/10" />
        <div className="mt-3 h-3 w-full rounded bg-line" />
        <div className="mt-2 h-3 w-11/12 rounded bg-line" />
        <div className="mt-2 h-3 w-3/4 rounded bg-line" />
      </div>
      <div className="mt-4 grid gap-2">
        <ArticleLine active={stage.highlightMode === "claim" || stage.highlightMode === "both"} text="Claim-bearing paragraph highlighted in the original page." />
        <ArticleLine text="A second paragraph remains readable without Yentl covering it." />
        <ArticleLine marker={stage.highlightMode === "marker" || stage.highlightMode === "both"} text="Rhetorical marker highlight stays anchored to the source." />
      </div>
    </section>
  );
}

function getExtensionStage(id: string) {
  const baseSignals = [
    { label: "Claim risk", value: "2 risky", tone: "amber" as const },
    { label: "Language heat", value: "Rising", tone: "amber" as const },
    { label: "Evidence state", value: "Checking", tone: "teal" as const },
    { label: "New finding", value: "1 pulse", tone: "teal" as const },
  ];

  const transcriptRows: ExtensionPanelRow[] = [
    { title: "Source text", copy: "Claim-bearing sentence is quoted with its visible page anchor.", tone: "teal" },
    { title: "Live line", copy: "Latest transcript line stays provisional until final ASR confidence lands.", tone: "amber" },
    { title: "Jump back", copy: "Open the highlighted paragraph or timestamp in the original source.", tone: "green" },
  ];

  const claimRows: ExtensionPanelRow[] = [
    { title: "Budget claim", copy: "Evidence is mixed; source roles and independence need review.", tone: "amber" },
    { title: "Quote attribution", copy: "No valid backing found yet; still checking source identity.", tone: "red" },
    { title: "Devil's Advocate queued", copy: "Challenge pass is ready before this becomes a durable report.", tone: "teal" },
  ];

  const markerRows: ExtensionPanelRow[] = [
    { title: "Loaded language", copy: "Phrase is marked with quote context and severity, not a naked label.", tone: "amber" },
    { title: "False binary", copy: "The panel explains why the framing narrows alternatives.", tone: "teal" },
    { title: "Reduced motion", copy: "Marker icons remain readable without relying on animation.", tone: "green" },
  ];

  const base: ExtensionStageConfig = {
    title: "Chrome Extension Panel",
    subtitle: "Same-page review keeps the original source visible while Yentl summarizes, flags, and hands off to the full workspace.",
    pageTitle: "Local article with claim-bearing text",
    pageMeta: "example.org/news-analysis",
    sourceLabel: "example.org/news-analysis",
    sourceMeta: "Article text detected",
    sourceMode: "article",
    captureLabel: "Reading",
    captureCopy: "Analyzing page text; audio capture is off.",
    statusClass: "border-teal/30 bg-teal-soft text-teal",
    statusDot: "bg-teal",
    meter: "idle",
    readSummary: "Current read: mostly factual, rhetoric rising around one budget claim, evidence still being checked.",
    readLines: [
      "Two claims are worth checking; one has mixed evidence.",
      "Rhetorical pressure rises in the third highlighted paragraph.",
      "No final judgment until source independence is clearer.",
    ],
    signals: baseSignals,
    activeTab: "Transcript",
    panelRows: transcriptRows,
    primaryAction: "Full workspace",
    secondaryAction: "Export",
    highlightMode: "claim",
  };

  const variants: Record<string, Partial<ExtensionStageConfig>> = {
    "extension-install": {
      title: "Extension Install / Options",
      subtitle: "Setup names the origin, privacy scope, permissions, and diagnostics without pretending capture has already started.",
      pageTitle: "Yentl extension options",
      pageMeta: "Local app origin and capture preferences",
      sourceLabel: "Extension setup",
      sourceMeta: "Not connected yet",
      sourceMode: "setup",
      captureLabel: "Setup",
      captureCopy: "Choose app origin and confirm tab/page permissions.",
      statusClass: "border-amber-2/30 bg-amber-soft text-amber-2",
      statusDot: "bg-amber-2",
      readSummary: "Current read: extension is not analyzing yet; the next useful step is setup proof.",
      readLines: ["Origin, privacy scope, and diagnostics are visible.", "Mobile path is share/import, not Chrome tab capture.", "Capture starts only after selected-tab permission."],
      signals: [
        { label: "Claim risk", value: "None yet", tone: "teal" },
        { label: "Language heat", value: "None yet", tone: "teal" },
        { label: "Evidence state", value: "Waiting", tone: "amber" },
        { label: "New finding", value: "0", tone: "teal" },
      ],
      panelRows: [
        { title: "Installed proof", copy: "Show the extension identity, local app origin, and current connection state.", tone: "green" },
        { title: "Permission scope", copy: "Explain page text, selected-tab audio, and workspace handoff separately.", tone: "amber" },
        { title: "Mobile honesty", copy: "Tell mobile users to share/import/mic instead of promising extension capture.", tone: "teal" },
      ],
      primaryAction: "Save setup",
      secondaryAction: "Diagnostics",
      highlightMode: "none",
    },
    "extension-popup": {
      title: "Extension Popup",
      subtitle: "The popup is a compact launcher: selected tab, capture mode, and one clear action.",
      sourceLabel: "Current tab selected",
      sourceMeta: "Article + optional tab audio",
      captureLabel: "Ready",
      captureCopy: "Selected tab is ready; choose page text or Use tab capture.",
      readSummary: "Current read: no analysis yet; Yentl can start with visible page text or tab audio.",
      readLines: ["The current tab is named before capture.", "Use tab capture only when the page is playing audio.", "Open panel keeps the source beside the analysis."],
      panelRows: [
        { title: "Analyze the video on this page", copy: "Use tab capture when a playable tab has audio.", tone: "teal" },
        { title: "Analyze visible text", copy: "Start from article text without asking the user to paste content.", tone: "green" },
        { title: "Open side panel", copy: "Move into same-page review instead of a detached dashboard.", tone: "green" },
      ],
      primaryAction: "Use tab capture",
      secondaryAction: "Open panel",
    },
    "extension-panel": {
      title: "Same-Page Panel",
      subtitle: "The panel has one compact source strip, one top-level read, and tabs for the detail.",
      readLines: ["Yentl's Read appears before tabs.", "Transcript, claims, and markers are below the persistent signal board.", "Diagnostics stay hidden unless a failure needs them."],
      panelRows: transcriptRows,
      highlightMode: "both",
    },
    "extension-text-capture": {
      title: "Page Text Detected",
      subtitle: "Article capture remains auditable against highlighted visible page text.",
      sourceLabel: "Wikinews article",
      sourceMeta: "Page text captured",
      readSummary: "Current read: page text is captured, two claim candidates are anchored, and rhetoric is moderate.",
      readLines: ["Detected article text is visible on the page.", "Claim anchors highlight exact paragraph boundaries.", "Source metadata is ready for the full workspace."],
      panelRows: transcriptRows,
      highlightMode: "claim",
    },
    "extension-audio-permission": {
      title: "Audio Permission",
      subtitle: "Permission is source-specific and explains what Yentl can hear before capture begins.",
      pageTitle: "Playing video tab",
      pageMeta: "news.example/live",
      sourceLabel: "news.example/live",
      sourceMeta: "Permission needed",
      sourceMode: "video",
      captureLabel: "Permission",
      captureCopy: "Waiting for selected-tab audio permission.",
      statusClass: "border-amber-2/30 bg-amber-soft text-amber-2",
      statusDot: "bg-amber-2",
      meter: "idle",
      readSummary: "Current read: Yentl is not hearing audio until the selected-tab permission is granted.",
      readLines: ["The selected tab and capture scope are named.", "Denying permission routes to upload, media URL, or text.", "No transcript or verdict appears before capture proof."],
      activeTab: "Transcript",
      panelRows: [
        { title: "Permission prompt", copy: "Start capture only for the current selected tab.", tone: "amber" },
        { title: "Privacy scope", copy: "Page text and audio are described as separate capture modes.", tone: "green" },
        { title: "Recovery", copy: "Denied permission keeps the source and routes to alternatives.", tone: "teal" },
      ],
      primaryAction: "Start capture",
      secondaryAction: "Cancel",
      highlightMode: "none",
    },
    "extension-audio-meter": {
      title: "Audio Meter Active",
      subtitle: "The panel proves Yentl is hearing the tab before claims or markers become trusted.",
      pageTitle: "Policy debate livestream",
      pageMeta: "video.example/live",
      sourceLabel: "Policy debate livestream",
      sourceMeta: "Tab audio active",
      sourceMode: "video",
      captureLabel: "Hearing",
      captureCopy: "Hearing tab audio; transcript lines are arriving.",
      statusClass: "border-green/30 bg-green-soft text-green",
      statusDot: "bg-green",
      meter: "active",
      readSummary: "Current read: live audio is clear enough for transcript; one claim is forming and rhetoric is rising.",
      readLines: ["First final transcript line landed 3 seconds ago.", "Speaker confidence is medium; quote boundaries stay provisional.", "Evidence search waits for a complete claim."],
      signals: [
        { label: "Claim risk", value: "1 forming", tone: "amber" },
        { label: "Language heat", value: "Rising", tone: "amber" },
        { label: "Evidence state", value: "Pending", tone: "teal" },
        { label: "New finding", value: "Live", tone: "green" },
      ],
      panelRows: transcriptRows,
      primaryAction: "Full workspace",
      secondaryAction: "Pause",
      highlightMode: "claim",
    },
    "extension-no-audio": {
      title: "No Audio Detected",
      subtitle: "No-audio recovery is a contextual failure state, not another always-on top block.",
      pageTitle: "Muted video tab",
      pageMeta: "video.example/watch",
      sourceLabel: "Muted video tab",
      sourceMeta: "Audio health warning",
      sourceMode: "video",
      captureLabel: "Silent",
      captureCopy: "Audio requested, but the selected tab is silent.",
      statusClass: "border-red/25 bg-red-soft text-red",
      statusDot: "bg-red",
      meter: "silent",
      readSummary: "Current read: Yentl is connected to the tab but has no usable audio yet.",
      readLines: ["The tab may be muted, paused, blocked, or the wrong tab.", "Text capture can continue if page text is available.", "Fallbacks: upload, media URL, or microphone."],
      signals: [
        { label: "Claim risk", value: "Waiting", tone: "amber" },
        { label: "Language heat", value: "Waiting", tone: "amber" },
        { label: "Evidence state", value: "No audio", tone: "red" },
        { label: "New finding", value: "0", tone: "teal" },
      ],
      panelRows: [
        { title: "Play or unmute the tab", copy: "The meter stays visible so the user can see recovery immediately.", tone: "amber" },
        { title: "Check selected tab", copy: "Make sure Yentl is attached to the tab that is actually playing.", tone: "amber" },
        { title: "Use alternate source", copy: "Upload, media URL, or mic keeps the source work moving.", tone: "teal" },
      ],
      diagnostic: {
        title: "Audio diagnostic",
        tone: "red",
        items: ["No input above floor", "Tab may be muted or paused", "DRM or browser policy may block capture"],
      },
      primaryAction: "Retry audio",
      secondaryAction: "Upload",
      highlightMode: "none",
    },
    "extension-transcript-tab": {
      title: "Extension Transcript Tab",
      subtitle: "Transcript is compact, searchable, and source-jumpable from the same panel.",
      activeTab: "Transcript",
      panelRows: transcriptRows,
      highlightMode: "claim",
    },
    "extension-claims-tab": {
      title: "Extension Claims Tab",
      subtitle: "Claims stay compact but include evidence state, source role, and Devil's Advocate.",
      activeTab: "Claims",
      panelRows: claimRows,
      readSummary: "Current read: two claims need attention; one is mixed, one lacks valid backing so far.",
      readLines: ["Claim rows show status without final unknown dead ends.", "Source thumbnails appear only when validated.", "Devil's Advocate is queued before report export."],
      highlightMode: "claim",
    },
    "extension-markers-tab": {
      title: "Extension Markers Tab",
      subtitle: "Markers teach the rhetoric pattern and stay tied to quote context.",
      activeTab: "Markers",
      panelRows: markerRows,
      readSummary: "Current read: factual claims are still under review, while loaded phrasing is increasing.",
      readLines: ["Marker icons stay legible in the constrained panel.", "Each marker includes quote context and why it matters.", "Reduced motion keeps the same information available."],
      highlightMode: "marker",
    },
    "extension-highlight-detail": {
      title: "Highlight Detail",
      subtitle: "A source highlight opens a local explanation instead of losing the page context.",
      activeTab: "Claims",
      panelRows: claimRows,
      showHighlightDetail: true,
      highlightMode: "both",
    },
    "extension-export-menu": {
      title: "Extension Export Menu",
      subtitle: "Export is scoped to the same source and routes large work to the report preview.",
      activeTab: "Claims",
      panelRows: claimRows,
      showExportMenu: true,
      primaryAction: "Report preview",
      secondaryAction: "Export",
      highlightMode: "claim",
    },
    "extension-full-workspace": {
      title: "Open Full Workspace",
      subtitle: "Panel-to-workspace handoff is labeled as a snapshot unless live sync is actually connected.",
      activeTab: "Claims",
      panelRows: claimRows,
      showWorkspaceCard: true,
      primaryAction: "Open workspace",
      secondaryAction: "Export",
      highlightMode: "claim",
    },
    "extension-live-sync": {
      title: "Future Live Sync",
      subtitle: "Live sync is represented as its own health state rather than implied magic.",
      sourceLabel: "Workspace sync",
      sourceMeta: "Connected to active tab",
      captureLabel: "Synced",
      captureCopy: "Full workspace is connected to the active browser source.",
      statusClass: "border-green/30 bg-green-soft text-green",
      statusDot: "bg-green",
      meter: "active",
      readSummary: "Current read: workspace and panel are connected, with source updates still traceable.",
      readLines: ["Sync state, lag, and reconnect are visible.", "Snapshot mode is labeled separately from live sync.", "Closed-tab recovery keeps the source record intact."],
      signals: [
        { label: "Claim risk", value: "2 risky", tone: "amber" },
        { label: "Language heat", value: "Rising", tone: "amber" },
        { label: "Evidence state", value: "Synced", tone: "green" },
        { label: "New finding", value: "Live", tone: "green" },
      ],
      showWorkspaceCard: true,
      primaryAction: "Reconnect",
      secondaryAction: "Export",
      highlightMode: "both",
    },
  };

  return makeExtensionStage({ ...base, ...(variants[id] ?? {}) });
}

function makeExtensionStage(stage: ExtensionStageConfig) {
  return stage;
}

function ExtensionMeter({ mode }: { mode: ExtensionStageConfig["meter"] }) {
  const bars = mode === "active" ? [3, 8, 14, 10, 5] : mode === "silent" ? [2, 2, 2, 2, 2] : [2, 4, 6, 4, 2];
  const color = mode === "silent" ? "bg-red/50" : mode === "active" ? "bg-teal/70" : "bg-ink/25";
  return (
    <div className="flex shrink-0 items-end gap-0.5" aria-hidden>
      {bars.map((height, index) => (
        <span key={index} className={["w-1 rounded-full", color].join(" ")} style={{ height }} />
      ))}
    </div>
  );
}

function ExtensionSignal({ signal }: { signal: { label: string; value: string; tone: ExtensionSignalTone } }) {
  return (
    <div className={["min-w-0 rounded-md border px-3 py-2", extensionToneClasses[signal.tone]].join(" ")}>
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">{signal.label}</div>
      <div className="mt-1 truncate text-[13px] font-semibold">{signal.value}</div>
    </div>
  );
}

function ExtensionPanelRowView({ row }: { row: ExtensionPanelRow }) {
  return (
    <div className={["rounded-md border bg-cream p-3", row.tone ? extensionToneBorders[row.tone] : "border-line"].join(" ")}>
      <div className="text-[12px] font-semibold text-ink">{row.title}</div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{row.copy}</div>
    </div>
  );
}

function ExtensionDiagnostic({ diagnostic }: { diagnostic: NonNullable<ExtensionStageConfig["diagnostic"]> }) {
  return (
    <div className={["mt-3 rounded-md border p-3", diagnostic.tone === "red" ? "border-red/25 bg-red-soft" : "border-amber-2/25 bg-amber-soft"].join(" ")}>
      <div className={["text-[12px] font-semibold", diagnostic.tone === "red" ? "text-red" : "text-amber-2"].join(" ")}>{diagnostic.title}</div>
      <div className="mt-2 grid gap-1.5">
        {diagnostic.items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[11.5px] text-ink-3">
            <AlertTriangle className={["h-3.5 w-3.5 shrink-0", diagnostic.tone === "red" ? "text-red" : "text-amber-2"].join(" ")} aria-hidden />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleLine({ text, active = false, marker = false }: { text: string; active?: boolean; marker?: boolean }) {
  return (
    <div
      className={[
        "break-words rounded-md border px-3 py-2 text-[12px] leading-relaxed",
        marker
          ? "border-amber-2/30 bg-amber-soft text-ink"
          : active
            ? "border-teal/30 bg-teal-soft text-ink"
            : "border-line bg-white text-ink-3",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

const extensionToneClasses = {
  green: "border-green/30 bg-green-soft text-green",
  amber: "border-amber-2/30 bg-amber-soft text-amber-2",
  red: "border-red/25 bg-red-soft text-red",
  teal: "border-teal/25 bg-teal-soft text-teal",
} satisfies Record<ExtensionSignalTone, string>;

const extensionToneBorders = {
  green: "border-green/30",
  amber: "border-amber-2/30",
  red: "border-red/25",
  teal: "border-teal/25",
} satisfies Record<ExtensionSignalTone, string>;

function GenericTarget({ node }: { node: FlowNode }) {
  return (
    <TargetShell
      node={node}
      Icon={FileText}
      title={node.title}
      subtitle="A rendered target surface will be added for this node in the next batch."
    >
      <div className="px-8 py-7">
        <div className="rounded-lg border border-line bg-paper p-6">
          <h5 className="font-serif text-[32px] text-ink">{node.screenJob}</h5>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-3">{node.desktopTarget}</p>
        </div>
      </div>
    </TargetShell>
  );
}

function getYouTubeStage(id: string) {
  const baseSteps = [
    { label: "Metadata", status: "pending" as const },
    { label: "Captions", status: "pending" as const },
    { label: "Transcript", status: "pending" as const },
    { label: "Claims", status: "pending" as const },
    { label: "Sources", status: "pending" as const },
  ];
  const stages: Record<string, ReturnType<typeof makeYouTubeStage>> = {
    youtube: makeYouTubeStage({
      title: "YouTube URL Entry",
      subtitle: "The link field lives inside the future Watch workspace, with the reward visible before submit.",
      workspaceTitle: "Paste a YouTube link",
      badge: "Needs URL",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-dashed border-line bg-white text-ink",
      videoEyebrow: "Destination shell",
      videoMeta: "No source yet",
      videoHeadline: "Video, transcript, claims, and source cards will fill this room.",
      videoCopy: "Paste a watch, shorts, embed, or youtu.be link without leaving the review surface.",
      videoIcon: <Video className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "https://youtube.com/watch?v=...",
      inlineNote: "The URL field is part of the Watch surface, not a bare utility hallway.",
      inlineNoteClass: "bg-teal-soft text-teal",
      primaryAction: "Check link",
      primaryIcon: Search,
      steps: baseSteps,
      transcriptRows: 0,
      claimRows: 0,
      sourceRows: 0,
    }),
    "youtube-preview-shell": makeYouTubeStage({
      title: "YouTube Preview Shell",
      subtitle: "The empty state already shows the video well, transcript rail, claim queue, and evidence areas.",
      workspaceTitle: "Preview before submit",
      badge: "Target shell",
      badgeClass: "border-teal/30 bg-teal-soft text-teal",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Empty workspace",
      videoMeta: "Reward preview",
      videoHeadline: "The analysis workspace is visible before the first server call.",
      videoCopy: "This keeps the user oriented through metadata, captions, transcript, claim extraction, and verification.",
      videoIcon: <MonitorPlay className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Paste link here and preview the destination immediately",
      primaryAction: "Continue",
      primaryIcon: PlayCircle,
      steps: baseSteps,
      transcriptRows: 2,
      claimRows: 1,
      sourceRows: 1,
    }),
    "youtube-valid-preview": makeYouTubeStage({
      title: "Valid URL Preview",
      subtitle: "Parsed metadata confirms the exact source before analysis begins.",
      workspaceTitle: "Source confirmed",
      badge: "Valid link",
      badgeClass: "border-green/30 bg-green-soft text-green",
      videoClass: "border-line bg-[#141414] text-white",
      videoEyebrow: "YouTube preview",
      videoMeta: "18:42",
      videoHeadline: "Debate clip: public policy claims",
      videoCopy: "Channel, title, duration, and thumbnail are shown before Yentl starts processing.",
      videoIcon: <PlayCircle className="h-10 w-10 text-white" aria-hidden />,
      urlText: "youtube.com/watch?v=public-policy-claims",
      primaryAction: "Start analysis",
      primaryIcon: PlayCircle,
      steps: [{ label: "Metadata", status: "done" as const }, ...baseSteps.slice(1)],
      transcriptRows: 1,
      claimRows: 1,
      sourceRows: 1,
    }),
    "youtube-invalid-url": makeYouTubeStage({
      title: "Invalid URL",
      subtitle: "Bad links teach the next move and keep the target shell visible.",
      workspaceTitle: "Fix the source",
      badge: "Invalid URL",
      badgeClass: "border-red/25 bg-red-soft text-red",
      videoClass: "border-red/25 bg-red-soft text-red",
      videoEyebrow: "Cannot parse",
      videoMeta: "Edit required",
      videoHeadline: "That link is not a playable YouTube video.",
      videoCopy: "Use a watch, shorts, embed, or youtu.be URL, or choose browser capture for pages and livestreams.",
      videoIcon: <AlertTriangle className="h-10 w-10 text-red" aria-hidden />,
      urlText: "youtube.com/channel/example",
      urlTone: "error",
      inlineNote: "This looks like a channel or playlist, not a single video.",
      inlineNoteClass: "bg-red-soft text-red",
      primaryAction: "Edit URL",
      primaryIcon: LinkIcon,
      steps: baseSteps,
      transcriptRows: 0,
      claimRows: 0,
      sourceRows: 0,
    }),
    "youtube-processing": makeYouTubeStage({
      title: "Link Resolving",
      subtitle: "The workspace builds in place while Yentl prepares the session.",
      workspaceTitle: "Preparing analysis",
      badge: "Building",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Stage 1 of 5",
      videoMeta: "In progress",
      videoHeadline: "Yentl is resolving source metadata and caption access.",
      videoCopy: "The user sees named stages instead of a mystery spinner.",
      videoIcon: <Clock3 className="h-10 w-10 text-amber-2" aria-hidden />,
      urlText: "youtube.com/watch?v=public-policy-claims",
      primaryAction: "Cancel",
      primaryIcon: X,
      steps: [{ label: "Metadata", status: "active" as const }, ...baseSteps.slice(1)],
      transcriptRows: 1,
      claimRows: 0,
      sourceRows: 1,
    }),
    "youtube-metadata": makeYouTubeStage({
      title: "Resolving Metadata",
      subtitle: "Source identity, trusted thumbnail, duration, and channel details appear first.",
      workspaceTitle: "Metadata resolving",
      badge: "Source card",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Source card",
      videoMeta: "oEmbed + page metadata",
      videoHeadline: "Title, channel, duration, and thumbnail are filling in.",
      videoCopy: "If metadata fails, the user can retry, edit URL, or switch source path.",
      videoIcon: <Search className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "youtube.com/watch?v=public-policy-claims",
      primaryAction: "Resolving",
      primaryIcon: Clock3,
      steps: [{ label: "Metadata", status: "active" as const }, ...baseSteps.slice(1)],
      transcriptRows: 1,
      claimRows: 0,
      sourceRows: 2,
    }),
    "youtube-captions": makeYouTubeStage({
      title: "Fetching Captions",
      subtitle: "Caption availability is visible and recoverable before transcript work starts.",
      workspaceTitle: "Checking captions",
      badge: "Captions",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Caption access",
      videoMeta: "English auto + manual",
      videoHeadline: "Caption tracks are being checked and normalized.",
      videoCopy: "If no track is available, Yentl routes to browser capture, upload, or transcript paste.",
      videoIcon: <FileText className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Caption tracks: English, English auto",
      primaryAction: "Fetching",
      primaryIcon: Clock3,
      steps: [{ label: "Metadata", status: "done" as const }, { label: "Captions", status: "active" as const }, ...baseSteps.slice(2)],
      transcriptRows: 2,
      claimRows: 0,
      sourceRows: 2,
    }),
    "youtube-transcript-build": makeYouTubeStage({
      title: "Transcript Building",
      subtitle: "Transcript rows appear as soon as enough caption text exists.",
      workspaceTitle: "Transcript building",
      badge: "Transcript",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Rows filling",
      videoMeta: "62 of 184 segments",
      videoHeadline: "Timestamped transcript is becoming reviewable.",
      videoCopy: "Partial transcript can be searched and anchored before verification is complete.",
      videoIcon: <FileText className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Transcript language: English",
      primaryAction: "Building",
      primaryIcon: Clock3,
      steps: [{ label: "Metadata", status: "done" as const }, { label: "Captions", status: "done" as const }, { label: "Transcript", status: "active" as const }, ...baseSteps.slice(3)],
      transcriptRows: 5,
      claimRows: 1,
      sourceRows: 2,
    }),
    "youtube-claim-extraction": makeYouTubeStage({
      title: "Extracting Claims",
      subtitle: "Candidate claims are provisional, quote-anchored, and clearly not final.",
      workspaceTitle: "Candidate claims",
      badge: "Provisional",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Claim queue",
      videoMeta: "7 candidates",
      videoHeadline: "Yentl found claims worth checking.",
      videoCopy: "Each candidate keeps its quote, timestamp, and still-checking state.",
      videoIcon: <MessageSquarePlus className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Candidate claims anchored to timestamps",
      primaryAction: "Review queue",
      primaryIcon: Search,
      steps: [{ label: "Metadata", status: "done" as const }, { label: "Captions", status: "done" as const }, { label: "Transcript", status: "done" as const }, { label: "Claims", status: "active" as const }, { label: "Sources", status: "pending" as const }],
      transcriptRows: 5,
      claimRows: 4,
      sourceRows: 2,
    }),
    "youtube-verification": makeYouTubeStage({
      title: "Verifying Sources",
      subtitle: "Evidence quality is shown with no final user-facing 'unverifiable' dead end.",
      workspaceTitle: "Evidence search",
      badge: "Still checking",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Source search",
      videoMeta: "Devil's Advocate queued",
      videoHeadline: "Sources are being checked and challenged.",
      videoCopy: "Final labels resolve to supported, contradicted, mixed, no valid backing found, still checking, or genuinely unknown.",
      videoIcon: <ShieldCheck className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Evidence quality visible on every claim",
      primaryAction: "Checking",
      primaryIcon: Search,
      steps: [{ label: "Metadata", status: "done" as const }, { label: "Captions", status: "done" as const }, { label: "Transcript", status: "done" as const }, { label: "Claims", status: "done" as const }, { label: "Sources", status: "active" as const }],
      transcriptRows: 5,
      claimRows: 4,
      sourceRows: 4,
    }),
    "youtube-ready": makeYouTubeStage({
      title: "Video Ready",
      subtitle: "The source is confirmed, analysis is prepared, and the next action is explicit.",
      workspaceTitle: "Ready to review",
      badge: "Ready",
      badgeClass: "border-green/30 bg-green-soft text-green",
      videoClass: "border-line bg-[#141414] text-white",
      videoEyebrow: "Playable source",
      videoMeta: "Transcript 184 segments",
      videoHeadline: "Video, transcript, claims, markers, and sources are ready.",
      videoCopy: "The user can watch, open claims, inspect markers, or export.",
      videoIcon: <PlayCircle className="h-10 w-10 text-white" aria-hidden />,
      urlText: "Ready state: metadata, captions, transcript, claims",
      primaryAction: "Open review",
      primaryIcon: PlayCircle,
      steps: baseSteps.map((step) => ({ ...step, status: "done" as const })),
      transcriptRows: 5,
      claimRows: 5,
      sourceRows: 4,
    }),
    "youtube-no-captions": makeYouTubeStage({
      title: "Caption Fallback",
      subtitle: "Caption failure becomes a guided branch, not a dead end.",
      workspaceTitle: "Captions unavailable",
      badge: "Fallback",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-amber-2/25 bg-amber-soft text-ink",
      videoEyebrow: "Caption access",
      videoMeta: "No public track",
      videoHeadline: "Yentl could not fetch usable captions.",
      videoCopy: "Keep the source context and choose browser capture, upload, media URL, or paste transcript.",
      videoIcon: <AlertTriangle className="h-10 w-10 text-amber-2" aria-hidden />,
      urlText: "Original URL preserved for fallback",
      inlineNote: "Best next path: capture the playing browser tab with the extension.",
      inlineNoteClass: "bg-amber-soft text-amber-2",
      primaryAction: "Use browser capture",
      primaryIcon: MonitorPlay,
      steps: [{ label: "Metadata", status: "done" as const }, { label: "Captions", status: "error" as const }, ...baseSteps.slice(2)],
      transcriptRows: 0,
      claimRows: 0,
      sourceRows: 1,
    }),
    "youtube-playback-blocked": makeYouTubeStage({
      title: "Playback Blocked",
      subtitle: "Playback problems do not erase transcript and evidence work.",
      workspaceTitle: "Transcript-only continuation",
      badge: "Player blocked",
      badgeClass: "border-red/25 bg-red-soft text-red",
      videoClass: "border-red/25 bg-red-soft text-red",
      videoEyebrow: "Embed unavailable",
      videoMeta: "Continue review",
      videoHeadline: "The video cannot play here, but analysis remains usable.",
      videoCopy: "Open the source on YouTube, continue transcript-only, or replace the URL.",
      videoIcon: <AlertTriangle className="h-10 w-10 text-red" aria-hidden />,
      urlText: "Playback blocked by source settings",
      urlTone: "error",
      primaryAction: "Open source",
      primaryIcon: LinkIcon,
      steps: baseSteps.map((step) => ({ ...step, status: "done" as const })),
      transcriptRows: 5,
      claimRows: 5,
      sourceRows: 4,
    }),
    "youtube-edit-url": makeYouTubeStage({
      title: "Wrong Video / Edit URL",
      subtitle: "Replacing a source is explicit and does not silently destroy work.",
      workspaceTitle: "Replace source?",
      badge: "Confirm edit",
      badgeClass: "border-amber-2/25 bg-amber-soft text-amber-2",
      videoClass: "border-line bg-white text-ink",
      videoEyebrow: "Source correction",
      videoMeta: "New session option",
      videoHeadline: "This appears to be the wrong video.",
      videoCopy: "Replace the source, keep the old session, or start a new one.",
      videoIcon: <LinkIcon className="h-10 w-10 text-teal" aria-hidden />,
      urlText: "Edit URL without losing the existing session",
      primaryAction: "Replace safely",
      primaryIcon: LinkIcon,
      steps: baseSteps.map((step) => ({ ...step, status: "done" as const })),
      transcriptRows: 5,
      claimRows: 3,
      sourceRows: 3,
    }),
  };

  return stages[id] ?? stages.youtube;
}

function makeYouTubeStage(stage: {
  title: string;
  subtitle: string;
  workspaceTitle: string;
  badge: string;
  badgeClass: string;
  videoClass: string;
  videoEyebrow: string;
  videoMeta: string;
  videoHeadline: string;
  videoCopy: string;
  videoIcon: ReactNode;
  urlText: string;
  urlTone?: "ok" | "error";
  inlineNote?: string;
  inlineNoteClass?: string;
  primaryAction: string;
  primaryIcon: ComponentType<{ className?: string }>;
  steps: Array<{ label: string; status: "done" | "active" | "pending" | "error" }>;
  transcriptRows: number;
  claimRows: number;
  sourceRows: number;
}) {
  return {
    inlineNoteClass: "bg-cream text-ink-3",
    urlTone: "ok" as const,
    ...stage,
  };
}

function TargetButton({ icon: Icon, label, primary = false }: { icon: ComponentType<{ className?: string }>; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-[12px] font-semibold",
        primary ? "border-teal bg-teal text-white shadow-sm" : "border-line bg-paper text-ink-2",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function AuthBenefit({ icon: Icon, title, copy }: { icon: ComponentType<{ className?: string }>; title: string; copy: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-cream p-3">
      <Icon className="mt-0.5 h-4 w-4 text-teal" aria-hidden />
      <div>
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{copy}</p>
      </div>
    </div>
  );
}

function DemoRow({ icon: Icon, title, copy }: { icon: ComponentType<{ className?: string }>; title: string; copy: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-cream p-3">
      <Icon className="h-5 w-5 text-teal" aria-hidden />
      <div>
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-[11.5px] text-ink-3">{copy}</div>
      </div>
    </div>
  );
}

function SourceChoice({
  icon: Icon,
  title,
  copy,
  active = false,
  disabled = false,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  copy: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border p-3",
        disabled ? "border-amber-2/25 bg-amber-soft" : active ? "border-teal bg-teal-soft" : "border-line bg-cream",
      ].join(" ")}
    >
      <Icon className={["h-5 w-5", disabled ? "text-amber-2" : "text-teal"].join(" ")} aria-hidden />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="truncate text-[11.5px] text-ink-3">{copy}</div>
      </div>
    </div>
  );
}

function MobileSharePreview() {
  return (
    <section className="rounded-lg border border-line bg-cream p-5">
      <div className="mx-auto max-w-[320px] rounded-[28px] border border-ink/20 bg-ink p-3 shadow-sm">
        <div className="rounded-[20px] bg-paper p-4">
          <div className="mx-auto h-1 w-16 rounded-full bg-ink/20" />
          <h5 className="mt-5 font-serif text-[25px] text-ink">Send to Yentl</h5>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-3">Choose a platform-honest mobile path.</p>
          <div className="mt-4 grid gap-2">
            <SourceChoice icon={LinkIcon} title="Shared URL" copy="Article, video page, or direct media." active />
            <SourceChoice icon={Upload} title="File import" copy="Audio, video, PDF, or transcript." />
            <SourceChoice icon={Mic} title="Microphone" copy="Live room audio." />
          </div>
        </div>
      </div>
    </section>
  );
}

function FallbackTile({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <Icon className="h-4 w-4 text-teal" aria-hidden />
      <div className="mt-2 text-[12px] font-semibold text-ink">{title}</div>
    </div>
  );
}

function MiniPanel({ title, rows, active = false }: { title: string; rows: number; active?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[11px] font-semibold text-ink">{title}</div>
      <div className="mt-2 grid gap-1.5">
        {Array.from({ length: Math.max(rows, 2) }).map((_, index) => (
          <div
            key={index}
            className={[
              "h-2 rounded-full",
              active && index < rows ? "bg-teal/50" : "bg-line",
              index === 0 ? "w-full" : index % 2 === 0 ? "w-3/4" : "w-5/6",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressRow({ label, status }: { label: string; status: "done" | "active" | "pending" | "error" }) {
  const tone = {
    done: "border-green/30 bg-green-soft text-green",
    active: "border-amber-2/30 bg-amber-soft text-amber-2",
    pending: "border-line bg-cream text-ink-4",
    error: "border-red/25 bg-red-soft text-red",
  }[status];
  const Icon = status === "done" ? CheckCircle2 : status === "error" ? AlertTriangle : Clock3;
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-cream px-3 py-2">
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
      <span className={["inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", tone].join(" ")}>
        <Icon className="h-3 w-3" aria-hidden />
        {status}
      </span>
    </div>
  );
}

function StatusRow({ label, tone }: { label: string; tone: "green" | "amber" | "red" }) {
  const classes = {
    green: "border-green/30 bg-green-soft text-green",
    amber: "border-amber-2/30 bg-amber-soft text-amber-2",
    red: "border-red/25 bg-red-soft text-red",
  }[tone];
  return (
    <div className={["rounded-md border px-3 py-2 text-[12px] font-semibold", classes].join(" ")}>
      {label}
    </div>
  );
}
