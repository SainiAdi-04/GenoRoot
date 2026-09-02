import { synthesizeSpeech } from "@/lib/sarvamTtsService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, speaker, languageCode, pace } = body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json(
        { success: false, error: "Text is required for TTS synthesis" },
        { status: 400 }
      );
    }

    const result = await synthesizeSpeech({
      text,
      speaker,
      languageCode,
      pace,
    });

    return Response.json(result, {
      status: result.success ? 200 : (result.isFallback ? 200 : 500),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal TTS synthesis error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
