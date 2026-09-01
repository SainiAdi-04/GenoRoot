import {
  filterHighConfidenceFields,
  getExtractionProvider,
  toExtractedFieldItems,
} from "@/lib/extractService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const translate = typeof body.translate === "string" ? body.translate.trim() : "";
    const codemix = typeof body.codemix === "string" ? body.codemix.trim() : "";
    const providerName = typeof body.provider === "string" ? body.provider : undefined;

    if (!translate && !codemix) {
      return Response.json(
        { success: false, error: "No transcript provided for extraction" },
        { status: 400 }
      );
    }

    const provider = getExtractionProvider(providerName);
    const extraction = await provider.extract(translate || codemix, {
      rawCodemix: codemix,
    });

    const allItems = toExtractedFieldItems(extraction);
    const highConfidenceFields = filterHighConfidenceFields(allItems, 0.7);

    return Response.json({
      success: true,
      extraction,
      fields: highConfidenceFields,
      genderInference: extraction.gender_inference,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal extraction error";
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
