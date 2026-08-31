# GenoRoot • Hair & Scalp Clinical Intake

> **"The intake that fills itself."** A WhatsApp-style conversational web app for hair and scalp clinical intake, powered by India's homegrown Sarvam AI stack and styled in a dark editorial aesthetic.

---

## 🛠 Tech Stack

- **Runtime & Tooling:** [Bun](https://bun.sh/) 1.4+ (`bun dev`, `bun test`, `bun run build`)
- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS (Dark editorial aesthetic: `#111814` base, warm cream `#f3f0df`, sage green accent `#4e8766`, paper grain texture)
- **Typography:** Three-font system (Playfair Display serif for headlines, Inter sans-serif for chat messages, JetBrains Mono monospace for clinical values and timestamps)
- **Testing:** Native `bun test` runner for instant sub-second verification
- **State Management:** React state + `localStorage` persistence (`haiku-intake-state`)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run the Development Server
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Tests
```bash
bun test
```

### 4. Build for Production
```bash
bun run build
```

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── globals.css      # Dark editorial theme, grain texture, font variables
│   │   ├── layout.tsx       # Root layout with 3-font system and viewport setup
│   │   └── page.tsx         # Clinical intake main entrypoint
│   ├── components/
│   │   ├── chat/            # Chat shell, header, message bubbles, welcome, review cards
│   │   ├── inputs/          # NumberInput, SingleSelectChips, MultiSelectChips
│   │   └── debug/           # Live schema JSON inspector modal
│   ├── data/
│   │   └── questions.ts     # Schema question definitions & options
│   ├── lib/
│   │   ├── engine.ts        # Pure chat flow engine & state machine
│   │   ├── engine.test.ts   # Chat engine unit tests (bun test)
│   │   ├── storage.ts       # localStorage persistence with safe fallback
│   │   └── storage.test.ts  # Storage unit tests (bun test)
│   └── types/
│       └── schema.ts        # Intake schema, form state, and engine types
├── SPEC.md                  # Complete product & architecture spec
└── plan.md                  # Design & build execution plan
```
