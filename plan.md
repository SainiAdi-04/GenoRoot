# Haiku Studio Take-Home: Hair & Scalp Intake App

## Complete Design & Build Plan

> **Due:** Sep 2, 2026, 11:59 PM IST
> **Budget:** 6-10 hours
> **Deliverables:** Live link + Repo with README + 2-min screen recording

---

## The Product in One Sentence

A WhatsApp-style conversational intake that lets a patient record one Hinglish voice note and watch half the form fill itself — powered entirely by India's homegrown Sarvam AI stack.

---

## Architecture Decisions

### Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Runtime & Tooling** | Bun 1.4+ (`bun dev`, `bun test`, `bun run build`) | Native TS/JSX execution, sub-second test runner, fast package management |
| **Framework** | Next.js 14 (App Router) + TypeScript | Server-side API routes hide keys, Vercel deploys in one click with native Bun support |
| **Styling** | Tailwind CSS | Mobile-first, rapid iteration, dark editorial styling |
| **Testing** | Native `bun test` | Built-in test runner with zero extra dependencies; instant verification |
| **State** | React state + localStorage | No backend DB needed. Survives page refresh |
| **AI — Voice (STT)** | Sarvam `saaras:v3` (codemix + translate modes) via Web `fetch` | Direct REST over native Web `fetch` & `FormData`. Trained on Indian accents & Hinglish |
| **AI — LLM** | Sarvam `sarvam-105b` (OpenAI-compatible API) via Web `fetch` | Structured JSON extraction, gender inference, brand resolution, doctor's triage card |
| **AI — TTS** | Sarvam `bulbul:v3` (opt-in) | Natural Hindi/English voice reads questions aloud for accessibility |
| **Deploy** | Vercel | Free tier, instant deploys with native Bun package manager detection |

> **README narrative:** *"Built entirely on India's homegrown AI stack — because Indian patients speak Hinglish, not textbook English. Western STT models degrade on regional accents; Sarvam was built for this."*

> **Safety net:** LLM integration behind an abstraction layer. If `sarvam-105b` chokes on structured extraction during testing, swap to GPT-4o-mini in 5 minutes.

