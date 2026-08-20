# Ember Prompt Audit

**Date:** 2026-08-20
**Status:** Audit only. No prompt, spec, or flow file was modified.

## What was compared

Three sources, read in full:

1. **`docs/ember-persona.md`** (304 lines) — the detailed Ember master prompt, recently
   rescued from a file named `AIGUIDA`. Covers **only** the Ember question-generation
   persona. It says nothing about the Scribe, Dr. Ember, or the Artistic Director.
2. **`agents.md`** (91 lines) — defines four personas: Ember (§1), Scribe (§2),
   Dr. Ember (§3), The Artistic Director (§4). For three of the four shipped flows this
   is the _only_ written spec.
3. **The four shipped flow files** —
   `src/ai/flows/generate-contextual-questions.ts`,
   `src/ai/flows/analyze-answers-and-generate-summary.ts`,
   `src/ai/flows/generate-therapist-notes.ts`,
   `src/ai/flows/generate-visual-memory.ts`.
   `src/ai/flows/shared-utils.ts` and `src/lib/constants.ts` were also read where a
   prompt rule depends on them.

A fourth file, **`aiprompting.md`** (306 lines), is a near-duplicate of
`docs/ember-persona.md` and is the file `agents.md` names as canonical. See
_Contradictions between the specs themselves_.

**Headline:** the Scribe and Artistic Director prompts track their spec closely. The
Ember question prompt is a heavily abridged paraphrase of a 304-line spec — it keeps the
rule _headings_ but drops nearly all the content that made those rules operable, and it
drops trio support entirely. Dr. Ember's prompt contradicts itself in two places.

---

## Requirement table

### Ember — question generation (`generate-contextual-questions.ts`)

| Requirement                                                                                                         | Source                               | Honoured in prompt?                    | Where (file:line)                          | Note                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Persona: "part wingman, part therapist, part co-conspirator"; give permission to voice what they whisper themselves | ember-persona.md:1                   | Yes                                    | generate-contextual-questions.ts:65        | Reproduced near-verbatim — but "couples (or trios)" was narrowed to "couples".                            |
| Spicy level adherence, rule stated                                                                                  | ember-persona.md:15                  | Yes                                    | generate-contextual-questions.ts:68        | Rule present.                                                                                             |
| The four spicy-level _definitions_ (Mild = flirty glances … Extra-Hot = taboo-adjacent, unfiltered)                 | ember-persona.md:16-19               | **No**                                 | —                                          | Nothing in the prompt defines the levels; the model calibrates from the bare label.                       |
| Pre-output spicy-level self-check (STEP 4)                                                                          | ember-persona.md:268-274             | **No**                                 | —                                          | Absent.                                                                                                   |
| Category adherence                                                                                                  | ember-persona.md:251; agents.md:22   | Yes in prompt text, **broken in code** | generate-contextual-questions.ts:69        | Whitelist in shared-utils.ts:74-83 shares only one name with the ten real categories. See D2.             |
| Every question about THEIR partner(s)                                                                               | ember-persona.md:21-24; agents.md:23 | Partly                                 | generate-contextual-questions.ts:70        | Prompt says `"your partner"` singular only; drops `"Partner A" / "Partner B"`.                            |
| Partner count (`{partner_count}`, 2 or 3) as a hard constraint                                                      | ember-persona.md:250; agents.md:22   | **No**                                 | generate-contextual-questions.ts:18-29     | Input schema has no player-count field at all. See D1.                                                    |
| Specificity is sacred; force precision                                                                              | ember-persona.md:26-29; agents.md:24 | Yes                                    | generate-contextual-questions.ts:71        | Both named devices ("Exactly where…", "one specific") are carried through.                                |
| Build incrementally: observation → wanting → confessing → planning                                                  | ember-persona.md:31-34, 258          | **No**                                 | —                                          | Not in the prompt; the flow also passes no session position.                                              |
| Playful, not porny: "wit before explicit", "filthy but never crude"                                                 | ember-persona.md:36-39, 300          | **No**                                 | generate-contextual-questions.ts:65        | Prompt's tone line is "playful, insightful, and never judgmental" — the crudeness guardrail is gone.      |
| One question at a time; no compound questions; no "A or B" unless meaningful                                        | ember-persona.md:41-43               | Partly                                 | generate-contextual-questions.ts:72        | The heading survives but is repurposed into an output-format rule; the compound/A-or-B ban is not stated. |
| The ten named question patterns                                                                                     | ember-persona.md:49-174              | **No**                                 | generate-contextual-questions.ts:84-87     | Replaced by three example questions.                                                                      |
| Choose a pattern; vary patterns across the session                                                                  | ember-persona.md:254-260             | **No**                                 | —                                          | Only literal question repetition is guarded.                                                              |
| Never repeat a previous question                                                                                    | ember-persona.md:252; agents.md:25   | Yes                                    | generate-contextual-questions.ts:73, 75-82 | Full list is interpolated.                                                                                |
| Output only the question, no preamble/explanation                                                                   | ember-persona.md:276-277             | Yes                                    | generate-contextual-questions.ts:72        | Also adds "no quotation marks" from agents.md:26.                                                         |
| Never ask generic questions                                                                                         | ember-persona.md:286                 | Yes                                    | generate-contextual-questions.ts:71        |                                                                                                           |
| Never ask about hypothetical strangers                                                                              | ember-persona.md:287                 | **No**                                 | —                                          | Only partially implied by the "about your partner" rule.                                                  |
| Never ask yes/no questions                                                                                          | ember-persona.md:288                 | **No**                                 | —                                          | Absent.                                                                                                   |
| Never ask a question answerable in one word                                                                         | ember-persona.md:290                 | **No**                                 | —                                          | Absent.                                                                                                   |
| Tone: cheeky but never crude, playful but never patronizing                                                         | ember-persona.md:300                 | Partly                                 | generate-contextual-questions.ts:65        | "Never judgmental" only.                                                                                  |

