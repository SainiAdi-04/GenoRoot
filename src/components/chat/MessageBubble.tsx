"use client";

import React, { useState } from "react";
import { ChatMessage } from "@/types/schema";
import { CheckCheck, Loader2, Square, Volume2 } from "lucide-react";
import { VoiceBubble } from "./VoiceBubble";
import { tts } from "@/lib/ttsService";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === "user";
  const isTransition = message.isTransition;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleListen = () => {
    if (isPlaying) {
      tts.stop();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    tts.speak(message.content, {
      onStart: () => {
        setIsLoading(false);
        setIsPlaying(true);
      },
      onEnd: () => {
        setIsLoading(false);
        setIsPlaying(false);
      },
      onError: () => {
        setIsLoading(false);
        setIsPlaying(false);
      },
    });
  };

  if (isTransition) {
    return (
      <div className="w-full my-3 flex justify-center animate-fade-in">
        <div className="max-w-md w-full bg-[#18241e] border border-[rgba(78,135,102,0.35)] px-4 py-3 text-center rounded-sm shadow-sm">
          <p className="text-sm text-[#f3f0df] font-sans leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  if (isUser) {
    if (message.voice) {
      return (
        <div className="flex flex-col items-end my-3 animate-fade-in">
          <VoiceBubble voice={message.voice} timestamp={message.timestamp} />
          <div className="mt-1 mr-1 flex items-center justify-end gap-1.5 text-[11px] font-mono text-[rgba(243,240,223,0.5)]">
            <span>{formattedTime}</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#62a57f]" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end my-2 animate-fade-in">
        <div className="max-w-[85%] sm:max-w-md bg-[#1b2e23] border border-[rgba(78,135,102,0.35)] text-[#f3f0df] px-4 py-3 rounded-sm shadow-sm">
          <p className="text-sm sm:text-base leading-relaxed break-words">
            {message.content}
          </p>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] font-mono text-[rgba(243,240,223,0.5)]">
            <span>{formattedTime}</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#62a57f]" />
          </div>
        </div>
      </div>
    );
  }

  // Bot message
  return (
    <div className="flex justify-start my-2 animate-fade-in group">
      <div className="max-w-[88%] sm:max-w-lg bg-[#16201b] border border-[rgba(243,240,223,0.15)] text-[#f3f0df] px-4 py-3.5 rounded-sm shadow-sm relative">
        <p className="text-sm sm:text-base leading-relaxed font-sans text-[#f3f0df] whitespace-pre-line">
          {message.content}
        </p>
        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[rgba(243,240,223,0.45)]">
          <span>{formattedTime}</span>
          <button
            type="button"
            onClick={handleListen}
            title={isPlaying ? "Stop audio" : "Read this aloud using Sarvam AI"}
            className={`inline-flex items-center gap-1.5 transition-colors px-2 py-0.5 rounded border ${
              isPlaying
                ? "bg-[#1f3328] text-[#4ade80] border-[#62a57f]"
                : isLoading
                ? "bg-[#232918] text-[#fcd34d] border-[#d97706]"
                : "bg-[rgba(243,240,223,0.03)] text-[#62a57f] border-[rgba(78,135,102,0.25)] hover:text-[#f3f0df] hover:border-[rgba(78,135,102,0.5)]"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#fcd34d]" />
                <span className="text-[10px] tracking-wide text-[#fcd34d]">Loading…</span>
              </>
            ) : isPlaying ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current text-[#4ade80]" />
                <span className="text-[10px] tracking-wide text-[#a7f3d0]">Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-[#62a57f]" />
                <span className="text-[10px] tracking-wide">Listen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
