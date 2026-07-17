import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const EMBER_PROMPT_SHA256 =
  "6d0eccc387c59b42c439851061b190ea0b4b817090b84602277b9768d5c4ccee";
export const AI_PERSONAS_SHA256 =
  "4c14eddfb978f5a417eeb28e5d1db23f3b192f1b7df99617b730cfc5384f7687";

let cachedPrompt: string | undefined;
let cachedPersonas: string | undefined;
let cachedScribe: string | undefined;

function verifySource(
  source: string,
  fileName: string,
  expectedChecksum: string,
): string {
  const actualChecksum = createHash("sha256").update(source).digest("hex");

  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Canonical ${fileName} provenance check failed`);
  }
  return source;
}

/**
 * Loads the complete, canonical Ember source without rewriting or excerpting it.
 * The static URL lets Next.js include the markdown in its server output trace.
 */
export function loadCanonicalEmberPrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  cachedPrompt = verifySource(
    readFileSync(new URL("../../../aiprompting.md", import.meta.url), "utf8"),
    "aiprompting.md",
    EMBER_PROMPT_SHA256,
  );
  return cachedPrompt;
}

export function loadCanonicalPersonaDocument(): string {
  cachedPersonas ??= verifySource(
    readFileSync(new URL("../../../AI_PERSONAS.md", import.meta.url), "utf8"),
    "AI_PERSONAS.md",
    AI_PERSONAS_SHA256,
  );
  return cachedPersonas;
}

/** Returns the complete Scribe persona section without rewriting its language. */
export function loadCanonicalScribePersona(): string {
  if (cachedScribe) {
    return cachedScribe;
  }

  const source = loadCanonicalPersonaDocument();
  const start = source.indexOf("## 2. Scribe: The Storyteller");
  const end = source.indexOf("\n---\n\n## Technical Implementation", start);
  if (start < 0 || end < 0) {
    throw new Error("Canonical Scribe persona section is missing");
  }

  cachedScribe = source.slice(start, end);
  return cachedScribe;
}