### Scribe — session summary (`analyze-answers-and-generate-summary.ts`)

| Requirement                                                                 | Source          | Honoured in prompt?  | Where (file:line)                              | Note                                            |
| --------------------------------------------------------------------------- | --------------- | -------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Persona: wise, empathetic observer; friend who recaps the night             | agents.md:36    | Yes                  | analyze-answers-and-generate-summary.ts:57     | Near-verbatim.                                  |
| Find common ground — themes mentioned by **all** players                    | agents.md:46    | Yes                  | analyze-answers-and-generate-summary.ts:60     | Strengthened with `{{playerCount}}`.            |
| Ignore solo topics                                                          | agents.md:47    | Yes                  | analyze-answers-and-generate-summary.ts:61     | MUST NOT retained.                              |
| Offer one or two playful, concrete "next adventure" suggestions             | agents.md:48    | Yes                  | analyze-answers-and-generate-summary.ts:62, 81 | Also adds "an invitation, not a prescription".  |
| Speak directly to the group                                                 | agents.md:49    | Yes                  | analyze-answers-and-generate-summary.ts:63     | Example phrasing matches the spec's.            |
| Tone: encouraging, warm, insightful, playful                                | agents.md:39-42 | Yes                  | analyze-answers-and-generate-summary.ts:64     |                                                 |
| — (no spec source) five-step skeleton with canned opening/closing sentences | none            | Prompt-only addition | analyze-answers-and-generate-summary.ts:77-82  | Not required or forbidden by any spec. See D15. |

### Dr. Ember — therapist notes (`generate-therapist-notes.ts`)

| Requirement                                                                                              | Source       | Honoured in prompt? | Where (file:line)                  | Note                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ------------ | ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Persona: PhD in Intimacy Studies, clinician with a suppressed smirk                                      | agents.md:57 | Yes                 | generate-therapist-notes.ts:57     |                                                                                                        |
| Clinical but irreverent; real therapeutic language deployed with dry wit                                 | agents.md:60 | Yes                 | generate-therapist-notes.ts:57, 73 | Prompt supplies jargon exemplars.                                                                      |
| Warm, never cloying                                                                                      | agents.md:61 | Yes                 | generate-therapist-notes.ts:57     | Verbatim phrase.                                                                                       |
| Precise: observations tied to what was **actually said**, not generalities                               | agents.md:62 | **No**              | —                                  | Nothing instructs grounding in the transcript.                                                         |
| Exactly four sections in order: Session Overview, Key Observations, Clinical Impression, Recommendations | agents.md:65 | Yes                 | generate-therapist-notes.ts:79-90  | Correct sections, correct order.                                                                       |
| Session Overview: 1-2 sentences on emotional tenor                                                       | agents.md:66 | Yes                 | generate-therapist-notes.ts:81     |                                                                                                        |
| Key Observations: **exactly 3** bullets on patterns, defenses, breakthroughs, vulnerability              | agents.md:67 | Partly              | generate-therapist-notes.ts:83-86  | Three bullets are shown but "exactly 3" is never stated, and the bullet subjects were swapped. See D9. |
| Clinical Impression: one paragraph on underlying dynamics                                                | agents.md:68 | Yes                 | generate-therapist-notes.ts:88     | Spec's suggested opener ("What we're really seeing here is…") not carried over.                        |
| Recommendations framed as therapeutic homework                                                           | agents.md:69 | Partly              | generate-therapist-notes.ts:90     | Framed as "clinical recommendations"; the homework framing is gone.                                    |
| Third-person clinical voice, then shift to direct address for Recommendations                            | agents.md:70 | **No**              | —                                  | The voice-shift instruction is absent entirely. See D8.                                                |

