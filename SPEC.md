# Spec: Hair & Scalp Intake — "The Intake That Fills Itself"

**Status:** `ready-for-agent`
**Due:** Sep 2, 2026, 11:59 PM IST
**Budget:** 6–10 hours

---

## Problem Statement

Patients at a hair and scalp clinic fill a 16-question intake form before their consultation. Today it is paper, typed into software later. Patients abandon it, answer carelessly, or need a nurse to walk them through it. The doctor enters the consultation without a complete picture.

The clinic wants the opposite of forms-and-dashboards: the software does the work, the human gets the outcome. The outcome is a doctor who has a complete, accurate intake before the patient walks in, and a patient who barely noticed they filled anything.

---

## Solution

A WhatsApp-style conversational web app that guides patients through the 16-question intake using a chat UI familiar to every Indian phone user. The app opens with an optional Hinglish voice note that auto-fills multiple fields at once — "the intake that fills itself." Remaining questions are asked one at a time as chat bubbles with tap-friendly chips. The entire voice and language layer runs on Sarvam AI, India's homegrown AI stack, because Indian patients speak Hinglish with regional accents that Western speech models handle poorly.

The output is the 16-question intake form fully filled as structured JSON matching the official schema, plus a doctor's pre-consult triage card that transforms raw data into a 10-second clinical briefing with suspected diagnosis, red flags, and consultation talking points.

---

## User Stories

### Core Flow

1. As a patient, I want to open the app on my phone and immediately understand what to do, so that I don't need instructions or help from a nurse.
2. As a patient, I want to see a warm welcome message explaining that this will help my doctor prepare, so that I understand why I'm doing this.
3. As a patient, I want the option to record a voice note in Hinglish describing my hair problem, so that I can explain in my own words instead of filling a form.
4. As a patient, I want the option to skip the voice note and go step-by-step, so that I have a choice if I don't want to speak.
5. As a patient, I want to see which fields were auto-filled from my voice note, so that I can verify the app understood me correctly.
6. As a patient, I want to confirm all auto-filled fields in one tap, or tap any individual field to correct it, so that the data is accurate.
7. As a patient, I want to answer remaining questions as chat messages with tappable chips, so that it feels like a conversation, not a form.
8. As a patient, I want yes/no questions presented as simple toggle chips, so that I can answer in one tap.
9. As a patient, I want multi-select questions presented as tappable pill chips with a "None of these" option, so that I can select what applies and move on.
10. As a patient, I want number inputs (like age) presented with a simple input field and optional voice, so that I can type or speak.
11. As a patient, I want to see empathetic transitions between sections, so that the flow feels like a caring conversation, not an interrogation.
12. As a patient, I want "why we ask" micro-copy on sensitive questions, so that I understand the medical relevance and don't feel judged.

### Gender & Hormonal Questions

13. As a patient, I want the app to infer my gender from linguistic cues in my voice note (Hindi grammar, content mentions), so that I'm not bluntly asked "What is your sex?"
14. As a patient, I want the app to casually confirm its gender inference before tailoring questions, so that I can correct it if wrong.
15. As a patient, I want hormonal and reproductive questions presented under a unified card ("Hormonal shifts affect hair. Do any of these apply?") with a "Not applicable" option, so that the question feels natural regardless of my gender.
16. As a male patient who taps "Not applicable," I want Questions 6 and 7 silently marked as not_applicable in the schema without cluttering the chat.

### Products & Treatments (Q12, Q13, Q14)

17. As a patient, I want to select which hair products I've tried from tappable chips, so that I only answer follow-ups for products I've actually used.
18. As a patient, I want to say brand names like "Tugain" or "Follihair" and have the app map them to the correct product category, so that I don't need to know medical terminology.
19. As a patient who selected products, I want conversational follow-up questions per product (duration → helped → side effects) appearing one at a time in the chat, so that I never see a grid or table.
20. As a patient who hasn't tried any products, I want to tap "None" and skip the entire product section in one tap.
21. As a patient, I want a simple Yes/No gate for clinical procedures, so that I skip procedure details if I've never had any.
22. As a patient who has had procedures, I want conversational follow-ups (which → sessions → helped) one at a time.

