import { describe, expect, it, beforeEach } from "bun:test";
import { saveStateToStorage, loadStateFromStorage, clearStateStorage } from "./storage";
import { createInitialEngineState } from "./engine";

describe("Storage module", () => {
  beforeEach(() => {
    // Mock global window and localStorage
    const store: Record<string, string> = {};
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => {
          store[key] = val;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
      },
    };
  });

  it("saves and loads engine state from localStorage", () => {
    const initialState = createInitialEngineState();
    initialState.formData.age_hair_loss_began = 24;

    saveStateToStorage(initialState);
    const loaded = loadStateFromStorage();

    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe("welcome");
    expect(loaded?.formData.age_hair_loss_began).toBe(24);
  });

  it("clears engine state from localStorage", () => {
    const initialState = createInitialEngineState();
    saveStateToStorage(initialState);
    expect(loadStateFromStorage()).not.toBeNull();

    clearStateStorage();
    expect(loadStateFromStorage()).toBeNull();
  });
});
