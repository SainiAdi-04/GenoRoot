import { getTriageProvider } from "@/lib/triageService";
import { IntakeFormData } from "@/types/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Support both direct completed form JSON and wrapped { formData: ... }
    const candidateData =
      body.formData && typeof body.formData === "object" ? body.formData : body;
    const providerName =
      typeof body.provider === "string" ? body.provider : undefined;

    if (!candidateData || typeof candidateData !== "object" || Object.keys(candidateData).length === 0) {
      return Response.json(
        { success: false, error: "Missing or invalid formData / completed form JSON in request body" },
        { status: 400 }
      );
    }


    // Clean any envelope keys if body was passed directly
    const { provider, ...formData } = candidateData as IntakeFormData & { provider?: string };

    const triageProvider = getTriageProvider(providerName || provider);
    const triage = await triageProvider.generateTriage(formData);

    return Response.json({
      success: true,
      triage,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Internal error generating doctor triage";
    console.error("Error in /api/triage:", err);
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
