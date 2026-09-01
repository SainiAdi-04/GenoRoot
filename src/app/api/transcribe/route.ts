import { processAudioTranscription } from "@/lib/transcribeService";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const questionId = (formData.get("questionId") as string) || "";

    if (!file || file.size === 0) {
      return Response.json(
        { success: false, error: "No audio file provided or file is empty" },
        { status: 400 }
      );
    }

    const result = await processAudioTranscription(file, {
      questionId,
    });

    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal transcription error";
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
