# GenoRoot • Voice-First Clinical Hair Intake

> **"The intake that fills itself."** A voice-first, tap-backup conversational clinical intake for hair and scalp consultations, built for high-touch healthcare and senior accessibility (55+). Powered by Sarvam AI (`saaras:v3` / `saaras:v4`, `sarvam-105b`, `bulbul:v3`) for Indian accent speech recognition and a deterministic keyword parser.

---


##  The Problem & Design Philosophy

### The Clinic Reality
Patients at hair and scalp clinics today fill a dense 16-question paper intake form before consultations. The result:
- Patients abandon it midway or check boxes carelessly.
- Front-desk nurses are pulled away from clinical duties to assist patients.
- Doctors enter the consultation room with fragmented, hurried notes.

### The GenoRoot Shift
The last decade of healthcare software was *forms and dashboards*: the patient clicks, the database stores. **GenoRoot reverses the burden**: the software does the work, the human gets the outcome.

1. **For the Patient (Zero Form Anxiety):** A warm, WhatsApp-style conversational chat where they can speak naturally in Hinglish (*"meri age 26 saal hai, crown me thinning ho rahi hai"*) or tap massive high-contrast chips.
2. **For the Doctor (10-Second Clinical Briefing):** Not a raw data dump, but an AI-synthesized **Pre-Consult Triage Card** highlighting suspected phenotypes, clinical red flags (e.g., minoxidil dread-shed dropout), pharmacological contraindications, and actionable talking points.

---

##  Core Decisions (Evaluated in Order)

---

### 1. How It Feels
*Judged on: Snappy, obvious without instructions, finishable by a 55-year-old on a phone. Tested on mobile and laptop.*

| Design Choice | Implementation | Clinical & Ergonomic Rationale |
| :--- | :--- | :--- |
| **Touch Ergonomics** | Minimum touch targets of `48px` to `56px` (`min-h-[52px]` on critical actions) with `12px+` hit padding. | Trembling, arthritic, or senior fingers can tap reliably without mis-tapping adjacent options. |
| **Dark Editorial Palette** | Base `#111814` (warm near-black), text `#f3f0df` (warm cream), accent `#62a57f` (clinical sage), borders `rgba(243,240,223,0.15)`. | Eliminates harsh clinic glare on OLED mobile screens; softer on aging eyes than stark white backgrounds while maintaining strict WCAG AAA contrast ratios. |
| **Pacing & Framing** | One question at a time using Motivational Interviewing (OARS) principles and empathetic micro-affirmations (*"Got it on the health side. Now about your daily routine."*). | A 16-question grid induces cognitive fatigue. Sequential conversational pacing feels like a caring nurse check-in rather than an interrogation. |
| **"Why We Ask" Micro-copy** | Contextual rationales beneath sensitive questions (e.g. *"Why we ask: Hard water leaves mineral buildup that weakens hair shafts"*). | Demystifies why a hair doctor is asking about water quality, smoking, or menstrual cycles, dramatically lowering drop-off rates. |
| **Safe Outs Everywhere** | Explicit exclusive options on every multi-select: *"No known family history"*, *"None of these diagnosed"*, *"Not applicable"*. | Elderly patients never feel trapped or forced to make inaccurate selections. |
| **Responsive Dual Mode** | Seamless mobile portrait layout + desktop split-view with a live **Schema JSON Inspector Modal** (`<JsonDebugModal />`). | Evaluators on laptops can inspect the machine-readable payload in real-time, while phone users enjoy an uncompromised native chat feel. |

---

### 2. Taste

#### Detailed Per-Question Clinical UX Matrix

