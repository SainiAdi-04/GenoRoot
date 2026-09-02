"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  answerCurrentQuestion,
  applyVoiceCascade,
  confirmCascade,
  confirmGenderInference,
  createInitialEngineState,
  editQuestion,
  getCurrentQuestion,
  resetEngineState,
  startStepByStep,
  updateCascadeField,
} from "@/lib/engine";
import {
  clearStateStorage,
  loadStateFromStorage,
  saveStateToStorage,
} from "@/lib/storage";
import {
  CascadeFieldItem,
  ChatMessage,
  EngineState,
  GenderInference,
  VoiceInputPayload,
  VoiceMetadata,
} from "@/types/schema";
import { ALL_QUESTIONS } from "@/data/questions";
import { parseVoiceTranscript, getConfirmationDetails } from "@/lib/voiceParser";
import { tts } from "@/lib/ttsService";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { WelcomeCard } from "./WelcomeCard";
import { ReviewCard } from "./ReviewCard";
import { CascadeCard } from "./CascadeCard";
import { GenderConfirmCard } from "./GenderConfirmCard";
import { VoiceConfirmationCard } from "./VoiceConfirmationCard";
import { NumberInput } from "../inputs/NumberInput";
import { SingleSelectChips } from "../inputs/SingleSelectChips";
import { MultiSelectChips } from "../inputs/MultiSelectChips";
import { TextInput } from "../inputs/TextInput";
import { CombinedYesNoInput } from "../inputs/CombinedYesNoInput";
import { JsonDebugModal } from "../debug/JsonDebugModal";

