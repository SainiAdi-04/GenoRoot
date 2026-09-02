# GenoRoot • Voice-First Clinical Hair Intake

> **"The intake that fills itself."** A voice-first, tap-backup conversational clinical intake for hair and scalp consultations, built for high-touch healthcare and senior accessibility (55+). Powered by Sarvam AI (`saaras:v4`) for Indian accent ASR and a deterministic, zero-LLM keyword matcher.

---

## 🏛 Architectural Principles

### 1. Bought vs. Built
| Component | Decision | Rationale |
| :--- | :--- | :--- |
| **ASR (Speech-to-Text)** | **Bought** (Sarvam `saaras:v4`) | Homegrown Indian speech model specialized for code-mixed Hinglish, vernacular phonetics, and local accents (*"meri age 26 saal hai"*, *"crown me thinning"*). |
| **Keyword Matcher / Parser** | **Built** (Deterministic JS/TS Trie/Regex) | **Strictly follows the "no AI at all" rule** (meaning no Generative LLM interpreting free text). Clinical intakes cannot tolerate LLM hallucinations, non-deterministic outputs, or 2-second cloud round-trips. A deterministic matcher guarantees instant, 100% predictable extraction. |
| **TTS (Text-to-Speech)** | **Built / Client-side** (Web SpeechSynthesis) | Zero-latency, browser-native audio reading questions aloud at 0.92x calm pace for 55-year-old patient clarity, with instant barge-in cancellation. |

---

### 2. The Golden Rule for 55-Year-Old Senior Patients
> **"Always confirm what you heard before moving on. Never assume the ASR got it right."**

When a patient speaks their answer, the app does **not** silently advance to the next step. Instead, it displays the **Voice Confirmation Card**:
- **Spoken Preview:** Shows exactly what was heard in quotation marks.
- **Extracted Badges:** Highlights recognized clinical terms (e.g. `[ Father ] [ Mother ]`).
- **Confirmation Question:** TTS reads aloud: *"I heard Father and Mother. Is that correct?"*
- **Senior-Friendly Touch Targets:** Massive buttons (`min-h-[52px]` / `min-h-[56px]`) with high-contrast borders:
  - `[ ✓ Yes, that's right ]` (Confirms and saves to clinic record)
  - `[ ✗ Try again ]` (Clears and re-prompts without manual frustration)
- Patients can confirm either by tapping the screen or by saying *"Yes"*.

---

### 3. Bonus: Exact Code Logic for Family History
To prove clinical judgement over hype, multi-select questions use deterministic keyword bags and mutual exclusion:

```typescript
const familyMap: Record<string, string> = {
  father: "Father had hair loss",
  dad: "Father had hair loss",
  papa: "Father had hair loss",
  pitaji: "Father had hair loss",
  mother: "Mother had hair loss",
  mom: "Mother had hair loss",
  mummy: "Mother had hair loss",
  brother: "Siblings with thinning or baldness",
  sister: "Siblings with thinning or baldness",
  sibling: "Siblings with thinning or baldness",
  none: "No known family history",
  "no one": "No known family history",
  "koi nahi": "No known family history",
};

export function extractFamily(transcript: string): string[] {
  const words = transcript.toLowerCase();
  const matched = new Set<string>();

  for (const [key, value] of Object.entries(familyMap)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(words)) {
      matched.add(value);
    }
  }

  // Mutually exclusive: 'None' clears all others
  if (matched.has("No known family history")) {
    return ["No known family history"];
  }

  return Array.from(matched);
}
```

---

### 4. How We Tested the Fill (Unit Tests with Mock ASR Transcripts)
We wrote unit tests in `src/lib/voiceParser.test.ts` that feed raw mock ASR transcripts into the keyword extractor and assert that the resulting JSON schema matches clinical expectations:

```typescript
it("matches father and mother from mock ASR transcript", () => {
  const transcript = "My dad and my mom have it";
  const res = parseVoiceTranscript("q3", q3, transcript);
  expect(res.success).toBe(true);
  expect(res.value).toContain("Father had hair loss");
  expect(res.value).toContain("Mother had hair loss");
  expect(res.confirmationPhrase).toBe("I heard Father and Mother. Is that correct?");
});
```

All 133 tests pass across 18 test files with 0 failures:
```bash
bun test
# 133 pass, 0 fail, 1629 expect() calls [345ms]
```

---

### 5. The "One More Week" Features (Included in Production)

1. **Barge-in Support:**
   - If the patient starts speaking or taps any option on screen, any active TTS speech is immediately cancelled via `speechSynthesis.cancel()`.
2. **Ambient Noise Fallback:**
   - If ASR confidence is low or words cannot be parsed into recognized clinical options (e.g. loud clinic background chatter or unparseable babble), the app automatically falls back to the visual screen:
   - Spoken & Displayed: *"I didn't quite catch that. Could you please tap your answer on the screen instead?"*
3. **Biological Sex Gate & Adaptive Routing:**
   - Asking male patients if they are pregnant damages clinical trust.
   - When biological sex is identified as **Male**, `menstrual_cycle` and `pregnancy_related` are silently assigned `"Not applicable"`, and the hormonal branch is skipped entirely.
4. **Indian Pharmacy Brand Resolver:**
   - Translates spoken Indian brands (*Tugain, Mintop, Morr, Follihair, Scalpe, Finax*) directly into structured clinical categories.

---

## 🛠 Tech Stack

- **Runtime & Tooling:** [Bun](https://bun.sh/) 1.4+ (`bun dev`, `bun test`, `bun run build`)
- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router) + TypeScript + Turbopack
- **Speech Stack:** Sarvam AI `saaras:v4` (`language_code: "hi-IN"`) + Web SpeechSynthesis API
- **Styling:** Tailwind CSS (Dark editorial aesthetic: `#111814` base, warm cream `#f3f0df`, sage green accent `#4e8766`, paper grain texture)
- **Typography:** Playfair Display serif, Inter sans-serif, JetBrains Mono monospace

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
SARVAM_API_KEY="your-sarvam-api-key"
```
*(If no API key is provided, the app automatically runs in test simulation mode with realistic Hinglish personas.)*

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
```
