"use client";

import React from "react";
import { ChatMessage } from "@/types/schema";
import { CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === "user";
  const isTransition = message.isTransition;

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isTransition) {
    return (
      <div className="w-full my-4 flex justify-center animate-fade-in">
        <div className="max-w-md w-full bg-[#18241e] border border-[rgba(78,135,102,0.4)] p-3.5 text-center rounded-sm shadow-sm">
          <p className="text-xs font-mono text-[#62a57f] uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-[#4ade80]" />
            Section Confirmed
          </p>
          <p className="text-sm text-[#f3f0df] font-sans">{message.content}</p>
        </div>
      </div>
    );
  }

  if (isUser) {
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
    <div className="flex justify-start my-2 animate-fade-in">
      <div className="max-w-[88%] sm:max-w-lg bg-[#16201b] border border-[rgba(243,240,223,0.15)] text-[#f3f0df] px-4 py-3.5 rounded-sm shadow-sm">
        <p className="text-sm sm:text-base leading-relaxed font-sans text-[#f3f0df]">
          {message.content}
        </p>
        <div className="mt-1 flex items-center justify-start text-[10px] font-mono text-[rgba(243,240,223,0.4)]">
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};
