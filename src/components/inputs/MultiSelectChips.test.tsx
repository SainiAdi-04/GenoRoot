import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MultiSelectChips } from "./MultiSelectChips";
import { ALL_QUESTIONS } from "@/data/questions";

describe("MultiSelectChips styling & responsive layout", () => {
  const q12 = ALL_QUESTIONS.find((q) => q.id === "q12_products_select")!;

  it("renders option descriptions when available for clinical clarity", () => {
    const html = renderToString(
      React.createElement(MultiSelectChips, {
        question: q12,
        onConfirm: () => {},
      })
    );

    // Q12 options have descriptions like "Ketoconazole, Scalpe-Pro, Selsun, Salicylic"
    // and "Redensyl, Procapil, Rosemary, Ayurvedic oils". These must be rendered for patient clarity.
    expect(html).toContain("Ketoconazole, Scalpe-Pro, Selsun, Salicylic");
    expect(html).toContain("Redensyl, Procapil, Rosemary, Ayurvedic oils");
    expect(html).toContain("Prescription oral medications");
  });

  it("uses a responsive grid layout for options with descriptions instead of ragged flex-wrap", () => {
    const html = renderToString(
      React.createElement(MultiSelectChips, {
        question: q12,
        onConfirm: () => {},
      })
    );

    // Options must use a responsive grid (grid-cols-1 on mobile, sm:grid-cols-2 on laptop)
    // to prevent ragged arbitrary-width pills that leave large blank areas on laptop screens.
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("sm:grid-cols-2");
  });

  it("provides balanced layout in Indian Brand Resolver so text input is not squashed by voice button", () => {
    const html = renderToString(
      React.createElement(MultiSelectChips, {
        question: q12,
        onConfirm: () => {},
      })
    );

    // The resolver should not cram an unconstrained shrink-0 voice button into a single flex row
    // with a flex-1 input, which squashes the input on laptop screens.
    // Instead, it should use a balanced responsive grid or balanced layout.
    expect(html).not.toContain("flex flex-col sm:flex-row items-stretch gap-2");
  });

  it("exclusive option ('None') spans full width or is clearly differentiated in the grid", () => {
    const html = renderToString(
      React.createElement(MultiSelectChips, {
        question: q12,
        onConfirm: () => {},
      })
    );

    // The exclusive 'None' option should span both columns on tablet/laptop (sm:col-span-2)
    // so it doesn't leave an odd orphan card on the second column.
    expect(html).toContain("sm:col-span-2");
  });

  it("does not truncate option labels so long text is fully visible on both phone and laptop", () => {
    const q4 = ALL_QUESTIONS.find((q) => q.id === "q4")!;
    const html = renderToString(
      React.createElement(MultiSelectChips, {
        question: q4,
        onConfirm: () => {},
      })
    );

    // Option labels should NOT have 'truncate' class which cuts off text with ellipsis
    expect(html).not.toContain("truncate");
    // Long options should be wrapped and fully rendered
    expect(html).toContain("Widening center parting (hair gap spreading down the middle)");
    expect(html).toContain("Sudden excessive shedding (clumps in the shower or brush)");
  });
});