### Habits (Q11)

23. As a patient, I want lifestyle habits split into two conversational groups (health habits, then hair care routine) with a natural transition between them, so that 6 sub-questions don't feel like a barrage.

### Output & Verification

24. As a patient, I want to see a review screen at the end showing all my answers as a structured summary, so that I can verify everything before submitting.
25. As a patient, I want to tap any field in the review screen to edit it, so that I can fix mistakes.
26. As a doctor, I want a pre-consult triage card generated from the completed intake, including suspected phenotype, red flags, contraindication warnings, and consultation talking points, so that I can prepare in 10 seconds instead of reading raw form data.

### Desktop & Evaluator Experience

27. As a desktop user, I want a split-screen layout with the chat on the left and the live clinical intake form on the right, filling in real-time, so that the desktop experience is purposeful.
28. As an evaluator, I want 3 pre-built test persona buttons that instantly fill the form with simulated Hinglish voice data, so that I can test extraction accuracy in seconds without manually filling 16 questions.

---

## Implementation Decisions

### Architecture

- **Bun 1.4+ + Next.js 14 (App Router) + TypeScript + Tailwind CSS.** Project uses Bun as runtime, package manager (`bun add`), and test runner (`bun test`). Server-side API routes use standard Web `Request`/`Response`, `fetch`, and `FormData` to call Sarvam endpoints without exposing keys. Deployed to Vercel with native Bun detection.
- **Mobile-first responsive design.** The dark editorial conversational chat UI is the primary view. Desktop adds a split-screen right pane with the live clinical form.
- **Client-side state + localStorage.** No backend database. React state drives the UI; localStorage persists across page refreshes. State shape mirrors the intake-schema.json structure.

### AI Stack — 100% Sarvam AI

- **Speech-to-Text:** `saaras:v3` called via Web standard `fetch` with `FormData` in dual-mode invocation:
  - `mode: "codemix"` — displayed to the patient as their transcript (preserves Hinglish)
  - `mode: "translate"` — fed to the LLM for structured extraction (clean English)
- **LLM:** `sarvam-105b` called via Web standard `fetch` against the OpenAI-compatible `/v1/chat/completions` endpoint. Used for:
  - Structured JSON extraction from voice transcripts
  - Gender inference from Hindi linguistic/content cues
  - Brand name → product category resolution
  - Doctor's pre-consult triage card generation
- **Text-to-Speech:** `bulbul:v3` — opt-in per question via a 🔊 icon. Phase 3 feature.
- **Abstraction layer:** All LLM calls go through a single module with a provider interface, so swapping to OpenAI GPT-4o-mini requires changing one config value, not refactoring.
- **Testing:** Pure logic modules (Chat Flow Engine, Brand Resolver, Schema Output) tested with native `bun test`. Zero configuration required.

### Design Language — Dark Editorial Aesthetic

