# Hair & Scalp Clinical Intake

Conversational clinical intake and pre-consult triage system transforming patient voice notes and chat interactions into structured medical intake records.

## Language

**Intake Flow**:
The sequential conversational experience guiding a patient through the 16-question clinical assessment.
_Avoid_: Form, survey, questionnaire

**Voice Cascade**:
The opening multi-field extraction mechanism that auto-populates intake fields from an unscripted Hinglish voice note.
_Avoid_: Voice search, speech transcription, dictation

**Gender Inference**:
The probabilistic deduction of biological sex from speech transcripts and linguistic markers used to tailor clinical questions.
_Avoid_: Gender detection, sex identification

**Clinical Framing**:
The consultative, empathetic phrasing of diagnostic questions in plain, everyday language using motivational interviewing principles and patient-benefit "why we ask" context, avoiding biochemical textbook jargon.
_Avoid_: Form prompts, survey questions, interrogation, biochemical textbook jargon (e.g., follicle miniaturization, DHT sensitivity, vasoconstriction)

**Triage Card**:
The pre-consultation clinical briefing generated for the treating dermatologist highlighting suspected phenotype, contraindications, and talking points.
_Avoid_: Doctor dashboard, patient report, summary sheet

**Biological Sex Gate**:
Early low-friction routing touchpoint invoked when voice inference is absent or ambiguous, establishing biological context to prune sex-specific clinical branches.
_Avoid_: Gender question, sex dropdown

**Micro-Affirmation**:
Brief empathetic conversational validation rendered between patient answers to acknowledge clinical context without cluttering the chat.
_Avoid_: Toast, success message, alert

**Guarded Recording**:
Audio capture constrained to a 28-second window with explicit buffer flushing and countdown visualization to honor STT payload limits.
_Avoid_: Unlimited voice note, audio recorder