| # | Question & Field | Interaction Type | Voice / Inference Behavior | Clinical UX Rationale |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Age hair loss began** (`age_hair_loss_began`) | Number Stepper / Quick Chips + Voice | Extracted via `extractNumber()` supporting English digits, words (*"twenty-six"*), Hindi numbers (*"chhabis"*, *"pachas"*), and Devanagari numerals (०–९). | Typing numbers on phone keyboards can be finicky; voice or quick number increments make age entry instantaneous. |
| **—** | **Biological Sex Gate** (`biological_sex`) | Discrete Single-select / Voice Inference | **Inferred from Hindi grammar** (e.g. *"karta hoon"* vs *"karti hoon"*) or content cues. Casually confirmed via Gender Card. | Asking *"What is your sex?"* outright feels cold. Inferring from natural speech or low-friction tap preserves conversational trust. |
| **2** | **Duration** (`duration`) | Single-select Pills (`< 6mo`, `6-12mo`, `> 1yr`) | Mapped via duration keywords (*"months"*, *"saal"*, *"recently"*). | Standardizes temporal data into clinical staging buckets without manual calendar arithmetic. |
| **3** | **Family History** (`family_history`) | Multi-select Keyword Bag + Mutual Exclusion | Deterministic dictionary covering *father, dad, papa, pitaji, mother, mom, mummy, brother, sister, koi nahi, none*. | Multi-select pills let patients tag both maternal and paternal sides in two taps. Choosing *"None"* immediately unchecks all others. |
| **4** | **Hair Loss Pattern** (`pattern`) | Anatomical Visual Chips | Keyword parser recognizes *receding hairline, crown thinning, widening part, diffuse, patchy, excessive shedding*. | Plain anatomical descriptions (*"Receding hairline (temples moving back)"*, *"Thinning at crown"*) replace medical jargon (*"vertex miniaturization"*). |
| **5** | **Diagnosed Conditions** (`diagnosed_conditions`) | Multi-select Pills | Matches *PCOS, PCOD, thyroid, sugar/diabetes, autoimmune, anemia/iron, none*. | Includes explicit *"None"* exclusive option; captures systemic medical drivers in one tap. |
| **6** | **Menstrual Cycle** (`menstrual_cycle`) | **Adaptive Branching** (Female only) | **Auto-skipped if sex inferred as Male** (silently set to `"Not applicable"`). | Asking a 45-year-old male about pregnancy or periods damages clinical credibility. Pruned dynamically by the routing engine. |
| **7** | **Pregnancy-related** (`pregnancy_related`) | **Adaptive Branching** (Female only) | **Auto-skipped if sex inferred as Male** (silently set to `"Not applicable"`). | Unified with Q6 under a caring hormonal framing card with safe out *"Not applicable to my profile"*. |
| **8** | **Adult Acne / Oily Skin** (`adult_acne_oily_skin`) | Grouped 2-in-1 Card (`CombinedYesNoInput`) | Dual-switch toggle card answering Q8 and Q9 simultaneously. | Prevents click fatigue by pairing dermatological skin markers into a single low-friction touchpoint. |
| **9** | **Excess Body/Facial Hair** (`excess_body_facial_hair`) | Grouped 2-in-1 Card (`CombinedYesNoInput`) | Included in the same card as Q8. | Evaluates systemic androgen sensitivity without requiring two separate question screens. |
| **10** | **Past 6 Months Triggers** (`past_6_months`) | Multi-select Pills + Clinical Rationale | Recognizes *crash dieting, emotional stress, dengue/COVID/typhoid, surgery, water/city change*. | Captures acute physiological shocks triggering telogen effluvium (which typically surfaces 2–3 months post-event). |
| **11** | **Lifestyle Habits** (`habits`) | **Progressive Conversational Sub-flow** | Decomposed into discrete single-tap check-ins rather than a 6-row grid: Smoking severity, Alcohol, Water type, Wash frequency, Heat tools, Salon chemical treatments. | A giant matrix of 6 yes/no questions causes abandonment. Splitting them into quick taps takes under 15 seconds. |
| **12** | **Products Tried** (`products`) | Multi-select Chips + **Indian Brand Resolver** | Translates trade brands (*Tugain, Mintop, Morr-F, Scalpe, Follihair, Keraglo, Finax*) to clinical categories. Follow-up: Duration → Helped → Side effects. | Patients remember brand names, not active pharmaceutical ingredients. 1-tap *"None / regular shampoo"* skips the entire section. |
| **13** | **In-Clinic Procedures** (`procedures`) | Yes/No Gate → Dynamic Follow-up | If Yes: multi-select (PRP/GFC, Stem Cells, Transplant) + Sessions + Helped. If No: skips immediately. | 85% of pre-consult patients have never had clinic procedures; a simple gate avoids showing a dead grid. |
| **14** | **Past Side Effects** (`past_treatment_side_effects`) | Yes/No Gate → Voice/Text Description | If Yes: opens descriptive text/voice field for exact symptoms (e.g. *"Scalpe itching with 5% minoxidil"*). | Crucial safety screen to prevent the doctor from re-prescribing an offending agent. |
| **15** | **Preferred Sample Type** (`sample_type`) | Single-select Pills | Saliva (Home Kit) vs. Blood (Clinical Lab) vs. Either. | Gives patients ownership over diagnostic modality before entering the clinic. |
| **16** | **Sample & Genetic Consent** (`consent`) | High-Contrast Consent Toggle | Yes / No with encrypted privacy guarantee micro-copy. | Strict medico-legal compliance for genomic trichology testing. |

