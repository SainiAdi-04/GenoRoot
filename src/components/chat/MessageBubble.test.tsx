import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MessageBubble } from "./MessageBubble";
import { ChatMessage } from "@/types/schema";

describe("MessageBubble transition messages", () => {
  it("does not display a 'Section Confirmed' section heading to the user", () => {
    const transitionMsg: ChatMessage = {
      id: "msg_trans_1",
      sender: "bot",
      content:
        "✓ Personal history recorded. Now let's look at health and hormonal factors that directly influence hair.",
      timestamp: Date.now(),
      isTransition: true,
    };

    const html = renderToString(
      React.createElement(MessageBubble, { message: transitionMsg })
    );

    // The section heading "Section Confirmed" should NOT be visible to the user
    expect(html.toLowerCase()).not.toContain("section confirmed");

    // The supportive message content itself should remain visible
    expect(html).toContain("Personal history recorded");
    expect(html).toContain("health and hormonal factors");
  });

  it("renders a Listen button for bot question and summary messages", () => {
    const botMsg: ChatMessage = {
      id: "msg_bot_1",
      sender: "bot",
      content: "6 details auto-filled from your voice note. Confirm all in one tap or tap any item to edit:",
      timestamp: Date.now(),
    };

    const html = renderToString(
      React.createElement(MessageBubble, { message: botMsg })
    );

    expect(html).toContain("Listen");
    expect(html).toContain("details auto-filled");
  });
});