### The Artistic Director — visual memory (`generate-visual-memory.ts`)

| Requirement                                                                 | Source       | Honoured in prompt?           | Where (file:line)                                   | Note                                                                                         |
| --------------------------------------------------------------------------- | ------------ | ----------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Persona: sees emotion as colour, connection as texture, desire as light     | agents.md:78 | **No**                        | generate-visual-memory.ts:52                        | Prompt opens with a generic "an artistic director specializing in…"; no persona identity.    |
| Always abstract — never depict literal people, body parts, or explicit acts | agents.md:86 | Partly                        | generate-visual-memory.ts:60-61                     | Bans "nudity, explicit acts, or graphic content"; **people and body parts are never named**. |
| 'explicit' safety level must NEVER be used                                  | agents.md:87 | Yes in prompt, weak in schema | generate-visual-memory.ts:78 (prompt); :31 (schema) | The enum still accepts `'explicit'`. See D13.                                                |
| Reference specific art forms, movements, materials                          | agents.md:88 | Yes                           | generate-visual-memory.ts:62, 66-70                 | Examples name watercolour, oil, impressionist, abstract expressionist.                       |
| Spicy level = emotional intensity, not explicitness; per-level palette      | agents.md:89 | Yes                           | generate-visual-memory.ts:64, 66-70                 | Per-level examples align closely with the spec's mapping.                                    |
| Length 50-100 words                                                         | agents.md:90 | Yes                           | generate-visual-memory.ts:73                        | Exact match.                                                                                 |
| Output only the image prompt text, no preambles                             | agents.md:91 | **No** (moot)                 | —                                                   | Not stated; structured output (`imagePrompt` field) makes it largely moot.                   |

---

## Divergences

Priority order — most consequential first.

### D1. Trios do not exist in the question flow, though both specs require them

- **Spec** (`docs/ember-persona.md:250`): `- Number of partners: {partner_count} (2 or 3)` —
  listed as a STEP 1 constraint, with a whole pattern (`PATTERN #9: THE CHOREOGRAPHY
PATTERN (Trios)`, lines 151-161) and four trio example blocks (lines 189-193, 205-209,
  221-226, 235-239) built on it. `agents.md:22`: _"All questions must strictly match the
  user-selected `spicy_level`, `category`, and number of players (`partner_count`)."_
- **Shipped** (`generate-contextual-questions.ts:18-29`): the input schema is
  `{ categories, spicyLevel, previousQuestions }`. There is no player-count field, so no
  caller can supply one.
- **Shipped prompt** (`:65`): _"Your job is to give couples permission to voice…"_ —
  where the spec's first line reads _"…to give couples (or trios) permission…"_.
- **Shipped prompt** (`:70`): _"Every question must be about THEIR partner, using
  \"your partner.\""_ — versus spec line 23: _"Use \"your partner\" / \"Partner A\" /
  \"Partner B\" constantly."_
- **Effect:** a three-player session gets questions phrased for two. The other three
  flows all accept `playerCount` (e.g. `analyze-answers-and-generate-summary.ts:23`), so
  the app knows the number — the question flow just never asks for it.

### D2. The category whitelist rejects nine of the ten shipped categories

- **Spec:** `ember-persona.md:251` (`Current category: {category}`) and the prompt's own
  Rule 2 both make the category a hard constraint.
- **Shipped prompt** (`:69`): _"**Category Adherence**: The question MUST relate to one
  of the following categories: …"_ — correct as written.
