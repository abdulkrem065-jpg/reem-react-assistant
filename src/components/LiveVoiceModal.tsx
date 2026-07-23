import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Sparkles, Volume2, Radio, X, Bot } from "lucide-react";

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt?: string;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");
  const [statusText, setStatusText] = useState<string>("جاري تحضير الاتصال...");

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStatusText("جاري الاتصال بـ Gemini Live (gemini-3.1-flash-live-preview)...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // AudioContext for 16kHz microphone capture
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = inputCtx;

      // AudioContext for 24kHz output playback
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      // Setup WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setStatusText("متصل مباشر! تحدث مع ريم الآن...");

        // Start capture script processor
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptNodeRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (isMuted) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const base64PCM = float32To16BitPCMBase64(inputData);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ audio: base64PCM }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio && outputAudioCtxRef.current) {
            setStatusText("ريم تتحدث الآن...");
            playPCM24kChunk(outputAudioCtxRef.current, msg.audio);
          }
          if (msg.text) {
            setAiText((prev) => prev + " " + msg.text);
          }
          if (msg.error) {
            setError(msg.error);
          }
        } catch (err) {
          console.error("Error handling live message:", err);
        }
      };

      ws.onerror = (e) => {
        console.error("Live WebSocket error:", e);
        setError("تعذر الاتصال بخادم المحادثة الصوتية الحية.");
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setStatusText("تم إنهاء الجلسة الصوتية.");
      };
    } catch (err: any) {
      console.error("Start live error:", err);
      setError(err.message || "فشل الوصول للميكروفون أو الاتصال بالخادم.");
      setIsConnecting(false);
    }
  };

  const stopLiveSession = () => {
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  const float32To16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playPCM24kChunk = (ctx: AudioContext, base64PCM: string) => {
    try {
      const binary = atob(base64PCM);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (err) {
      console.error("PCM playback error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                محادثة صوتية حية مع ريم
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Live API
                </span>
              </h3>
              <p className="text-xs text-slate-400">gemini-3.1-flash-live-preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-center">
          {/* Avatar & Wave Animation */}
          <div className="relative py-4 flex flex-col items-center justify-center">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
              isConnected
                ? "bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-400 shadow-2xl shadow-emerald-500/30 scale-105"
                : isConnecting
                ? "bg-slate-800 border-amber-500/50 animate-pulse"
                : "bg-slate-800 border-slate-700"
            }`}>
              <Bot className="w-14 h-14 text-white" />
            </div>

            {/* Audio Wave animation bars when connected */}
            {isConnected && (
              <div className="flex items-center gap-1.5 h-8 mt-6">
                <span className="w-1 bg-emerald-400 rounded-full h-4 animate-bounce"></span>
                <span className="w-1 bg-emerald-300 rounded-full h-7 animate-bounce delay-100"></span>
                <span className="w-1 bg-emerald-500 rounded-full h-5 animate-bounce delay-200"></span>
                <span className="w-1 bg-teal-300 rounded-full h-8 animate-bounce delay-75"></span>
                <span className="w-1 bg-emerald-400 rounded-full h-3 animate-bounce"></span>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{statusText}</span>
            </div>
            {aiText && (
              <p className="text-slate-200 text-sm dir-rtl mt-2 line-clamp-3 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                "{aiText.trim()}"
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl text-xs">
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={!isConnected}
              className={`p-4 rounded-full border transition-all ${
                isMuted
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              }`}
              title={isMuted ? "إلغاء كتم الميكروفون" : "كتم الميكروفون"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={onClose}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-lg shadow-red-600/30 transition-all flex items-center justify-center"
              title="إنهاء المكالمة"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 text-center text-[11px] text-slate-500 border-t border-slate-800">
          تواصل بصوتك مباشرة عبر محرك Gemini Live API بدون انتظار
        </div>
      </div>
    </div>
  );
};