export const ChatContainer: React.FC = () => {
  const [state, setState] = useState<EngineState>(() => {
    if (typeof window !== "undefined") {
      const saved = loadStateFromStorage();
      if (saved) return saved;
    }
    return createInitialEngineState();
  });
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [typingStatus, setTypingStatus] = useState<string>("Dr. Sharma is transcribing…");
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [speaker, setSpeaker] = useState<string>(tts.getSpeaker());

  // The Golden Rule: Pending Voice Confirmation Card State
  const [pendingVoiceConfirmation, setPendingVoiceConfirmation] = useState<{
    stepId: string;
    value: unknown;
    rawTranscript: string;
    confirmationPhrase: string;
    displayBadges: string[];
    voicePayload: VoiceInputPayload;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persist state to localStorage on update
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.phase, state.currentStepId, pendingVoiceConfirmation]);

  const currentQ = getCurrentQuestion(state);

  // Voice-First TTS: Read prompt aloud whenever question changes in step-by-step
  useEffect(() => {
    if (state.phase === "in_progress" && currentQ && isTtsEnabled && !pendingVoiceConfirmation) {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.sender === "bot") {
        tts.speak(lastMsg.content);
      } else {
        tts.speak(currentQ.prompt);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ?.id, state.phase, isTtsEnabled]);

  const handleStartStepByStep = () => {
    tts.stop();
    setState((prev) => startStepByStep(prev));
  };

  const handleAnswer = (val: unknown) => {
    tts.stop();
    setPendingVoiceConfirmation(null);
    setState((prev) => answerCurrentQuestion(prev, val));
  };

  // Voice Input submission with Golden Rule confirmation and ambient fallback
  const handleVoiceSubmit = async (payload: VoiceInputPayload) => {
    if (!currentQ) return;
    tts.stop();

    // 1. Strict ASR + Deterministic Keyword Matching (Fast local parse)
    let parseRes = parseVoiceTranscript(currentQ.id, currentQ, payload.translate);
    if (!parseRes.success && payload.codemix && payload.codemix !== payload.translate) {
      const fallbackRes = parseVoiceTranscript(currentQ.id, currentQ, payload.codemix);
      if (fallbackRes.success) parseRes = fallbackRes;
    }

    // 1b. If local deterministic matching misses, attempt intelligent extraction fallback via /api/extract
    if (!parseRes.success && (payload.translate || payload.codemix)) {
      try {
        const extRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            translate: payload.translate || payload.codemix,
            codemix: payload.codemix,
          }),
        });
        if (extRes.ok) {
          const extData = await extRes.json();
          if (extData.success && Array.isArray(extData.fields)) {
            const matchedField = extData.fields.find(
              (f: CascadeFieldItem) => f.questionId === currentQ.id || f.key === currentQ.key
            );
            if (matchedField && matchedField.value !== undefined && matchedField.value !== null) {
              const conf = getConfirmationDetails(currentQ.id, matchedField.value);
              setPendingVoiceConfirmation({
                stepId: currentQ.id,
                value: matchedField.value,
                rawTranscript: payload.codemix || payload.translate,
                confirmationPhrase: conf.confirmationPhrase,
                displayBadges: conf.displayBadges,
                voicePayload: payload,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn("AI extraction fallback error:", err);
      }
    }

    // 2. Golden Rule Confirmation
    if (parseRes.success && parseRes.value !== undefined) {
      const conf = getConfirmationDetails(currentQ.id, parseRes.value);
      setPendingVoiceConfirmation({
        stepId: currentQ.id,
        value: parseRes.value,
        rawTranscript: payload.codemix || payload.translate,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
        voicePayload: payload,
      });
    } else {
      // 3. Ambient noise fallback: Confidence < 80% or unparsed speech -> prompt patient to tap
      // If voice is not understood by the model, do not show audio play feature or transcribe
      const fallbackPrompt = "I didn't quite catch that. Could you please tap your answer on the screen instead?";
      const botFallbackMsg: ChatMessage = {
        id: `msg_bot_ambient_fallback_${Date.now()}`,
        sender: "bot",
        content: fallbackPrompt,
        timestamp: Date.now() + 1,
        questionId: currentQ.id,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botFallbackMsg],
      }));

      if (isTtsEnabled) {
        tts.speak(fallbackPrompt);
      }
    }
  };

  // User confirmed the Voice Confirmation Card
  const handleConfirmVoice = () => {
    if (!pendingVoiceConfirmation || !currentQ) return;
    const { value, voicePayload } = pendingVoiceConfirmation;

    const userVoiceMsg: ChatMessage = {
      id: `msg_user_voice_${currentQ.id}_${Date.now()}`,
      sender: "user",
      content: voicePayload.codemix || voicePayload.translate,
      timestamp: Date.now(),
      questionId: currentQ.id,
      voice: {
        audioUrl: voicePayload.audioUrl,
        durationSeconds: voicePayload.durationSeconds,
        codemixTranscript: voicePayload.codemix,
        translateTranscript: voicePayload.translate,
        isFallback: voicePayload.isFallback,
      },
    };

    setPendingVoiceConfirmation(null);
    setState((prev) => answerCurrentQuestion(prev, value, ALL_QUESTIONS, userVoiceMsg));
  };

  // User rejected the Voice Confirmation Card
  const handleRejectVoice = () => {
    setPendingVoiceConfirmation(null);
    const retryText = "Let's try again. You can speak your answer clearly or tap below.";
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `msg_bot_retry_${Date.now()}`,
          sender: "bot",
          content: retryText,
          timestamp: Date.now(),
          questionId: currentQ?.id,
        },
      ],
    }));
    if (isTtsEnabled) {
      tts.speak(retryText);
    }
  };

  const handleVoiceCascade = (payload: {
    fields: CascadeFieldItem[];
    genderInference?: GenderInference;
    voice?: VoiceMetadata;
  }) => {
    tts.stop();
    setState((prev) => applyVoiceCascade(prev, payload));
  };

  const handleConfirmCascade = () => {
    tts.stop();
    setState((prev) => confirmCascade(prev));
  };

  const handleUpdateCascadeField = (
    fieldKey: string,
    newValue: unknown,
    newDisplayValue?: string
  ) => {
    setState((prev) =>
      updateCascadeField(prev, fieldKey, newValue, newDisplayValue)
    );
  };

  const handleConfirmGender = (confirmed: boolean) => {
    tts.stop();
    setState((prev) => confirmGenderInference(prev, confirmed));
  };

  const handleEditField = (stepId: string) => {
    tts.stop();
    setState((prev) => editQuestion(prev, stepId));
  };

  const handleConfirmSubmit = () => {
    tts.stop();
    setState((prev) => ({
      ...prev,
      phase: "completed",
      messages: [
        ...prev.messages,
        {
          id: `msg_completed_${Date.now()}`,
          sender: "bot",
          content:
            "✓✓ Intake complete and verified! Dr. Sharma will review your clinical brief before your consultation.",
          timestamp: Date.now(),
          isTransition: true,
        },
      ],
    }));
  };

  const handleReset = () => {
    tts.stop();
    clearStateStorage();
    setPendingVoiceConfirmation(null);
    setState(resetEngineState());
  };

  const handleToggleTts = () => {
    const nextVal = !isTtsEnabled;
    setIsTtsEnabled(nextVal);
    tts.setMuted(!nextVal);
  };

  const handleSpeakerChange = (newSpeaker: string) => {
    setSpeaker(newSpeaker);
    tts.setSpeaker(newSpeaker);
  };

  const getPhaseLabel = (): string => {
    switch (state.phase) {
      case "welcome":
        return "CLINICAL INTAKE";
      case "cascade":
        return "VOICE REVIEW";
      case "gender_confirm":
        return "PERSONALIZATION";
      case "in_progress":
        if (currentQ) {
          const shortNames: Record<string, string> = {
            A: "HAIR HISTORY",
            B: "HEALTH & HORMONES",
            C: "LIFESTYLE & TRIGGERS",
            D: "PRIOR TREATMENTS",
            E: "CONSENT & SAMPLE",
          };
          const name = shortNames[currentQ.sectionId] || currentQ.sectionTitle?.toUpperCase() || "INTAKE";
          return name;
        }
        return "CLINICAL INTAKE";
      case "review":
        return "SUMMARY REVIEW";
      case "completed":
        return "VERIFIED & SUBMITTED";
      default:
        return "CLINICAL INTAKE";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#111814] text-[#f3f0df]">
      {/* Header */}
      <ChatHeader
        onReset={handleReset}
        onToggleDebug={() => setIsDebugOpen((prev) => !prev)}
        isDebugOpen={isDebugOpen}
        phaseLabel={getPhaseLabel()}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={handleToggleTts}
        speaker={speaker}
        onChangeSpeaker={handleSpeakerChange}
      />

      {/* Main Chat Scroll Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3.5 py-4 sm:px-6 flex flex-col justify-between">
        <div className="space-y-3 pb-6">
          {/* Message History */}
          {state.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Welcome Screen Card */}
          {state.phase === "welcome" && (
            <WelcomeCard
              onStartStepByStep={handleStartStepByStep}
              onVoiceCascade={handleVoiceCascade}
              onProcessingChange={(isProc, statusText) => {
                setIsTranscribing(isProc);
                if (statusText) setTypingStatus(statusText);
              }}
            />
          )}

          {/* Voice Cascade Confirmation Card */}
          {state.phase === "cascade" && state.pendingCascade && (
            <CascadeCard
              fields={state.pendingCascade.fields}
              onConfirmAll={handleConfirmCascade}
              onUpdateField={handleUpdateCascadeField}
            />
          )}

          {/* Gender Personalization Confirmation Card */}
          {state.phase === "gender_confirm" && (
            <GenderConfirmCard
              genderInference={state.pendingCascade?.genderInference}
              onConfirm={handleConfirmGender}
            />
          )}

          {/* GOLDEN RULE: Voice Confirmation Card (Displayed before committing voice answer) */}
          {pendingVoiceConfirmation && (
            <VoiceConfirmationCard
              confirmationPhrase={pendingVoiceConfirmation.confirmationPhrase}
              displayBadges={pendingVoiceConfirmation.displayBadges}
              rawTranscript={pendingVoiceConfirmation.rawTranscript}
              onConfirm={handleConfirmVoice}
              onReject={handleRejectVoice}
            />
          )}

          {/* Active Question Input Controls (Voice-First, Tap-Backup) */}
          {!pendingVoiceConfirmation && state.phase === "in_progress" && currentQ && (
            <div className="mt-4">
              {currentQ.type === "number" && (
                <NumberInput
                  question={currentQ}
                  onSubmit={(num) => handleAnswer(num)}
                  onVoiceSubmitted={handleVoiceSubmit}
                  onProcessingChange={setIsTranscribing}
                  defaultValue={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | number
                      | null
                  }
                />
              )}

              {(currentQ.type === "single" || currentQ.type === "yesno" || currentQ.type === "hormonal") && (
                <SingleSelectChips
                  question={currentQ}
                  onSelect={(val) => handleAnswer(val)}
                  onVoiceSubmitted={handleVoiceSubmit}
                  onProcessingChange={setIsTranscribing}
                  defaultValue={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | string
                      | null
                  }
                />
              )}

              {currentQ.type === "multi" && (
                <MultiSelectChips
                  question={currentQ}
                  onConfirm={(vals) => handleAnswer(vals)}
                  onVoiceSubmitted={handleVoiceSubmit}
                  onProcessingChange={setIsTranscribing}
                  defaultValues={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | string[]
                      | null
                  }
                />
              )}

              {currentQ.type === "text" && (
                <TextInput
                  question={currentQ}
                  onSubmit={(text) => handleAnswer(text)}
                  onVoiceSubmitted={handleVoiceSubmit}
                  onProcessingChange={setIsTranscribing}
                  defaultValue={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | string
                      | null
                  }
                />
              )}

              {currentQ.type === "combined_yesno" && (
                <CombinedYesNoInput
                  question={currentQ}
                  onConfirm={(vals) => handleAnswer(vals)}
                  onVoiceSubmitted={handleVoiceSubmit}
                  onProcessingChange={setIsTranscribing}
                  defaultValue={{
                    adult_acne_oily_skin: state.formData.adult_acne_oily_skin,
                    excess_body_facial_hair: state.formData.excess_body_facial_hair,
                  }}
                />
              )}
            </div>
          )}

          {/* Typing Indicator while transcribing voice note */}
          {isTranscribing && (
            <div className="flex justify-start my-2 animate-fade-in">
              <div className="bg-[#16201b] border border-[rgba(243,240,223,0.18)] px-4 py-3 rounded-sm flex items-center gap-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f3f0df] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#f3f0df] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#f3f0df] animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs font-mono text-[rgba(243,240,223,0.7)] tracking-wide">
                  {typingStatus}
                </span>
              </div>
            </div>
          )}

          {/* Section Summary / Review Screen */}
          {(state.phase === "review" || state.phase === "completed") && (
            <ReviewCard
              formData={state.formData}
              onEditField={handleEditField}
              onConfirmSubmit={handleConfirmSubmit}
              isCompleted={state.phase === "completed"}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Schema JSON Debug Modal */}
      <JsonDebugModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        formData={state.formData}
      />
    </div>
  );
};