### Data Model
- Source of truth: [intake-schema.json](https://haikustudio.ai/hiring/intake-schema.json)
- 16 questions across 5 sections (A-E)
- Client-side state object mirrors the JSON schema
- localStorage persistence with key `haiku-intake-state`

---

## Design Language

Inspired by [solacc.xyz](https://solacc.xyz/) — dark, editorial, minimal. Not a copy, but the same ethos: typography does the work, color is restrained, every element earns its space.

### Color Palette
- **Background:** `#111814` (near-black with a slight warm-green undertone)
- **Primary text:** `#f3f0df` (warm cream — not pure white, softer and more editorial)
- **Secondary text:** `rgba(243, 240, 223, 0.6)` (muted cream for micro-copy, labels)
- **Accent color:** Muted sage green or warm amber — single accent for interactive elements (chips, mic button, active states, progress indicators)
- **Surface:** `rgba(243, 240, 223, 0.05)` (subtle card backgrounds within the dark base)
- **Borders:** `rgba(243, 240, 223, 0.15)` (barely visible structural dividers)
- **Success/Confirmed:** Muted green checkmarks, blue-tinted ticks

### Typography (3 fonts max)
- **Display/Headings:** Distinctive serif (e.g., `Instrument Serif`, `Playfair Display`) — for the welcome headline, section titles, doctor's triage card header. Editorial craft.
- **Body/Chat:** System sans-serif (`Inter`, `-apple-system`, `sans-serif`) — for chat messages, question text, micro-copy. Maximum readability.
- **Numbers/Data:** Monospace (`JetBrains Mono`, `SF Mono`, `monospace`) — for age, duration values, counters, progress indicators. Clinical precision. (Like SolAcc's `01`, `02` counters.)

### Texture
- **Grain overlay:** Subtle paper-grain texture via CSS `background-image` with a noise pattern. Adds tactile warmth, signals craft. Applied to the background layer, not individual elements.

### Component Styles
- **Structural elements** (header, progress bar, section titles, review screen): Sharp-edged rectangles with thin borders. No border-radius. SolAcc-style editorial precision.
- **Answer chips** (single-select, multi-select, yes/no): Rounded pills (`border-radius: 999px`). Approachable, clearly tappable, 55-year-old-friendly. Thin border on dark surface, accent fill on selection.
- **Buttons** (CTA, confirm, voice record): Sharp rectangles with accent color fill or outline. Minimal arrow indicators (`→`, `↗`).
- **Voice bubble:** Dark surface card (not WhatsApp green) with accent-colored waveform/playback indicator. Sharp edges.
- **Blue ticks:** Accent-colored ✓✓ instead of WhatsApp blue — stays within the palette.

### Design Philosophy
The WhatsApp metaphor is about the **interaction pattern** (one question at a time, chat flow, voice notes, quick replies), not the green paint. The dark editorial skin signals craft and taste to the evaluator while the conversational flow remains instantly familiar to the patient.

---

## UX Design

### Visual Metaphor: Dark Conversational Chat
- **Mobile-first** — designed for a 55-year-old on a phone
- Conversational flow borrowed from WhatsApp — one question at a time, chat bubbles, quick-reply chips
- Dark background with cream text and accent-colored interactive elements
- Voice note button with accent-colored mic icon
- "Typing…" indicator (cream dots on dark surface) when AI processes voice input
- ✓✓ Accent-colored ticks when a section is confirmed
- Chat header: `Dr. Sharma • 🟢 Preparing your consultation` (on dark surface)
- Progress milestones: *"Phase 2 of 4: Understanding your triggers"*
- Grain texture overlay for tactile warmth

### Desktop: Split-Screen Layout
- **Left pane (45%):** Dark conversational chat interface
- **Right pane (55%):** Live clinical intake form on dark surface, cells glow accent → confirmed green as answers arrive
- **Top bar:** 3 evaluator quick-test persona buttons (numbered `01` `02` `03` in monospace, SolAcc-style)

---

## The Flow

### Opening (First 10 Seconds)
```
[Chat bubble] "Hi! 👋 I'm here to help your doctor prepare for 
your consultation. You can tell me about your hair in your own 
words — in Hindi, English, or Hinglish — or we'll go through 
it step by step."

[Two buttons]
  🎙️ Record voice note
  ➡️ Let's go step by step
```

### Path A: Voice Cascade (The Headline Feature)
1. Patient records a 20-30 second voice note
2. WhatsApp-style green voice bubble appears with playback scrubber
3. Sarvam STT transcribes in two modes:
   - `codemix` → displayed as transcript under the voice bubble
   - `translate` → fed to `sarvam-105b` for structured extraction
4. "Typing…" indicator while AI processes
5. Cascade card animates in:
   ```
   🎉 Auto-filled from your voice note:
   [Duration: 8 months ✓] [Pattern: Crown thinning ✓]
   [Family: Father ✓] [Trigger: Dengue ✓]
   
   [Confirm All]  [Edit]
   ```
6. Gender inference from Hindi grammar/content cues
   - If confident → casual confirmation: *"I noticed you mentioned [cue] — I'll tailor a few health questions accordingly. Sound right?"*
   - If uncertain → fall back to unified hormonal card

### Path B: Step by Step
- Skip the voice note, go directly into conversational questions

### Question Sequence (After Voice Cascade)
Engagement-optimized order, **skipping anything already filled by voice cascade**:

#### Group 1: Personal Hair Story (Section A)
- Q1: *"Roughly how old were you when you first noticed changes in your hair?"* → number input + voice
- Q2: *"How long has this current phase been going on?"* → chips: `< 6 months` `6-12 months` `> 1 year`
- Q3: *"Hair genetics can come from either side. Any close relatives with thinning?"* → multi-select chips
- Q4: *"Which of these matches what you're seeing?"* → visual multi-select chips with emoji indicators

#### Group 2: Health & Hormones (Section B)
- Q5: *"Certain conditions directly influence hair health. Been diagnosed with any?"* → multi-select chips
- Q6+Q7 (unified): *"Hormones have a direct impact on hair. Do any of these apply?"* → single-select chips including "Not applicable"
  - Contextual: if gender inferred as male from voice, this question may be auto-skipped with "Not applicable"
- Q8+Q9 (together): *"Two quick questions on skin markers:"* → yes/no toggles for acne and excess hair growth

#### Group 3: Lifestyle — Health Habits (Section C, part 1)
- Transition: *"Now a few questions about your lifestyle — this helps us spot triggers."*
- Q11 smoking: *"Do you smoke?"* → `No` `< 5/day` `5-10/day` `10+/day`
- Q11 alcohol: *"And alcohol?"* → `Yes` `No`

#### Group 4: Lifestyle — Hair Care Routine (Section C, part 2)
- Transition: *"Got it on the health side. Now about your hair care routine."*
- Q11 hard water: *"What kind of water do you use for washing?"* → `Normal/RO` `Hard water`
- Q11 wash frequency: *"How often do you wash your hair?"* → `Daily` `Alternate days` `Weekly`
- Q11 heating/styling: *"Do you use heat styling tools?"* → `Yes` `No`
- Q11 salon: *"Any salon treatments like keratin, smoothening, rebonding?"* → `Yes (which?)` `No`
- Q10: *"In the past 6 months, have any of these happened?"* → multi-select chips with "why we ask" micro-copy

#### Group 5: Products & Treatments (Section D)
- Q12: *"Have you tried any hair products? You can say brand names — Tugain, Mintop, Follihair, Kesh King, anything."*
  - Multi-select chips + voice option
  - **Brand resolver**: Tugain → Topical Minoxidil, Follihair → Supplements, etc.
  - For each selected: cascade follow-up (duration → helped → side effects)
  - "None / Just regular shampoo" → skip entire section in 1 tap
- Q13: *"Have you had any clinical procedures like PRP, stem cells, or transplant?"*
  - Yes/No gate → if yes, cascade: which → sessions → helped
- Q14: *"Any side effects or bad reactions from past treatments?"*
  - Yes/No → if yes, voice/text description

#### Group 6: Consent (Section E)
- Q15: *"For a personalized analysis, which sample do you prefer?"* → chips with micro-copy
- Q16: *"Do you consent to sample collection and genetic analysis?"* → consent toggle with privacy micro-copy

### End of Form
1. **Review screen** — all 16 fields displayed as a structured summary in the chat
2. Patient confirms or taps any field to edit
3. ✓✓ Blue ticks + *"Your intake is complete. Dr. Sharma will review this before your visit."*

---

## Differentiator Features

### 1. Voice Cascade ("The intake that fills itself")
- One voice note → multi-field extraction → confirm-all UI
- **This is the product.** Lead with it in the demo.

### 2. Doctor's Pre-Consult Triage Card
- Generated by `sarvam-105b` from the completed form
- Includes: suspected phenotype, red flags, contraindication warnings, consultation talking points
- Displayed at the top of the final output / review screen
- Example: *"Suspected: Androgenetic Alopecia + Post-Febrile TE. ⚠️ Minoxidil discontinued at Day 10 — likely dread-shed. Counsel on timeline."*

### 3. Indian Pharmacy Brand Resolver
- Maps brand names (Tugain, Mintop, Morr-F, Follihair, Keraglo, Bontress, Scalpe-Pro, etc.) → schema product categories
- Enables natural voice input for Q12 instead of clinical jargon

### 4. Split-Screen Desktop + Evaluator Personas
- Desktop: chat left, live form right
- 3 pre-built test personas with expected outputs:
  - 👤 Rajesh, 45M — Crown thinning, smoker, past Minoxidil
  - 👤 Priya, 27F — Post-dengue shedding, PCOS, hard water
  - 👤 Ananya, 34F — Postpartum, thyroid, supplements

### 5. WhatsApp Polish
- ✓✓ Blue ticks on confirmed sections
- "Dr. Sharma • 🟢 Preparing your consultation" header
- Empathetic milestone progress (*"Phase 2 of 4"*)

### 6. TTS Opt-in (if time permits)
- 🔊 speaker icon on each chat bubble → reads question aloud via `bulbul:v3`
- Accessibility for elderly / low-literacy patients

---

## Conversational Design Principles

Drawn from motivational interviewing (OARS) and clinical UX research:

1. **"Why we ask" micro-copy** on sensitive questions — *"Hair loss often lags 2-3 months behind stressors."*
2. **Micro-affirmations** after answers — *"That's really helpful to know."* / *"We hear this from many patients."*
3. **Natural transitions** between sections — *"Got it on the health side. Now about your daily routine."*
4. **Safe outs everywhere** — "None of these" / "Not applicable" / "Not sure"
5. **De-stigmatizing framing** — *"Hormonal shifts are one of the most common catalysts"* instead of clinical interrogation
6. **No jargon** — "thinning at the crown" not "vertex miniaturization"

---

## Build Plan

### Phase 1 — Foundation (Tonight, Aug 31 / Sep 1) · ~2-3h
- [ ] `bunx create-next-app` with TypeScript + Tailwind + App Router
- [ ] Dark editorial chat UI shell (message bubbles, input area, header, grain overlay)
- [ ] Question data model (mirror intake-schema.json)
- [ ] Chat flow engine (renders questions sequentially, handles answers)
- [ ] Quick-reply chip components (single-select, multi-select, yes/no)
- [ ] localStorage persistence
- [ ] Unit tests for chat flow engine with `bun test`
- [ ] Basic responsive layout (mobile-first)
- [ ] Deploy skeleton to Vercel with Bun package manager
- **Exit criteria:** All 16 questions are navigable as a chat flow on mobile. Core engine tested with `bun test`. No AI yet.

### Phase 2 — Voice + AI (Sep 1, morning) · ~3-4h
- [ ] Sarvam STT integration (`saaras:v3`, codemix + translate modes)
- [ ] Voice recording UI (WhatsApp-style mic button, waveform, playback)
- [ ] `sarvam-105b` structured extraction (voice note → JSON fields)
- [ ] Voice cascade UI (auto-fill cards, confirm-all)
- [ ] Gender inference from transcript + casual confirmation
- [ ] Brand resolver dictionary + LLM mapping
- [ ] API routes in Next.js (hide Sarvam API key)
- **Exit criteria:** A voice note fills multiple fields. Brand names resolve.

### Phase 3 — Differentiators (Sep 1, afternoon) · ~2-3h
- [ ] Doctor's pre-consult triage card (LLM prompt on completed form)
- [ ] Split-screen desktop layout (chat left, live form right)
- [ ] Evaluator persona buttons (3 mock datasets)
- [ ] ✓✓ Blue tick animations
- [ ] "Dr. Sharma reviewing" header + milestone progress
- [ ] TTS opt-in (🔊 icon → `bulbul:v3`) — if time permits
- **Exit criteria:** Desktop experience is polished. Personas work.

### Phase 4 — Polish + Test (Sep 2, morning) · ~2h
- [ ] Mobile testing on actual phone
- [ ] Edge cases (empty voice note, no products used, all "none")
- [ ] Persona validation matrix (input → expected → actual)
- [ ] Accessibility: font sizes, tap targets, contrast for 55+ users
- [ ] Loading states, error handling, network resilience
- [ ] localStorage recovery flow
- **Exit criteria:** Works flawlessly on phone and laptop. All personas pass.

### Phase 5 — Ship (Sep 2, afternoon) · ~1-2h
- [ ] README: how to run, choices (Sarvam + why), bought vs built, test results, "one more week" list
- [ ] 2-minute screen recording: voice cascade → Sarvam narrative → doctor's triage card
- [ ] Final Vercel deploy
- [ ] Reply to email with: live link, repo (invite nikhil@thevectorlabs.in), recording
- **Exit criteria:** Email sent. Done.

---

## "One More Week" List (for README)

- Multi-language support beyond Hinglish (Tamil, Bengali, Marathi) — Sarvam supports 22 languages
- Photo upload for prescriptions/lab reports → Sarvam Vision OCR
- Real-time doctor dashboard showing incoming intakes
- Analytics on completion rates, drop-off points, average time
- WhatsApp Business API integration (patient fills intake IN actual WhatsApp)
- Offline mode with service worker for poor connectivity clinics
- PDF export of doctor's triage card

---

## 2-Minute Video Script Outline

1. **Open on phone** (5s): "I built a hair clinic intake that fills itself."
2. **Record voice note** (15s): Speak in Hinglish, watch cascade auto-fill 5 fields
3. **Tap through remaining** (30s): Show the WhatsApp flow, chips, brand resolver
4. **Show doctor's card** (15s): "This is what the doctor sees — not a filled form, a clinical brief."
5. **Desktop split-screen** (10s): Show live form syncing
6. **The three decisions** (25s):
   - "I chose Sarvam AI over OpenAI Whisper because Indian patients speak Hinglish, not textbook English."
   - "I designed the gender question to infer from speech, not interrogate."
   - "The doctor gets a triage card, not a data dump."
7. **Close** (5s): "With one more week, I'd add Tamil, Bengali, and WhatsApp native integration."