Inspired by [solacc.xyz](https://solacc.xyz/). Dark, minimal, typography-driven.

- **Palette:** Dark background (`#111814`), warm cream text (`#f3f0df`), single muted accent color (sage green or amber) for interactive elements. No bright colors or gradients.
- **Typography:** Three-font system — distinctive serif for headings (e.g., `Instrument Serif`), system sans-serif for chat/body text, monospace for numbers and data values.
- **Texture:** Subtle paper-grain overlay via CSS noise pattern on the background layer.
- **Chips:** Rounded pills (`border-radius: 999px`) with thin borders on dark surface, accent fill on selection. Approachable for elderly patients.
- **Structural elements:** Sharp-edged rectangles with thin borders for headers, progress bars, section titles, review screen.
- **Voice bubbles:** Dark surface cards (not WhatsApp green) with accent-colored waveform/playback.
- **Philosophy:** The WhatsApp metaphor is the *interaction pattern* (conversational flow, one question at a time, quick replies, voice notes), not the visual skin. The dark editorial aesthetic signals craft to the evaluator while the flow remains familiar to the patient.

### Chat Flow Engine

- A state machine that tracks: current question index, answered questions set, form state object, voice cascade results, inferred gender.
- Questions are defined as a declarative data structure (array of question configs) with: id, section, type (single/multi/yesno/number/table/text), options, conditions (e.g., femaleOnly), group membership.
- The engine computes the next unanswered question by walking the question list, skipping questions whose conditions aren't met or that were already filled by the voice cascade.
- Each answer updates the form state and triggers a re-evaluation of the remaining question sequence.

### Voice Cascade

- Available at the start of the flow and optionally at Q12 (products).
- Records audio via the browser MediaRecorder API.
- Sends audio to Sarvam STT API route, receives transcript in both modes.
- Sends the `translate` transcript to `sarvam-105b` with a prompt that extracts all matching intake fields and returns them as JSON with per-field confidence scores (0.0–1.0).
- Fields with confidence ≥ 0.7 are auto-filled. Fields with confidence < 0.7 are skipped (asked later in the normal flow).
- UI shows a cascade card listing auto-filled fields as tappable chips. "Confirm All" button or individual chip tap to edit.

### Gender Inference

- After the opening voice note, the LLM is prompted to detect gender from:
  - Hindi grammatical gender markers (e.g., "pareshan ho gayi" vs "ho gaya")
  - Content cues (mentions of pregnancy, PCOS, beard, etc.)
- If confident: the chat casually confirms ("I noticed you mentioned [cue] — I'll tailor a few health questions. Sound right?") with a ✓ or ✗ response.
- If not confident or no voice note: falls back to the unified hormonal card with all options including "Not applicable."
- Result stored in state as `inferred_sex: "female" | "male" | null`. Drives conditional display of Q6 and Q7.

### Brand Resolver

- A mapping dictionary of common Indian hair care brand names to the 5 product categories in Q12 and 4 procedure categories in Q13.
- Examples: Tugain/Mintop/Morr-F → topical_minoxidil, Follihair/Keraglo → supplements, Scalpe-Pro/Selsun → medicated_shampoos.
- The LLM extraction prompt includes this mapping as context so that brand names in voice transcripts are resolved to schema categories.
- Also used in the chat: when a patient types or says a brand name, the chip auto-highlights the correct category.

### Doctor's Pre-Consult Triage Card

- Generated after form completion by sending the full 16-question JSON to `sarvam-105b` with a clinical prompt.
- Returns: suspected phenotype/differential, red flag warnings, contraindication alerts, recommended consultation talking points.
- Displayed at the top of the review/output screen.
- Clearly labeled as AI-generated preliminary assessment, not a diagnosis.

### Conversational Design

- Questions use plain language with motivational interviewing (OARS) principles:
  - Open/evocative framing instead of clinical labels
  - Micro-affirmations after answers ("That's helpful to know")
  - Reflective transitions between sections ("Got it on the health side. Now about your daily routine.")
  - Safe outs everywhere ("None of these" / "Not applicable" / "Not sure")
- "Why we ask" micro-copy on sensitive questions (hormones, habits, triggers)
- De-stigmatizing pre-frames ("Hormonal shifts are one of the most common catalysts for hair changes")

### Chat UI Polish — Dark Editorial Style

- Chat header: "Dr. Sharma • 🟢 Preparing your consultation" on dark surface
- ✓✓ Accent-colored tick animation when a section is confirmed
- Progress milestones in monospace: "Phase 2 of 4: Understanding your triggers"
- Voice note: dark surface card with accent-colored waveform (not WhatsApp green)
- "Typing…" indicator (cream animated dots on dark surface) during AI processing
- Grain texture overlay on background for tactile warmth
- Sharp-edged structural elements, rounded pills for answer chips

### Evaluator Personas

- 3 pre-built test datasets rendered as buttons at the top of the desktop view:
  - 👤 Rajesh, 45M — Crown thinning + smoker + past Minoxidil (6mo, no help) + family history (father)
  - 👤 Priya, 27F — Post-dengue shedding + PCOS + hard water + irregular periods
  - 👤 Ananya, 34F — Postpartum 6mo + thyroid + biotin supplements + salon keratin
- Each persona has a predefined transcript (simulating a voice note) and expected schema output.
- Clicking a persona auto-fills the form via the cascade flow, demonstrating extraction accuracy.

---

## Testing Decisions

### What makes a good test here

Tests verify **external behaviour** — given inputs, does the system produce correct outputs? No testing of internal state shapes, React component internals, or CSS. The brief rewards a working product, not test coverage metrics.

### Seams under test

1. **Chat Flow Engine** — the highest seam. Given a sequence of user actions (answers, voice cascade results, skips), assert:
   - The correct next question is computed
   - The form state object contains the expected values
   - Skip logic fires correctly (gender-conditional questions, "None" gates, voice-filled fields)
   - The final form state passes schema validation against intake-schema.json

2. **AI Extraction Layer** — given a transcript string, assert:
   - The returned JSON contains the correct field values
   - Confidence scores are present
   - Fields below confidence threshold are excluded
   - The module is provider-agnostic (can be tested with mock responses)

3. **Brand Resolver** — pure function. Given a brand name string, assert correct product category mapping. Given an unknown brand, assert graceful fallback.

4. **Form State → Schema Output** — given a completed form state, assert the output JSON validates against intake-schema.json. Test with all 3 evaluator personas' expected outputs.

### Manual testing

- Mobile testing on an actual phone (Chrome Android)
- Desktop testing on laptop (Chrome, Firefox)
- The 3 evaluator personas serve as end-to-end integration tests
- Edge cases: empty voice note, "None" for all products/procedures, all questions answered via voice cascade, no voice note (step-by-step only)

---

## Out of Scope

- **Login / authentication** — the brief explicitly says "no login"
- **Admin panel / doctor dashboard** — brief says "build only what the patient touches"
- **Real patient data** — use made-up patients only
- **Multi-language beyond Hinglish** — mentioned in "one more week" list (Tamil, Bengali, Marathi)
- **Photo upload for prescriptions/lab reports** — mentioned in "one more week" list
- **WhatsApp Business API integration** — future enhancement
- **Offline/service worker support** — future enhancement
- **Analytics/completion tracking** — future enhancement
- **PDF export** — future enhancement
- **Backend database / persistent storage** — localStorage only
- **Automated E2E tests** (Playwright, Cypress) — manual testing with personas is sufficient for the deadline

---

## Further Notes

### README must cover (per the brief's requirements)
- How to run locally
- Choices: Sarvam AI (and why not Whisper/OpenAI), Next.js, bought vs built
- How the form fill was tested (persona matrix with input → expected → actual)
- "One more week" improvements list

### 2-minute screen recording script
1. Open on phone → record Hinglish voice note → watch cascade auto-fill 5 fields (the "wow")
2. Tap through remaining questions → show WhatsApp flow, brand resolver
3. Show doctor's triage card → "not a form dump, clinical intelligence"
4. Three proudest decisions: (a) voice cascade, (b) Sarvam-only stack, (c) doctor's triage card

### Risk: Sarvam `sarvam-105b` extraction quality
If structured JSON extraction is unreliable during Phase 2 testing, the LLM abstraction layer allows swapping to GPT-4o-mini within minutes. The README narrative adjusts to "Sarvam for voice, OpenAI for reasoning" — still a strong story, just not as clean as 100% Sarvam.

### The schema source of truth
[haikustudio.ai/hiring/intake-schema.json](https://haikustudio.ai/hiring/intake-schema.json) — field names are not graded, coverage and correctness are. Every field in this schema must be present in the final output.
