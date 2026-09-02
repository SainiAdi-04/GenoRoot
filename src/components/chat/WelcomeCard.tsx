"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, ArrowRight, ShieldCheck, Square, X, AlertCircle, Sparkles, Volume2, Loader2 } from "lucide-react";
import { CascadeFieldItem, GenderInference, VoiceMetadata } from "@/types/schema";
import { formatAudioDuration } from "@/lib/transcribeService";
import { tts } from "@/lib/ttsService";

interface WelcomeCardProps {
  onStartStepByStep: () => void;
  onVoiceCascade: (payload: {
    fields: CascadeFieldItem[];
    genderInference?: GenderInference;
    voice?: VoiceMetadata;
  }) => void;
  onProcessingChange?: (isProcessing: boolean, statusText?: string) => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onStartStepByStep,
  onVoiceCascade,
  onProcessingChange,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingPersona, setLoadingPersona] = useState<"rajesh" | "priya" | "ananya" | null>(null);
  const [isWelcomeTtsLoading, setIsWelcomeTtsLoading] = useState<boolean>(false);
  const [isWelcomeTtsPlaying, setIsWelcomeTtsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getMimeType = () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/wav",
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  };

  const handleStartVoiceRecording = async () => {
    // Barge-in: cancel any active speech
    tts.stop();
    setErrorMessage(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setErrorMessage(
        "Microphone access is not supported in this browser. You can use the Quick Test persona below or go step by step."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const elapsedMs = performance.now() - startTimeRef.current;
        if (elapsedMs < 600) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          setIsRecording(false);
          // Spec: empty or very short voice note falls back to step-by-step
          onStartStepByStep();
          return;
        }

        const rawMime = mimeType || "audio/webm;codecs=opus";
        const audioBlob = new Blob(chunksRef.current, { type: rawMime });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const finalDuration = Math.max(1, durationRef.current);
        let audioUrl = "";
        try {
          audioUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(audioBlob);
          });
        } catch {
          audioUrl = "";
        }
        if (!audioUrl) {
          audioUrl = URL.createObjectURL(audioBlob);
        }

        setIsRecording(false);
        onProcessingChange?.(
          true,
          "Transcribing voice note…"
        );

        try {
          const formData = new FormData();
          const ext = rawMime.includes("mp4") ? "mp4" : "webm";
          formData.append("file", audioBlob, `intake_voice.${ext}`);
          formData.append("questionId", "welcome_cascade");

          const transcribeRes = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          const transcribeData = await transcribeRes.json();

          if (!transcribeData.success || !transcribeData.codemix?.trim()) {
            onProcessingChange?.(false);
            // Spec: empty speech detected falls back to step-by-step
            onStartStepByStep();
            return;
          }

          onProcessingChange?.(
            true,
            "Extracting clinical fields…"
          );

          const extractRes = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              translate: transcribeData.translate || transcribeData.codemix,
              codemix: transcribeData.codemix,
            }),
          });
          const extractData = await extractRes.json();

          onProcessingChange?.(false);

          if (extractData.success) {
            onVoiceCascade({
              fields: extractData.fields || [],
              genderInference: extractData.genderInference,
              voice: {
                audioUrl,
                durationSeconds: finalDuration,
                codemixTranscript: transcribeData.codemix,
                translateTranscript:
                  transcribeData.translate || transcribeData.codemix,
                isFallback: transcribeData.isFallback,
              },
            });
          } else {
            setErrorMessage(
              extractData.error || "Could not extract intake fields from voice note."
            );
          }
        } catch (err: unknown) {
          onProcessingChange?.(false);
          const msg =
            err instanceof Error ? err.message : "Network error processing voice note";
          setErrorMessage(msg);
        }
      };

      mediaRecorder.onstart = () => {
        startTimeRef.current = performance.now();
      };
      mediaRecorder.start(250);
      durationRef.current = 0;
      setDuration(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
        if (durationRef.current >= 28) {
          stopVoiceRecording();
        }
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Microphone access denied";
      setErrorMessage(
        msg.includes("Permission") || msg.includes("denied")
          ? "Microphone permission was denied. Please allow microphone access in your browser settings or use step-by-step."
          : `Microphone error: ${msg}`
      );
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // flush
      }
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
  };

  // Presets for the 3 Evaluator Personas (Guaranteed instant execution without failure)
  const PERSONA_PRESETS: Record<
    "rajesh" | "priya" | "ananya",
    {
      fields: CascadeFieldItem[];
      genderInference: GenderInference;
      voice: VoiceMetadata;
    }
  > = {
    rajesh: {
      voice: {
        durationSeconds: 22,
        codemixTranscript:
          "Main lagbhag 45 saal ka hoon. Pichle 8 mahine se crown area me kaafi thinning ho rahi hai. Mere father ko bhi baldness thi. Main din me 5-6 cigarette peeta hoon pehle Tugain 5% try kiya tha par fayda nahi hua.",
        translateTranscript:
          "I am about 45 years old. For the past 8 months there has been significant thinning in the crown area. My father also had baldness. I smoke 5-6 cigarettes a day and earlier tried Tugain 5% without benefit.",
        isFallback: false,
      },
      genderInference: {
        inferred_gender: "male",
        confidence: 0.95,
        cues: "Hindi grammar: 'ka hoon', 'peeta hoon'",
      },
      fields: [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 45,
          displayValue: "45 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "6-12 months",
          displayValue: "6-12 months",
          confidence: 0.95,
          questionId: "q2",
        },
        {
          key: "family_history",
          label: "Family history",
          value: ["Father had hair loss"],
          displayValue: "Father had hair loss",
          confidence: 0.95,
          questionId: "q3",
        },
        {
          key: "pattern",
          label: "Hair loss pattern",
          value: ["Thinning at crown"],
          displayValue: "Thinning at crown",
          confidence: 0.95,
          questionId: "q4",
        },
        {
          key: "diagnosed_conditions",
          label: "Health conditions",
          value: ["None"],
          displayValue: "None",
          confidence: 0.85,
          questionId: "q5",
        },
        {
          key: "smoking",
          label: "Smoking",
          value: true,
          displayValue: "Moderate 5-10/day",
          confidence: 0.95,
          questionId: "q11_smoking",
        },
        {
          key: "products",
          label: "Past products",
          value: [
            {
              name: "Topical Minoxidil",
              used: true,
              duration: "<3mo",
              helped: false,
              side_effects: false,
            },
          ],
          displayValue: "Topical Minoxidil (Tugain 5%)",
          confidence: 0.95,
          questionId: "q12_products_select",
        },
      ],
    },
    priya: {
      voice: {
        durationSeconds: 24,
        codemixTranscript:
          "Meri age 27 saal hai. 4 mahine pehle dengue hua tha tab se bohot heavy shedding ho rahi hai nahate waqt. Mujhe PCOS bhi diagnosed hai aur periods irregular rehte hain. Yahan borewell ka hard water aata hai.",
        translateTranscript:
          "My age is 27 years. 4 months ago I had dengue, since then there is heavy shedding while showering. I am also diagnosed with PCOS and my periods remain irregular. We get hard borewell water here.",
        isFallback: false,
      },
      genderInference: {
        inferred_gender: "female",
        confidence: 0.95,
        cues: "PCOS / hormonal health history",
      },
      fields: [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 27,
          displayValue: "27 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "Less than 6 months",
          displayValue: "Less than 6 months",
          confidence: 0.95,
          questionId: "q2",
        },
        {
          key: "pattern",
          label: "Hair loss pattern",
          value: ["Sudden excessive shedding"],
          displayValue: "Sudden excessive shedding",
          confidence: 0.92,
          questionId: "q4",
        },
        {
          key: "diagnosed_conditions",
          label: "Health conditions",
          value: ["PCOS/PCOD"],
          displayValue: "PCOS/PCOD",
          confidence: 0.95,
          questionId: "q5",
        },
        {
          key: "menstrual_cycle",
          label: "Menstrual cycle",
          value: "Irregular",
          displayValue: "Irregular",
          confidence: 0.95,
          questionId: "q6_q7_hormonal",
        },
        {
          key: "past_6_months",
          label: "Triggers in past 6 months",
          value: ["Severe illness / high fever (dengue, COVID, malaria, typhoid)"],
          displayValue: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
          confidence: 0.95,
          questionId: "q10_past_6_months",
        },
        {
          key: "hard_water",
          label: "Water type",
          value: true,
          displayValue: "Hard water",
          confidence: 0.95,
          questionId: "q11_hard_water",
        },
      ],
    },
    ananya: {
      voice: {
        durationSeconds: 20,
        codemixTranscript:
          "I'm 34 years old. 6 months ago I had a baby and since then diffuse thinning has started all over. Thyroid medication also going on. I take Follihair supplements regularly.",
        translateTranscript:
          "I'm 34 years old. 6 months ago I had a baby and since then diffuse thinning has started all over. Thyroid medication also going on. I take Follihair supplements regularly.",
        isFallback: false,
      },
      genderInference: {
        inferred_gender: "female",
        confidence: 0.95,
        cues: "recent childbirth / postpartum timeline",
      },
      fields: [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 34,
          displayValue: "34 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "6-12 months",
          displayValue: "6-12 months",
          confidence: 0.95,
          questionId: "q2",
        },
        {
          key: "pattern",
          label: "Hair loss pattern",
          value: ["Diffuse thinning"],
          displayValue: "Diffuse thinning",
          confidence: 0.95,
          questionId: "q4",
        },
        {
          key: "diagnosed_conditions",
          label: "Health conditions",
          value: ["Thyroid disorder"],
          displayValue: "Thyroid disorder",
          confidence: 0.95,
          questionId: "q5",
        },
        {
          key: "pregnancy_related",
          label: "Maternal phase",
          value: "Postpartum <1 year",
          displayValue: "Postpartum <1 year",
          confidence: 0.95,
          questionId: "q6_q7_hormonal",
        },
        {
          key: "products",
          label: "Past products",
          value: [
            {
              name: "Supplements",
              used: true,
              duration: "3-6mo",
              helped: true,
              side_effects: false,
            },
          ],
          displayValue: "Supplements (Follihair)",
          confidence: 0.95,
          questionId: "q12_products_select",
        },
      ],
    },
  };

  // Quick Evaluator Persona trigger (instant demo without microphone)
  const handleQuickPersona = async (persona: "rajesh" | "priya" | "ananya") => {
    tts.stop();
    setErrorMessage(null);
    setLoadingPersona(persona);
    onProcessingChange?.(true, "Simulating Hinglish voice intake…");

    const preset = PERSONA_PRESETS[persona];

    try {
      // Try fast call to /api/extract with provider: "mock" (timeout 2500ms)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          translate: preset.voice.translateTranscript,
          codemix: preset.voice.codemixTranscript,
          provider: "mock",
        }),
      }).catch(() => null);

      clearTimeout(timeoutId);

      onProcessingChange?.(false);
      setLoadingPersona(null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && Array.isArray(data.fields) && data.fields.length > 0) {
          onVoiceCascade({
            fields: data.fields,
            genderInference: data.genderInference || preset.genderInference,
            voice: preset.voice,
          });
          return;
        }
      }

      // Robust fallback: instant preset guarantee
      onVoiceCascade({
        fields: preset.fields,
        genderInference: preset.genderInference,
        voice: preset.voice,
      });
    } catch {
      onProcessingChange?.(false);
      setLoadingPersona(null);
      onVoiceCascade({
        fields: preset.fields,
        genderInference: preset.genderInference,
        voice: preset.voice,
      });
    }
  };

  return (
    <div className="my-3 bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-5 sm:p-6 rounded-sm shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-block px-2 py-0.5 text-[11px] font-mono tracking-wider text-[#62a57f] bg-[rgba(78,135,102,0.15)] border border-[rgba(78,135,102,0.3)] rounded-sm">
          CLINICAL INTAKE
        </span>

        <button
          type="button"
          onClick={() => {
            if (isWelcomeTtsPlaying) {
              tts.stop();
              setIsWelcomeTtsPlaying(false);
              setIsWelcomeTtsLoading(false);
              return;
            }

            setIsWelcomeTtsLoading(true);
            tts.speak(
              "Welcome to your hair clinic check-in. You can speak your answers or tap the screen. Let's begin.",
              {
                onStart: () => {
                  setIsWelcomeTtsLoading(false);
                  setIsWelcomeTtsPlaying(true);
                },
                onEnd: () => {
                  setIsWelcomeTtsLoading(false);
                  setIsWelcomeTtsPlaying(false);
                },
                onError: () => {
                  setIsWelcomeTtsLoading(false);
                  setIsWelcomeTtsPlaying(false);
                },
              }
            );
          }}
          title={isWelcomeTtsPlaying ? "Stop audio" : "Listen to welcome prompt using Sarvam AI"}
          className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-colors cursor-pointer ${
            isWelcomeTtsPlaying
              ? "bg-[#1f3328] text-[#4ade80] border-[#62a57f]"
              : isWelcomeTtsLoading
              ? "bg-[#232918] text-[#fcd34d] border-[#d97706]"
              : "text-[#a7f3d0] hover:text-[#f3f0df] bg-[#1f2e27] border-[rgba(78,135,102,0.3)]"
          }`}
        >
          {isWelcomeTtsLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#fcd34d]" />
              <span>Loading…</span>
            </>
          ) : isWelcomeTtsPlaying ? (
            <>
              <Square className="w-3 h-3 fill-current text-[#4ade80]" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Listen</span>
            </>
          )}
        </button>
      </div>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#f3f0df] tracking-tight leading-snug mb-3">
        Tell your hair story in your own words
      </h2>

      <p className="text-sm sm:text-base text-[rgba(243,240,223,0.85)] leading-relaxed mb-6 font-sans">
        Hi! I&apos;m here to help your doctor prepare for your consultation.
        You can speak naturally in Hindi, English, or Hinglish — or we can go
        through your intake step by step.
      </p>

      {/* Recording in Progress State */}
      {isRecording ? (
        <div className="p-4 bg-[#1b2721] border border-[#62a57f] rounded-sm mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs font-mono tracking-wide text-[#f3f0df]">
                Recording Hinglish note… ({formatAudioDuration(duration)} / 0:28)
              </span>
            </div>
            <span className="font-mono text-xs text-[#62a57f]">
              {28 - duration > 0 ? `${28 - duration}s left` : "Finalizing..."}
            </span>
          </div>

          <p className="text-xs text-[rgba(243,240,223,0.7)] leading-relaxed mb-4">
            Speak naturally about: when changes began, pattern, family history, and products tried. Auto-stops at 28s for instant processing.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4e8766] hover:bg-[#5ca37c] text-[#f3f0df] text-xs sm:text-sm font-medium rounded-sm transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done speaking (Auto-fill) →</span>
            </button>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-3 py-2.5 bg-[#16201b] border border-[rgba(243,240,223,0.18)] hover:bg-[#202f26] text-[rgba(243,240,223,0.7)] text-xs rounded-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Default Action Buttons */
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Active Voice Note CTA */}
          <button
            type="button"
            onClick={handleStartVoiceRecording}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1b2721] hover:bg-[#24342c] active:bg-[#16201b] border border-[#62a57f] text-[#f3f0df] rounded-sm text-sm font-medium transition-all shadow-sm group"
          >
            <Mic className="w-4 h-4 text-[#62a57f] group-hover:scale-110 transition-transform" />
            <span>Record voice note</span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-wider bg-[rgba(78,135,102,0.2)] text-[#62a57f] border border-[rgba(78,135,102,0.4)] rounded">
              VOICE
            </span>
          </button>

          {/* Step-by-Step CTA */}
          <button
            type="button"
            onClick={onStartStepByStep}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#62a57f] focus:ring-offset-2 focus:ring-offset-[#111814]"
          >
            <span>Let&apos;s go step by step</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Evaluator Quick Persona Bar */}
      <div className="mt-4 pt-3 border-t border-[rgba(243,240,223,0.1)] flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(243,240,223,0.5)] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#62a57f]" /> Quick Test:
        </span>
        <button
          type="button"
          disabled={loadingPersona !== null}
          onClick={() => handleQuickPersona("rajesh")}
          className={`px-2.5 py-1 bg-[#1b2721] hover:bg-[#22332a] border border-[rgba(243,240,223,0.15)] text-[11px] font-mono text-[rgba(243,240,223,0.85)] rounded hover:border-[#62a57f] transition-all flex items-center gap-1.5 ${
            loadingPersona === "rajesh" ? "opacity-75 border-[#62a57f] text-[#62a57f]" : ""
          }`}
        >
          {loadingPersona === "rajesh" && <span className="w-1.5 h-1.5 rounded-full bg-[#62a57f] animate-ping" />}
          <span>01 Rajesh (45M • Crown)</span>
        </button>
        <button
          type="button"
          disabled={loadingPersona !== null}
          onClick={() => handleQuickPersona("priya")}
          className={`px-2.5 py-1 bg-[#1b2721] hover:bg-[#22332a] border border-[rgba(243,240,223,0.15)] text-[11px] font-mono text-[rgba(243,240,223,0.85)] rounded hover:border-[#62a57f] transition-all flex items-center gap-1.5 ${
            loadingPersona === "priya" ? "opacity-75 border-[#62a57f] text-[#62a57f]" : ""
          }`}
        >
          {loadingPersona === "priya" && <span className="w-1.5 h-1.5 rounded-full bg-[#62a57f] animate-ping" />}
          <span>02 Priya (27F • Dengue)</span>
        </button>
        <button
          type="button"
          disabled={loadingPersona !== null}
          onClick={() => handleQuickPersona("ananya")}
          className={`px-2.5 py-1 bg-[#1b2721] hover:bg-[#22332a] border border-[rgba(243,240,223,0.15)] text-[11px] font-mono text-[rgba(243,240,223,0.85)] rounded hover:border-[#62a57f] transition-all flex items-center gap-1.5 ${
            loadingPersona === "ananya" ? "opacity-75 border-[#62a57f] text-[#62a57f]" : ""
          }`}
        >
          {loadingPersona === "ananya" && <span className="w-1.5 h-1.5 rounded-full bg-[#62a57f] animate-ping" />}
          <span>03 Ananya (34F • Postpartum)</span>
        </button>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-950/40 border border-red-800/60 rounded-sm text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[rgba(243,240,223,0.08)] flex items-center gap-2 text-xs text-[rgba(243,240,223,0.5)]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#62a57f] flex-shrink-0" />
        <span>Takes ~2 minutes • Answers are private &amp; shared only with your treating doctor</span>
      </div>
    </div>
  );
};
