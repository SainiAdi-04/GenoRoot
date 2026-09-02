import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { VoiceBubble } from "./VoiceBubble";
import { VoiceMetadata } from "@/types/schema";

describe("VoiceBubble component audio and transcript audibility", () => {
  const mockVoice: VoiceMetadata = {
    audioUrl: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH",
    durationSeconds: 13,
    codemixTranscript: "mujhe lagta hai ki dard ki samasya hai",
    translateTranscript: "I feel there is a pain problem",
  };

  it("renders audio element with proper source and preload", () => {
    const html = renderToString(
      React.createElement(VoiceBubble, { voice: mockVoice, timestamp: Date.now() })
    );

    expect(html).toContain("<audio");
    expect(html).toContain("preload=\"auto\"");
    expect(html).toContain("Play voice note");
  });

  it("provides an audible text-to-speech fallback button to read transcript aloud", () => {
    const html = renderToString(
      React.createElement(VoiceBubble, { voice: mockVoice, timestamp: Date.now() })
    );

    expect(html).toContain("Listen");
    expect(html).toContain("mujhe lagta hai ki dard ki samasya hai");
  });
});