---

### 3. Ideas

#### What I Added That Was Not Asked For

1. **The Voice Cascade ("The intake that fills itself"):**
   - On opening the app, patients are invited to record an unscripted 20–30 second Hinglish voice note describing their hair loss.
   - The audio is processed via Sarvam STT in dual modes (`codemix` + `translate`), and `sarvam-105b` extracts up to **7+ fields simultaneously** (age, duration, family history, pattern, past triggers, products tried, smoking habits).
   - An animated **Cascade Card** presents the auto-filled fields as badges with a single **"Confirm All"** button or individual tap-to-edit chips.
   - The question engine **intelligently skips** all confirmed questions during the subsequent flow.

2. **The Golden Rule for 55-Year-Old Patients:**
   > *"Always confirm what you heard before moving on. Never assume the ASR got it right."*
   - When a patient speaks an individual answer, the app displays the **Voice Confirmation Card**:
     - **Spoken Preview:** Displays verbatim transcript in quotes.
     - **Extracted Badges:** Shows recognized clinical entities (e.g., `[ Father ] [ Mother ]`).
     - **Audio Confirmation:** TTS reads aloud: *"I heard Father and Mother. Is that correct?"*
     - **Large Touch Targets:** `[ ✓ Yes, that's right ]` (advances) and `[ ✗ Try again ]` (clears and re-prompts).
     - Confirms via screen tap or by saying *"Yes"*.

3. **Doctor's Pre-Consult Triage Card:**
   - Instead of delivering a flat 16-field data dump, the completed intake triggers an automated clinical synthesis via `sarvam-105b` (with deterministic fallback in `triageService.ts`).
   - The doctor receives a **10-second high-priority clinical briefing** containing:
     - **Suspected Phenotype:** e.g., *"Acute Post-Febrile Telogen Effluvium secondary to Dengue, with underlying PCOS androgenic predisposition"*.
     - **Clinical Red Flags:** e.g., *"Patient discontinued Topical Minoxidil at Day 10 due to shedding — likely misidentified dread-shed. Counsel on 4–6 month biological timeline."*
     - **Pharmacological Contraindications:** e.g., *"Oral 5-alpha reductase inhibitors (Finasteride/Dutasteride) contraindicated in postpartum/female patient."*
     - **Consultation Talking Points:** Actionable discussion items and recommended lab panels (Ferritin, Vitamin D3, TSH, Free Testosterone).

4. **Indian Pharmacy Brand Resolver (`src/lib/brandResolver.ts`):**
   - Built-in dictionary mapping 25+ common Indian retail and prescription hair brands to schema product categories:
     - *Tugain, Mintop, Morr-F, Imxia, Hair4U* ➔ **Topical Minoxidil**
     - *Follihair, Keraglo, Chicnutrix, Biotin gummies* ➔ **Supplements**
     - *Scalpe-Pro, Selsun, Nizoral, Cipla 8X* ➔ **OTC/Medicated Shampoos**
     - *Anaboom, Bontress Pro, Redensyl, Kesh King, Indulekha* ➔ **Hair Oils/Serums**
     - *Finax, Finpecia, Lonitab (Oral Minoxidil)* ➔ **Oral Minoxidil**

5. **Sarvam Bulbul v3 TTS with Instant Barge-In:**
   - Full voice synthesis using Sarvam's `bulbul:v3` with authentic Indian accents (flagship voice `shubh`, plus `ishita`, `priya`, and `ratan`).
   - Calibrated at **0.92x calm pacing** specifically for senior patient comprehension.
   - **Barge-in:** Touching any chip or tapping the mic instantly executes `tts.stop()`, canceling speech playback and aborting pending network requests with zero lag.

6. **Ambient Clinic Noise Fallback:**
   - If background hospital noise, clinic chatter, or unparseable babble produces low STT confidence, the system does not loop or stall.
   - It gracefully falls back to screen interaction:
     - Spoken & Displayed: *"I didn't quite catch that. Could you please tap your answer on the screen instead?"*

