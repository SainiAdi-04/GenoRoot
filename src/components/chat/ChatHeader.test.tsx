import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChatHeader } from "./ChatHeader";

describe("ChatHeader Responsive Layout & Anti-Collision", () => {
  it("renders logo and clinic branding with shrink-0 to prevent overlapping on mobile", () => {
    const html = renderToString(
      React.createElement(ChatHeader, {
        onReset: () => {},
        onToggleDebug: () => {},
        isDebugOpen: false,
        phaseLabel: "CLINICAL INTAKE",
        isTtsEnabled: true,
        onToggleTts: () => {},
        speaker: "shubh",
        onChangeSpeaker: () => {},
      })
    );

    // Doctor/Clinic logo avatar must have shrink-0 so it is never crushed on mobile screens
    expect(html).toContain("shrink-0");
    expect(html).toContain("DS");
    expect(html).toContain("Dr. Sharma");
  });

  it("hides desktop-only JSON inspector button on mobile to preserve header breathing room", () => {
    const html = renderToString(
      React.createElement(ChatHeader, {
        onReset: () => {},
        onToggleDebug: () => {},
        isDebugOpen: false,
        phaseLabel: "CLINICAL INTAKE",
        isTtsEnabled: true,
        onToggleTts: () => {},
      })
    );

    // JSON button should use hidden sm:inline-flex so it doesn't crowd mobile viewports
    expect(html).toContain("hidden sm:inline-flex");
  });

  it("uses gap-based flex layout instead of margin-colliding space-x", () => {
    const html = renderToString(
      React.createElement(ChatHeader, {
        onReset: () => {},
        onToggleDebug: () => {},
        isDebugOpen: false,
        phaseLabel: "CLINICAL INTAKE",
        isTtsEnabled: true,
        onToggleTts: () => {},
      })
    );

    // Parent container should use gap instead of colliding space-x
    expect(html).toContain("gap-2");
    expect(html).not.toContain("space-x-3");
    expect(html).not.toContain("space-x-2");
  });
});
