import { createDemoSource } from "./demo.js";
import { createLiveSource } from "./live-source.js";
import type { EvidenceSource, SourceMode } from "./types.js";

const demoSource = createDemoSource();
// Client creation is lazy: importing this boundary or choosing demo makes no requests.
const liveSource = createLiveSource();

export function getSource(mode: SourceMode): EvidenceSource {
  return mode === "demo" ? demoSource : liveSource;
}