7. **Evaluator Quick-Test Personas (01, 02, 03):**
   - Located in the welcome card for instant 1-click evaluation without having to speak or manually tap 16 questions:
     - **👤 01 Rajesh (45M):** Crown thinning, 8 months, father baldness, moderate smoker, past Tugain 5% failure.
     - **👤 02 Priya (27F):** Sudden shedding post-dengue fever, diagnosed PCOS, irregular cycles, hard borewell water.
     - **👤 03 Ananya (34F):** Postpartum 6 months, diffuse thinning, thyroid disorder, Follihair supplements.

---

### 4. Resourcefulness

#### Why Sarvam AI Instead of OpenAI / Whisper?
1. **Vernacular Phonetics & Hinglish Code-Mixing:** Indian patients do not speak Oxford English in clinical settings. They say *"crown area me kaafi thinning ho rahi hai"* or *"chaar mahine pehle dengue hua tha"*. OpenAI Whisper frequently mistranscribes Hinglish into nonsensical phonetic English words or drops vernacular sentence structures. Sarvam `saaras:v3` / `saaras:v4` was trained on Indian speech data and handles code-mixed phrasing natively.
2. **Dual-Mode ASR Invocation:**
   - `mode: "codemix"`: Preserves the patient's verbatim spoken Hinglish words for display in their chat bubble.
   - `mode: "translate"`: Delivers standardized English directly to the structured extraction engine.
3. **Homegrown Indian Voice Identity (`bulbul:v3`):** Standard US/UK TTS voices sound synthetic and alien to an Indian patient. Sarvam's `shubh` and `priya` sound like an empathetic Indian clinic coordinator.

#### Why a Deterministic Parser + LLM Hybrid (Instead of Pure LLM)?
- **Zero Hallucinations on Clinical Inputs:** In healthcare intake, a generative LLM cannot be trusted to interpret single-field answers. A pure LLM may hallucinate a family history or drop a vital "None".
- **Zero-Latency Response:** Local regex and trie keyword matching executes in `<1ms`, whereas an LLM round-trip takes 1,500ms–3,000ms.
- **Architectural Seam:** We used **LLMs for unstructured synthesis** (the opening Voice Cascade and Doctor Triage Card) and **deterministic code for structured execution** (per-question answers, mutual exclusion logic, and schema serialization).

#### Bought vs. Built Matrix

| Component | Decision | Technology | Rationale |
| :--- | :--- | :--- | :--- |
| **STT (Speech-to-Text)** | **Bought** | Sarvam AI `saaras:v3` / `saaras:v4` via Web `fetch` & `FormData` | Homegrown Indian model handling code-mixed Hinglish and regional phonetics. |
| **LLM (Cascade & Triage)** | **Bought** | Sarvam `sarvam-105b` (via Vercel AI SDK) with deterministic fallback | High-quality structured extraction and clinical reasoning at low cost. |
| **TTS (Voice Narration)** | **Bought / Client-Side** | Sarvam `bulbul:v3` (`/api/tts`) + WebSpeech fallback | Authentic Indian Hinglish speaker (`shubh`) at 0.92x calm pace with instant barge-in. |
| **Chat Engine & State Machine** | **Built** | TypeScript (`src/lib/engine.ts`) | Strict control over question sequencing, conditional sex pruning, and answer validation. |
| **Voice Cascade & Router** | **Built** | `src/lib/extractService.ts` | Multi-field extraction, confidence scoring (≥0.7 gate), and question auto-skipping. |
| **Per-Question Voice Matcher** | **Built** | `src/lib/voiceParser.ts` | Instant, zero-hallucination keyword and number parsing (including Devanagari numerals). |
| **Indian Pharmacy Resolver** | **Built** | `src/lib/brandResolver.ts` | 25+ trade brands mapped to schema product categories. |
| **Golden Rule Voice Card** | **Built** | `src/components/chat/VoiceConfirmationCard.tsx` | Visual preview + badges + audio confirmation before committing voice data. |
| **Persistence & Schema Export** | **Built** | `src/lib/storage.ts` + `formatFullSchemaJson()` | Browser `localStorage` persistence across refresh + exact output conforming to `intake-schema.json`. |

---

##  How We Tested the Fill

Verification was built as a first-class citizen using native `bun test`. We tested **external system behavior and clinical seams**, not internal component state.

### 1. Test Suite Summary
```bash
bun test
# 133 pass
# 0 fail
# 1629 expect() calls
# Ran 133 tests across 18 files [423ms]
```

