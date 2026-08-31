import { describe, expect, it } from "bun:test";
import {
  createInitialEngineState,
  startStepByStep,
  answerCurrentQuestion,
  formatUserAnswer,
  resetEngineState,
  getCurrentQuestion,
} from "./engine";
import { SECTION_A_QUESTIONS } from "@/data/questions";

describe("Chat Flow Engine", () => {
  it("initializes in welcome phase with initial welcome bot message", () => {
    const state = createInitialEngineState();
    expect(state.phase).toBe("welcome");
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].sender).toBe("bot");
    expect(state.messages[0].content).toContain("I'm here to help your doctor");
    expect(state.answeredQuestionIds).toEqual([]);
    expect(Object.keys(state.formData).length).toBe(0);
  });

  it("transitions to in_progress and posts first question on startStepByStep", () => {
    const initialState = createInitialEngineState();
    const state = startStepByStep(initialState);

    expect(state.phase).toBe("in_progress");
    expect(state.currentQuestionIndex).toBe(0);
    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q1");
    expect(state.messages.length).toBe(2);
    expect(state.messages[1].sender).toBe("bot");
    expect(state.messages[1].questionId).toBe("q1");
    expect(state.messages[1].content).toBe(SECTION_A_QUESTIONS[0].prompt);
  });

  it("handles Q1 number answer and advances to Q2", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 24);

    expect(state.formData.age_hair_loss_began).toBe(24);
    expect(state.answeredQuestionIds).toContain("q1");
    expect(state.currentQuestionIndex).toBe(1);

    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q2");

    // Check message sequence: welcome -> q1 -> user answer (24) -> q2
    expect(state.messages.length).toBe(4);
    expect(state.messages[2].sender).toBe("user");
    expect(state.messages[2].content).toBe("24 years old");
    expect(state.messages[3].sender).toBe("bot");
    expect(state.messages[3].questionId).toBe("q2");
  });

  it("handles Q2 single-select answer and advances to Q3", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 24);
    state = answerCurrentQuestion(state, "6-12 months");

    expect(state.formData.duration).toBe("6-12 months");
    expect(state.answeredQuestionIds).toContain("q2");
    expect(state.currentQuestionIndex).toBe(2);

    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q3");
  });

  it("handles Q3 multi-select answer with multiple choices and advances to Q4", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 24);
    state = answerCurrentQuestion(state, "6-12 months");
    state = answerCurrentQuestion(state, ["Father had hair loss", "Mother had hair loss"]);

    expect(state.formData.family_history).toEqual([
      "Father had hair loss",
      "Mother had hair loss",
    ]);
    expect(state.answeredQuestionIds).toContain("q3");
    expect(state.currentQuestionIndex).toBe(3);

    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q4");
  });

  it("handles Q4 multi-select answer and reaches review phase after Section A", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 24);
    state = answerCurrentQuestion(state, "6-12 months");
    state = answerCurrentQuestion(state, ["Father had hair loss"]);
    state = answerCurrentQuestion(state, ["Receding hairline", "Thinning at crown"]);

    expect(state.formData.pattern).toEqual(["Receding hairline", "Thinning at crown"]);
    expect(state.answeredQuestionIds).toContain("q4");
    expect(state.phase).toBe("review");

    // Verify last message is confirmation / review
    const lastMsg = state.messages[state.messages.length - 1];
    expect(lastMsg.sender).toBe("bot");
    expect(lastMsg.isTransition).toBe(true);
  });

  it("correctly formats user answers for all supported types", () => {
    const q1 = SECTION_A_QUESTIONS[0];
    const q2 = SECTION_A_QUESTIONS[1];
    const q3 = SECTION_A_QUESTIONS[2];

    expect(formatUserAnswer(q1, 28)).toBe("28 years old");
    expect(formatUserAnswer(q2, "Less than 6 months")).toBe("Less than 6 months");
    expect(
      formatUserAnswer(q3, ["Father had hair loss", "Siblings with thinning or baldness"])
    ).toBe("Father had hair loss, Siblings with thinning or baldness");
  });

  it("resets state back to clean welcome state", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 30);
    state = resetEngineState();

    expect(state.phase).toBe("welcome");
    expect(state.answeredQuestionIds.length).toBe(0);
    expect(Object.keys(state.formData).length).toBe(0);
    expect(state.messages.length).toBe(1);
  });
});