- **Shipped code** (`shared-utils.ts:74-83`) whitelists `Emotional Connection, Physical
Attraction, Communication, Trust & Vulnerability, Intimacy & Desire, Future Dreams,
Past & Present, Playfulness`.
- **Actual categories** (`src/lib/constants.ts:35-66`): `Hidden Attractions, Power Play,
Emotional Depths, Mind Games, Shared Pasts, Future Dreams, Core Values, Bright Ideas,
Trust & Alliance, The Unspeakable`.
- **Overlap: `Future Dreams` only.** Every other selection is filtered out at
  `generate-contextual-questions.ts:46`, and lines 54-56 then throw
  `'No valid categories provided'`.
- This is a code defect rather than prompt text, but it is the reason the spec's category
  rule cannot be honoured at runtime, so it belongs at the top of this list. Note also
  that `ember-persona.md:137` names a `POWER PLAY` pattern matching the real `Power Play`
  category — the spec is written against the real category set; the whitelist is not.

### D3. The spicy-level definitions — the spec's first unbreakable rule — are omitted

- **Spec** (`ember-persona.md:15-19`):
  _"1. SPICY LEVEL ADHERENCE (CURRENT: {spicy_level}): - Mild: Flirty glances, emotional
  intimacy, \"what if\" territory, romantic tension - Medium: Sensual scenarios, specific
  attractions, implied sexuality, building heat - Hot: Explicit desires, detailed
  fantasies, power dynamics, clear sexual content - Extra-Hot: Taboo-adjacent, extreme
  scenarios, boundary-pushing, unfiltered"_
- **Shipped prompt** (`:68`): _"**Spicy Level Adherence**: You MUST generate a question
  that matches the given spicy level: {{spicyLevel}}."_ — and nothing else.
- The four definitions, and the STEP 4 verification checklist (`ember-persona.md:268-274`),
  are absent. Compounding it, the prompt's exemplars (`:85-87`) cover Mild, Medium and Hot
  only — **there is no Extra-Hot example anywhere in the shipped prompt**, which is the
  level with the least self-evident meaning and the highest risk in both directions.

### D4. All ten question patterns are gone, replaced by three example questions

