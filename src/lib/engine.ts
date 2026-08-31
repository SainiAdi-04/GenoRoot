import { ALL_QUESTIONS, WELCOME_MESSAGE } from "@/data/questions";
import {
  ChatMessage,
  EngineState,
  IntakeFormData,
  QuestionConfig,
} from "@/types/schema";

export function createInitialEngineState(): EngineState {
  const welcomeMsg: ChatMessage = {
    id: "msg_welcome",
    sender: "bot",
    content: WELCOME_MESSAGE.text,
    timestamp: Date.now(),
  };

  return {
    phase: "welcome",
    currentQuestionIndex: 0,
    answeredQuestionIds: [],
    formData: {},
    messages: [welcomeMsg],
    inferredSex: null,
  };
}

export function getCurrentQuestion(
  state: EngineState,
  questions: QuestionConfig[] = ALL_QUESTIONS
): QuestionConfig | null {
  if (state.phase !== "in_progress") {
    return null;
  }
  if (state.currentQuestionIndex >= questions.length) {
    return null;
  }
  return questions[state.currentQuestionIndex];
}

export function formatUserAnswer(
  question: QuestionConfig,
  answerValue: unknown
): string {
  if (answerValue === null || answerValue === undefined) {
    return "Skipped";
  }

  if (question.type === "number") {
    const num = Number(answerValue);
    if (question.unit) {
      return `${num} ${question.unit}`;
    }
    return `${num}`;
  }

  if (Array.isArray(answerValue)) {
    if (answerValue.length === 0) return "None";
    return answerValue.join(", ");
  }

  if (typeof answerValue === "boolean") {
    return answerValue ? "Yes" : "No";
  }

  return String(answerValue);
}

export function startStepByStep(
  state: EngineState,
  questions: QuestionConfig[] = ALL_QUESTIONS
): EngineState {
  const firstQ = questions[0];
  if (!firstQ) return state;

  const firstQMsg: ChatMessage = {
    id: `msg_q_${firstQ.id}`,
    sender: "bot",
    content: firstQ.prompt,
    timestamp: Date.now(),
    questionId: firstQ.id,
  };

  return {
    ...state,
    phase: "in_progress",
    currentQuestionIndex: 0,
    messages: [...state.messages, firstQMsg],
  };
}

export function answerCurrentQuestion(
  state: EngineState,
  answerValue: unknown,
  questions: QuestionConfig[] = ALL_QUESTIONS
): EngineState {
  const currentQ = getCurrentQuestion(state, questions);
  if (!currentQ) return state;

  // Record into formData
  const updatedFormData: IntakeFormData = {
    ...state.formData,
    [currentQ.key]: answerValue,
  };

  const userMsgText = formatUserAnswer(currentQ, answerValue);
  const userMsg: ChatMessage = {
    id: `msg_user_${currentQ.id}_${Date.now()}`,
    sender: "user",
    content: userMsgText,
    timestamp: Date.now(),
    questionId: currentQ.id,
  };

  const updatedAnsweredIds = state.answeredQuestionIds.includes(currentQ.id)
    ? state.answeredQuestionIds
    : [...state.answeredQuestionIds, currentQ.id];

  const nextIndex = state.currentQuestionIndex + 1;
  const newMessages = [...state.messages, userMsg];

  if (nextIndex < questions.length) {
    const nextQ = questions[nextIndex];
    const nextQMsg: ChatMessage = {
      id: `msg_q_${nextQ.id}_${Date.now()}`,
      sender: "bot",
      content: nextQ.prompt,
      timestamp: Date.now() + 1,
      questionId: nextQ.id,
    };
    newMessages.push(nextQMsg);

    return {
      ...state,
      currentQuestionIndex: nextIndex,
      answeredQuestionIds: updatedAnsweredIds,
      formData: updatedFormData,
      messages: newMessages,
    };
  }

  // All questions answered
  const reviewMsg: ChatMessage = {
    id: `msg_review_${Date.now()}`,
    sender: "bot",
    content:
      "✓ Section A is complete! Review your answers below or tap to edit any field before moving forward.",
    timestamp: Date.now() + 1,
    isTransition: true,
  };
  newMessages.push(reviewMsg);

  return {
    ...state,
    phase: "review",
    currentQuestionIndex: nextIndex,
    answeredQuestionIds: updatedAnsweredIds,
    formData: updatedFormData,
    messages: newMessages,
  };
}

export function resetEngineState(): EngineState {
  return createInitialEngineState();
}