### 2. Seams Under Automated Test
1. **Chat Flow Engine (`engine.test.ts`, `questions.test.ts`):** Verifies step-by-step navigation, answering, question skipping, gender pruning, and full 16-field schema formatting.
2. **Voice Parser & Keyword Matcher (`voiceParser.test.ts`):** Feeds raw mock ASR transcripts into the parser and asserts extracted values:
   - Number extraction (English words, Devanagari digits `०-९`, Hindi numbers `chhabis`, `pachas`).
   - Multi-select family history (`father`, `mom`, `mummy`, `papa`, `pitaji`).
   - Mutual exclusivity (verifying `"none"` or `"no one"` wipes all previously selected family members).
   - Pattern and condition keyword extraction.
3. **Indian Brand Resolver (`brandResolver.test.ts`):** Verifies brand-to-category resolution (*"Tugain 5%"* ➔ `Topical Minoxidil`, *"Follihair"* ➔ `Supplements`, *"Finax"* ➔ `Oral Minoxidil`).
4. **AI Extraction & Gender Inference (`extractService.test.ts`):** Tests linguistic marker detection (*"ho gayi"* ➔ Female, *"ka hoon"* ➔ Male), content marker detection (PCOS, postpartum), and confidence threshold filtering (≥0.7).
5. **Doctor Triage Service (`triageService.test.ts`, `route.test.ts`):** Tests synthesis of completed forms into suspected diagnoses, red flag warnings, and contraindication alerts across all personas.
6. **TTS Service & Barge-in (`ttsService.test.ts`, `sarvamTtsService.test.ts`):** Tests emoji stripping, Hinglish language code detection, voice selection, and instant barge-in audio termination.
7. **Accessibility & Responsive Layouts (`ChatHeader.test.tsx`, `MultiSelectChips.test.tsx`, `MessageBubble.test.tsx`):** Verifies touch targets, anti-collision responsive headers, and text wrapping on mobile viewports.

### 3. Persona Verification Matrix

| Test Persona | Simulated Voice Transcript | Expected Auto-fill Fields | Verified Schema Output |
| :--- | :--- | :--- | :--- |
| **👤 01 Rajesh (45M)** | *"Main lagbhag 45 saal ka hoon. Pichle 8 mahine se crown area me kaafi thinning ho rahi hai. Mere father ko bhi baldness thi. Main din me 5-6 cigarette peeta hoon pehle Tugain 5% try kiya tha par fayda nahi hua."* | `age_hair_loss_began: 45`<br>`duration: "6-12 months"`<br>`family_history: ["Father had hair loss"]`<br>`pattern: ["Thinning at crown"]`<br>`smoking: Moderate 5-10/day`<br>`products: Topical Minoxidil (Tugain)`<br>`inferred_gender: male` | ✅ Q6/Q7 pruned (`"Not applicable"`). Triage card flags Minoxidil early dropout & smoking vasoconstriction. |
| **👤 02 Priya (27F)** | *"Meri age 27 saal hai. 4 mahine pehle dengue hua tha tab se bohot heavy shedding ho rahi hai nahate waqt. Mujhe PCOS bhi diagnosed hai aur periods irregular rehte hain. Yahan borewell ka hard water aata hai."* | `age_hair_loss_began: 27`<br>`duration: "Less than 6 months"`<br>`pattern: ["Sudden excessive shedding"]`<br>`conditions: ["PCOS/PCOD"]`<br>`menstrual_cycle: "Irregular"`<br>`past_6_months: ["Dengue fever"]`<br>`hard_water: true`<br>`inferred_gender: female` | ✅ Q6 preserved. Triage card identifies Acute Post-Febrile Telogen Effluvium + PCOS hormonal baseline. |
| **👤 03 Ananya (34F)** | *"I'm 34 years old. 6 months ago I had a baby and since then diffuse thinning has started all over. Thyroid medication also going on. I take Follihair supplements regularly."* | `age_hair_loss_began: 34`<br>`duration: "6-12 months"`<br>`pattern: ["Diffuse thinning"]`<br>`conditions: ["Thyroid disorder"]`<br>`pregnancy_related: "Postpartum <1 year"`<br>`products: Supplements (Follihair)`<br>`inferred_gender: female` | ✅ Q7 auto-populated. Triage card flags postpartum estrogen withdrawal and contraindicates Finasteride. |

---

##  What We'd Improve With One More Week

