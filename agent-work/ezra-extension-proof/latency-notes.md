# Ezra Latency Notes

Date: 2026-05-21

## Local Validation Page

- Target: `http://localhost:3000/validation/browser-capture.html`
- Panel injection: visually immediate after clicking `Yentl Tab Listener`.
- Page text: visible immediately in the panel.
- Transcript: observed after the media ran; final proof state showed `TRANSCRIPT 0:24`.
- Markers: final proof state showed `MARKERS 2`.
- Stop: `Stop Yentl capture` changed the panel to `Capture stopped`.
- Precision caveat: this was a manual run, not an instrumented timer. First visible transcript latency was observed in the low tens of seconds, but no millisecond-grade measurement was captured.

## Wikimedia Video Page

- Target: `https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm`
- Site access: Yentl initially appeared under Chrome's `Access requested` list. After clicking it once, it moved under `Full access`; clicking it again injected the panel.
- Panel injection: same-page rail appeared and Chrome marked the tab `Tab content shared`.
- Audio status: panel moved from waiting to `Audio is arriving`, then `Building the live transcript`, then `Capture stopped`.
- Transcript: proof state reached `TRANSCRIPT 0:30`.
- Markers: proof state reached `MARKERS 2`, including `Glittering Generalities` and `Loaded Language`.
- First useful transcript: visible by the time the media reached roughly `0:30`; exact wall-clock latency was not instrumented.
- Quality issue: the transcript included Wikimedia interface text at `0:00` before real speech lines. This suggests page-text capture can contaminate transcript display on media pages and should be reviewed separately from audio ingestion latency.

## Wikinews Article Page

- Target: `https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles`
- Rail injection: passed; Chrome marked the tab `Tab content shared`.
- Localhost workspace: blocked by Chrome after the site displayed an `Access other apps and services on this device` permission prompt. I closed the prompt rather than approving it for the user.
- Transcript/audio latency: not applicable for this text-only article page.

## Snapshot Handoff

- Initial real-site `Open snapshot` test failed with `Saved snapshot not found`.
- Root cause inferred from the failure: Chrome storage partitioning isolates the `localhost` iframe's IndexedDB from the top-level `localhost` workspace opened from a third-party page.
- Fix added: mirror the saved session into the popup window's own IndexedDB before navigation.
- Current status: code and tests pass; fresh manual live proof of the fixed real-site snapshot path is still recommended because the active panel state was reset during hot refresh before a clean post-fix retest could complete.