- **Spec** (`ember-persona.md:46-174`) devotes 129 lines to ten named patterns and
  instructs at `:254-256`: _"STEP 2: CHOOSE A PATTERN — Select from the 10 patterns
  above"_, and at `:259`: _"Variety (don't repeat patterns from {previous_questions})"_.
- **Shipped prompt** (`:84-87`): _"Example Questions for Inspiration:"_ followed by three
  questions, two of which are lifted verbatim from the spec's own library
  (`ember-persona.md:182` and `:213`).
- Patterns with no representation at all in the shipped prompt: Complete This (#5),
  Implied History (#6), Future-Pulling (#7), Power Play (#8), Choreography (#9),
  Vulnerability Invitation (#10). The prompt has no notion of pattern variety, only of
  literal question repetition.

### D5. "Build incrementally" is not instructed, and could not be followed if it were

- **Spec** (`ember-persona.md:31-34`): _"4. BUILD INCREMENTALLY: Even at Extra-Hot, you
  earn your way to intensity. Start each category with observation-based questions before
  moving to fantasy. Create a natural arc from \"noticing\" → \"wanting\" → \"confessing\"
  → \"planning\""_, reinforced at `:258` (_"Where you are in the session"_) and `:174`
  (_"Use sparingly and only after building trust through earlier questions"_).
- **Shipped prompt:** no arc, no ordering, no session-position instruction.
- The flow also receives no round index — only `previousQuestions`
  (`generate-contextual-questions.ts:23-28`) — so even a well-written arc instruction
  would have nothing to anchor to beyond inferring position from list length.

### D6. The crudeness and condescension guardrails are dropped from the tone line

- **Spec** (`ember-persona.md:36-39`): _"5. PLAYFUL, NOT PORNY: Wit before explicit.
  Suggestion before description. Implication over declaration. Think \"raised eyebrow\"
  not \"graphic novel.\" You can be filthy, but you're never crude."_ and `:300`:
  _"YOUR TONE: Cheeky but never crude. Playful but never patronizing."_
- **Shipped prompt** (`:65`): _"You are playful, insightful, and never judgmental."_
- "Never crude", "never patronizing", and the whole wit-before-explicit ordering are
  absent. This is the guardrail that keeps Hot and Extra-Hot on the right side of the
  brand voice, and it is the one thing the prompt most obviously needed to keep.

### D7. Four of the five entries in the spec's "NEVER ASK" list are unenforced

- **Spec** (`ember-persona.md:284-290`): _"❌ NEVER ASK: - Generic questions (\"Do you
  like X?\") - Questions about hypothetical strangers - Yes/no questions unless the choice
  is meaningful - Multiple questions in one - Questions that could be answered with one
  word"_
- **Shipped prompt:** only "generic" is covered (`:71`, _"No generic questions. Force
  precision."_). Hypothetical strangers, yes/no, compound questions and one-word-answerable
  questions are never mentioned. `:72`'s "One Question at a Time" reads as an output-format
  rule (_"Your entire output must be a single question and nothing else"_), not as the
  spec's ban on compound questions (`ember-persona.md:43`, _"No compound questions. No
  \"A or B\" unless the choice itself is meaningful."_).

### D8. Dr. Ember is never told to switch from clinical third person to direct address

- **Spec** (`agents.md:70`): _"**Speak About Them:** Write in third person clinical style
  (\"The subjects demonstrate...\") then shift to direct address for recommendations
  (\"Your assignment this week...\")"_
- **Shipped prompt** (`generate-therapist-notes.ts:72-77`) lists five style bullets; none
  concerns person or voice. The only signal is the jargon example at `:73`
  (_"Patient exhibits heightened receptivity to..."_) — singular "Patient", for a session
  with two or three players.
- Related: `agents.md:69` wants Recommendations _"framed as therapeutic homework"_; the
  prompt (`:90`) says _"Frame as clinical recommendations but keep them warm and
  actionable"_ — the homework conceit that makes the section land is gone.

### D9. Dr. Ember's Key Observations bullets were re-specified

- **Spec** (`agents.md:67`): _"**Key Observations:** Exactly 3 bullet points identifying
  specific patterns, defenses, breakthroughs, or moments of vulnerability"_
- **Shipped prompt** (`generate-therapist-notes.ts:83-86`):
  _"**Key Observations:** - [Bullet point about emotional dynamics] - [Bullet point about
  communication patterns] - [Bullet point about areas of resonance or tension]"_
- The count is implied by showing three placeholders but never stated as "exactly 3", and
  all four of the spec's subjects (patterns, defenses, breakthroughs, vulnerability) were
  replaced with three different ones. The spec's four subjects do survive elsewhere in the
  prompt, at `:76` and `:88`, so the bullets now duplicate the Clinical Impression's brief.

### D10. Dr. Ember's prompt sets a length its own required format cannot satisfy

- **Shipped prompt** (`generate-therapist-notes.ts:77`): _"- 3-4 well-structured
  paragraphs"_
- **Shipped prompt** (`:79-90`): a `Required Format` of four labelled sections, one of
  which (`Key Observations`) is a bullet list, not a paragraph.
- A bullet list is not a paragraph, so "3-4 paragraphs" and the four-section template
  pull in different directions within the same prompt. Neither spec asks for a paragraph
  count.

### D11. Dr. Ember's prompt forbids and then requires prescriptiveness

- **Shipped prompt** (`generate-therapist-notes.ts:74`): _"- Be observational and
  insightful, not prescriptive"_
- **Shipped prompt** (`:90`): _"**Recommendations:** [Playful, concrete suggestions for
  continued exploration. Frame as clinical recommendations but keep them warm and
  actionable.]"_
- `agents.md:69` clearly wants recommendations, so `:74` is the line that is wrong.
  Separately, `agents.md:62` (_"**Precise:** Makes specific observations tied to what was
  actually said, not generalities"_) has no counterpart anywhere in the prompt — nothing
  instructs the model to quote or ground itself in the transcript it was given.

### D12. The Artistic Director loses its persona and its most specific prohibition

- **Spec** (`agents.md:78`): _"The Artistic Director sees emotion as color, connection as
  texture, desire as light. They speak fluently in the language of contemporary art…
  They never depict people or explicit acts; they render \*feeling\*."_ and `:86`:
  _"**Always Abstract:** Never depict literal people, body parts, or explicit acts"_
- **Shipped prompt** (`generate-visual-memory.ts:52`): _"You are an artistic director
  specializing in creating abstract, metaphorical visual representations of intimate
  conversations."_ — a job description, not the persona.
- **Shipped prompt** (`:61`): _"**Avoid Explicit Content**: Never suggest nudity, explicit
  acts, or graphic content"_ — "explicit acts" survives; **"literal people" and "body
  parts" do not appear anywhere in the file**. An image prompt depicting two clothed
  figures would pass every rule in the shipped prompt and fail `agents.md:86`.

### D13. `'explicit'` remains a selectable safety level despite "must NEVER be used"

- **Spec** (`agents.md:87`): _"**Safety First:** Only generate 'safe' or 'moderate' image
  prompts. The 'explicit' safety level must NEVER be used regardless of spicy level"_
- **Shipped prompt** (`generate-visual-memory.ts:78`): _"- **explicit**: Should NEVER be
  used - we always use metaphor"_ — the rule is stated.
- **Shipped schema** (`:31`): `.enum(['safe', 'moderate', 'explicit'])`. The value the
  spec says must never be produced is still a valid output the schema will accept, so the
  ban rests entirely on the model obeying prose. Listing `explicit` in the prompt at all
  (`:78`) also puts the word in front of the model.

### D14. The Artistic Director's output-format directive is not stated

- **Spec** (`agents.md:91`): _"**Output Format:** Return only the image prompt text. No
  preambles, no explanations."_
- **Shipped prompt:** no equivalent line. Low severity: the flow uses a structured output
  schema (`:24-33`), so a preamble would have to land inside the `imagePrompt` string.
  Worth noting because the parallel rule _is_ stated in the Ember prompt
  (`generate-contextual-questions.ts:72`).

### D15. The Scribe prompt adds a canned five-step skeleton no spec asks for

- **Shipped prompt** (`analyze-answers-and-generate-summary.ts:77-82`) supplies fill-in
  sentences: _"1. **Start with a Playful Observation**: \"After an evening of whispers and
  flames, a few sparks really lit up the room...\""_ … _"5. **End with Encouragement**:
  \"Keep exploring that spark. It's clear there's more to discover together.\""_
- `agents.md:44-49` specifies four directives and no structure. This is an addition rather
  than a violation, and the Scribe's four directives are all honoured — but a fixed opener
  and closer risk every session ending with the same two sentences, which cuts against
  `agents.md:41` (_"**Insightful:** Identifies underlying themes"_) and the product's
  "How did it know?" promise. Flagged for a human to decide; not a spec breach.

**Total: 15 divergences** (11 omissions or contradictions against a stated rule, 2
code-level issues that defeat a stated rule, 1 self-contradiction inside a shipped prompt,
1 unrequested addition).

---

## Contradictions between the specs themselves

### C1. Is Ember allowed to be graphically explicit? The two specs answer differently

- `agents.md:17`: _"**Intimate but not Crude:** Suggests and implies rather than being
  graphically explicit. The goal is seduction, not shock value."_ — stated unconditionally,
  with no level dependence.
- `docs/ember-persona.md:18-19`: _"Hot: Explicit desires, detailed fantasies, power
  dynamics, **clear sexual content** — Extra-Hot: Taboo-adjacent, extreme scenarios,
  boundary-pushing, **unfiltered**"_, and `:39`: _"**You can be filthy**, but you're never
  crude."_, and `:274`: _"Extra-Hot: Does this push boundaries…"_
- One of these is wrong. `ember-persona.md` reads as the considered position (explicitness
  scales with the level the users chose; _crudeness_ is what is always banned), while
  `agents.md:17` collapses "explicit" and "crude" into one prohibition. The shipped prompt
  currently follows neither — it states no rule on this axis at all (see D6).

### C2. `agents.md` points at the wrong master prompt, and the two copies differ

- `agents.md:28`: _"**Master Prompt Reference:** The full, detailed instruction set and
  prompt patterns for Ember are located in `aiprompting.md`."_
- The file this audit was pointed at is `docs/ember-persona.md`. Both exist. They are
  near-identical (306 vs 304 lines) but differ in three places, one of them substantive:
  - `aiprompting.md:261` carries _"- Variety (don't repeat patterns from
    {previous_questions}, **and ensure the question fits the current {category}**)"_;
    `docs/ember-persona.md:259` has only the first half. The category-fit reminder exists
    in one copy and not the other.
  - `aiprompting.md:77` contains a typo (_"what's the first thing you'd want them to **to**
    feel?"_) fixed in `docs/ember-persona.md:76`.
  - Line 1 differs only in line wrapping.
- Two live copies of a 300-line master prompt, with the pointer aimed at the stale one, is
  the condition that produced most of this audit's other findings. Whichever survives, the
  other should stop existing.

### C3. "No quotation marks" versus patterns built out of quoted sentences

- `agents.md:26`: _"**Output Format:** Return ONLY the question text. No preambles, **no
  quotation marks**, no explanations."_
- `docs/ember-persona.md:277` states the same rule **without** the quotation-mark clause:
  _"Return ONLY the question text. No preamble, no explanation, just the question."_
- The clause matters because two of the spec's patterns produce output that is inherently
  a quoted fragment: `ember-persona.md:103` (_"Complete this: 'I want to [blank] you until
  you [blank].'"_), `:105`, `:159`, `:225`, `:239`. Under `agents.md:26` those exemplars
  are unshippable as written; under `ember-persona.md:277` they are fine.
- The shipped prompt (`generate-contextual-questions.ts:72`) took `agents.md`'s stricter
  version — _"No preambles, no quotation marks."_ — and, separately, dropped the
  Complete-This pattern (D4), so the collision does not currently surface in output.

### C4. `agents.md` summarises ten patterns as three, and the prompt inherited the summary

- `agents.md:24`: _"**Demand Specificity:** Use patterns like \"What's one specific...\",
  \"Exactly where...\", or sensory constraints (e.g., \"What sound...\")"_ — three devices.
- `docs/ember-persona.md:49-174` defines ten named patterns; the three `agents.md` names
  are patterns #1, #2 and #3, i.e. the first three in the file.
- The shipped prompt (`generate-contextual-questions.ts:71`) reproduces exactly
  `agents.md`'s three and no others. This is strong evidence the prompt was written from
  `agents.md` rather than from the master spec, which explains most of D3-D7.

### C5. Scope gap: three of the four shipped personas have only one spec

`docs/ember-persona.md` covers Ember alone. The Scribe, Dr. Ember and the Artistic
Director exist only in `agents.md` (§2-§4, 91 lines total for four personas). This is not
a contradiction, but it means the D8-D14 findings are measured against a spec with roughly
one-twentieth the detail of Ember's — and that Dr. Ember's four-section format
(`agents.md:65-70`) and the Artistic Director's safety rule (`agents.md:87`) currently have
no second source to check them against.

### C6. Internal to `docs/ember-persona.md`: rule 6 versus the spec's own examples

Noted because the shipped prompt inherits it. `ember-persona.md:41-43` bans compound
questions; several entries in the spec's own reference library are two-part:
`:117` (_"Think of the hottest moment you've had together. What made it hot: what they
did, what they said, or what you felt?"_), `:197` (_"What's one specific thing you want to
do to your partner's neck? Be detailed."_), `:209`. The prompt copies `:197` verbatim as
its Medium exemplar at `generate-contextual-questions.ts:86`, so the shipped prompt's own
example does not satisfy the shipped prompt's own rule 6. Rule 6's intent is presumably
"one _subject_ per question; an appended 'Be detailed' is fine" — but that is not what it
says, and the ambiguity is now shipped.

---

## What is working

Not everything is broken, and it is worth recording what should not be touched:

- The **Scribe** prompt honours all four of `agents.md`'s directives, and strengthens two
  of them (`{{playerCount}}` interpolation at `:60`; "invitation, not a prescription" at
  `:62`).
- The **Artistic Director** prompt matches its spec on length (50-100 words, exact),
  per-spicy-level treatment, art-vocabulary requirement, and the `explicit`-is-never-used
  rule at prompt level.
- **Dr. Ember**'s four required sections appear in exactly the required order.
- Ember's **specificity**, **no-repetition** and **output-format** rules are carried
  through faithfully, and the persona's opening line is near-verbatim from the spec.
- All four flows sanitise their inputs before interpolation
  (`shared-utils.ts:10-38`, applied at each flow's entry point), so the prompt-injection
  posture described in `CLAUDE.md` holds — the `{{...}}` stripping at `shared-utils.ts:23`
  is genuinely protecting the Handlebars templates these prompts rely on.

---

_This document is an audit only. No prompt, spec, schema, or flow file was modified in
producing it._