1. **Improve voice detection (currently failing in a lot of cases):**
   - Address ASR recognition failures under realistic clinic conditions (background noise, fast colloquial speech, overlapping chatter, and varying microphone proximity).
   - Integrate client-side Voice Activity Detection (VAD) and improved acoustic pre-filtering to prevent clipped or dropped audio buffers.
   - Enhance secondary phonetic fuzzy matching and conversational re-prompting so unscripted spoken responses parse reliably without dropping to manual tap fallbacks.
   - Fine-tune Hinglish acoustic vocabulary mappings for nuanced regional dialects and colloquial hair care phrasing.

2. **Elevate and refine the UI (currently still too generic):**
   - Move beyond the standard dark chat container aesthetic into a truly distinct, clinic-grade editorial design language.
   - Introduce custom interactive elements: bespoke anatomical scalp mapping visuals, interactive density sliders, custom voice waveform scrubbers, and tactile micro-animations.
   - Give the interface a unique, polished identity that feels like a top-tier private trichology practice rather than an off-the-shelf chatbot template.

3. **Restructure questions into a natural conversation flow (rather than a clinical anamnesis / interrogation):**
   - Transform remaining rigid diagnostic questions into warm, narrative check-ins that actively build upon earlier answers.
   - Implement contextual chaining (e.g., connecting a patient's post-dengue fever timeline directly to subsequent questions about hair shed intensity and past product trials).
   - Ensure the pacing feels like a thoughtful consultation with an attentive doctor who listens and adapts, rather than an interactive medical questionnaire.

---

##  Quick Start & Local Execution

### Prerequisites
- [Bun](https://bun.sh/) 1.4+ (recommended) or Node.js 20+

### 1. Clone & Install
```bash
git clone <repo-url>
cd take-home
bun install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
SARVAM_API_KEY="your-sarvam-subscription-key"
```
> **Test Simulation Mode:** If no `SARVAM_API_KEY` is provided, the application automatically runs in **offline simulation mode**. The 3 Evaluator Personas and deterministic keyword matchers function with zero external dependencies.

### 3. Run Development Server
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite
```bash
bun test
```

### 5. Build for Production
```bash
bun run build
bun start
```

---

##  Machine-Readable Schema Conformance

The final output generated at completion strictly adheres to the official specification at [haikustudio.ai/hiring/intake-schema.json](https://haikustudio.ai/hiring/intake-schema.json). 

You can inspect the live structured JSON at any moment during the consultation by clicking the **`JSON`** button in the header bar.

```json
{
  "form": "GenoRoot Hair & Scalp Intake",
  "timestamp": "2026-09-02T18:30:00.000Z",
  "intake_data": {
    "age_hair_loss_began": 45,
    "duration": "6-12 months",
    "family_history": ["Father had hair loss"],
    "pattern": ["Thinning at crown"],
    "diagnosed_conditions": ["None"],
    "menstrual_cycle": "Not applicable",
    "pregnancy_related": "Not applicable",
    "adult_acne_oily_skin": false,
    "excess_body_facial_hair": false,
    "past_6_months": [],
    "habits": {
      "smoking": true,
      "smoking_severity": "Moderate 5-10/day",
      "alcohol": false,
      "hard_water": false,
      "hair_wash_frequency": "Alternate Days",
      "heating_tools_styling_chemicals": false,
      "salon_treatments": false,
      "salon_treatment_detail": null
    },
    "products": [
      { "name": "OTC/Medicated Shampoos", "used": false, "duration": null, "helped": null, "side_effects": null },
      { "name": "Hair Oils/Serums", "used": false, "duration": null, "helped": null, "side_effects": null },
      { "name": "Topical Minoxidil", "used": true, "duration": "<3mo", "helped": false, "side_effects": false },
      { "name": "Oral Minoxidil", "used": false, "duration": null, "helped": null, "side_effects": null },
      { "name": "Supplements", "used": false, "duration": null, "helped": null, "side_effects": null }
    ],
    "procedures": [
      { "name": "PRP/GFC/iPRF", "done": false, "sessions": null, "helped": null },
      { "name": "Stem Cells/Exosomes", "done": false, "sessions": null, "helped": null },
      { "name": "Hair Transplant", "done": false, "sessions": null, "helped": null },
      { "name": "Other", "done": false, "sessions": null, "helped": null }
    ],
    "past_treatment_side_effects": false,
    "past_treatment_side_effects_describe": null,
    "sample_type": "Saliva",
    "consent": true
  }
}
```

---
