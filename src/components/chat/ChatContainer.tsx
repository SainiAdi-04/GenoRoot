"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  answerCurrentQuestion,
  createInitialEngineState,
  getCurrentQuestion,
  resetEngineState,
  startStepByStep,
} from "@/lib/engine";
import {
  clearStateStorage,
  loadStateFromStorage,
  saveStateToStorage,
} from "@/lib/storage";
import { EngineState } from "@/types/schema";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { WelcomeCard } from "./WelcomeCard";
import { ReviewCard } from "./ReviewCard";
import { NumberInput } from "../inputs/NumberInput";
import { SingleSelectChips } from "../inputs/SingleSelectChips";
import { MultiSelectChips } from "../inputs/MultiSelectChips";
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persist state to localStorage on update
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.phase, state.currentQuestionIndex]);

  const handleStartStepByStep = () => {
    setState((prev) => startStepByStep(prev));
  };

  const handleAnswer = (val: unknown) => {
    setState((prev) => answerCurrentQuestion(prev, val));
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
            <WelcomeCard onStartStepByStep={handleStartStepByStep} />
          )}

          {/* Active Question Input Controls */}
          {state.phase === "in_progress" && currentQ && (
            <div className="mt-4">
              {currentQ.type === "number" && (
                <NumberInput
                  question={currentQ}
                  onSubmit={(num) => handleAnswer(num)}
                  defaultValue={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | number
                      | null
                  }
                />
              )}

              {currentQ.type === "single" && (
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
                  defaultValues={
                    state.formData[currentQ.key as keyof typeof state.formData] as
                      | string[]
                      | null
                  }
                />
              )}
            </div>
          )}

          {/* Section Summary / Review Screen */}
          {state.phase === "review" && (
            <ReviewCard
              formData={state.formData}
              onContinue={() => {
                alert("Section A complete! Next sections will be enabled in Ticket 02.");
              }}
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
