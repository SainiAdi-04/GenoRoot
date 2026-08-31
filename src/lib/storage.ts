import { EngineState } from "@/types/schema";

export const STORAGE_KEY = "haiku-intake-state";

export function saveStateToStorage(state: EngineState): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.warn("Failed to persist intake state to localStorage:", error);
  }
}

export function loadStateFromStorage(): EngineState | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EngineState;
    if (parsed && typeof parsed === "object" && parsed.phase && parsed.formData) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to load intake state from localStorage:", error);
  }
  return null;
}

export function clearStateStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear intake state from localStorage:", error);
  }
}
