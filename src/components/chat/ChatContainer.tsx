"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  answerCurrentQuestion,
  answerWithVoice,
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
  EngineState,
  GenderInference,
  VoiceInputPayload,
  VoiceMetadata,
} from "@/types/schema";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { WelcomeCard } from "./WelcomeCard";
import { ReviewCard } from "./ReviewCard";
import { CascadeCard } from "./CascadeCard";
import { GenderConfirmCard } from "./GenderConfirmCard";
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persist state to localStorage on update
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.phase, state.currentStepId]);

  const handleStartStepByStep = () => {
    setState((prev) => startStepByStep(prev));
  };

  const handleAnswer = (val: unknown) => {
    setState((prev) => answerCurrentQuestion(prev, val));
  };

  const handleVoiceSubmit = (payload: VoiceInputPayload) => {
    setState((prev) => answerWithVoice(prev, payload));
  };

  const handleVoiceCascade = (payload: {
    fields: CascadeFieldItem[];
    genderInference?: GenderInference;
    voice?: VoiceMetadata;
  }) => {
    setState((prev) => applyVoiceCascade(prev, payload));
  };

  const handleConfirmCascade = () => {
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
    setState((prev) => confirmGenderInference(prev, confirmed));
  };

  const handleEditField = (stepId: string) => {
    setState((prev) => editQuestion(prev, stepId));
  };

  const handleConfirmSubmit = () => {
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
    clearStateStorage();
    setState(resetEngineState());
  };

  const currentQ = getCurrentQuestion(state);

  return (
    <div className="flex flex-col min-h-screen bg-[#111814] text-[#f3f0df]">
      {/* Header */}
      <ChatHeader
        onReset={handleReset}
        onToggleDebug={() => setIsDebugOpen((prev) => !prev)}
        isDebugOpen={isDebugOpen}
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

          {/* Active Question Input Controls */}
          {state.phase === "in_progress" && currentQ && (
            <div className="mt-4">
              {currentQ.type === "number" && (
                <NumberInput
                  question={currentQ}
                  onSubmit={(num) => handleAnswer(num)}
                  onVoiceSubmitted={
                    currentQ.voiceEligible ? handleVoiceSubmit : undefined
                  }
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
                  onVoiceSubmitted={
                    currentQ.voiceEligible ? handleVoiceSubmit : undefined
                  }
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
                  defaultValue={{
                    adult_acne_oily_skin: state.formData.adult_acne_oily_skin,
                    excess_body_facial_hair: state.formData.excess_body_facial_hair,
                  }}
                />
              )}
            </div>
          )}

          {/* Typing Indicator while transcribing voice note (cream dots on dark surface) */}
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

