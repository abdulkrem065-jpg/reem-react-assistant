import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Search,
  MapPin,
  Sparkles,
  Volume2,
  Radio,
  Globe,
  Navigation,
  Bot,
  User,
  Trash2,
  Settings2,
  Cpu,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { LiveVoiceModal } from "./LiveVoiceModal";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  groundingSources?: Array<{ title: string; uri: string; type: string }>;
  timestamp: string;
}

interface GeminiChatbotProps {
  companyConfig?: any;
  knowledgeBase?: any;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ companyConfig, knowledgeBase }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "model",
      text: `أهلاً بك! أنا ريم، المساعدة الذكية المدعومة بنماذج Gemini. كيف يمكنني مساعدتك اليوم في الاستفسار عن الخدمات، العروض، الأماكن أو أي موضوع آخر؟`,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [botRole, setBotRole] = useState("reem");
  const [customRolePrompt, setCustomRolePrompt] = useState("");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle Search vs Maps grounding mutual exclusion
  const toggleSearch = () => {
    setUseSearch(!useSearch);
    if (!useSearch) setUseMaps(false);
  };

  const toggleMaps = () => {
    setUseMaps(!useMaps);
    if (!useMaps) setUseSearch(false);
  };

  const getSystemInstruction = () => {
    if (botRole === "marketing") {
      return "أنت مستشار تسويق رقمي وإعلانات احترافي. تقدم نصائح استراتيجية للتسويق وزيادة المبيعات.";
    }
    if (botRole === "tech") {
      return "أنت مهندس دعم فني وتطوير برمجيات خبير. تجيب على الأسئلة التقنية وحلول المشكلات بوضوح ودقة.";
    }
    if (botRole === "custom" && customRolePrompt) {
      return customRolePrompt;
    }
    return `أنت "ريم"، مساعدة ذكاء اصطناعي ذكية ومحترفة لشركة ${companyConfig?.name || "الشركة"}. تجيب على استفسارات العملاء بدقة ولطف باللغة العربية.`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          companyConfig,
          knowledgeBase,
          selectedModel,
          useSearch,
          useMaps,
          customSystemInstruction: getSystemInstruction(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء معالجة الرد");
      }

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        text: data.text || "عذراً، لم أستطع الحصول على رد مناسب.",
        groundingSources: data.groundingSources || [],
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: "model",
        text: `⚠️ عذراً، تعذر الاتصال بـ Gemini: ${err.message || "خطأ غير متوقع"}`,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTTS = async (msgId: string, text: string) => {
    try {
      setPlayingAudioId(msgId);
      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName: "Kore" }),
      });

      const data = await res.json();
      if (res.ok && data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.play();
        audio.onended = () => setPlayingAudioId(null);
      } else {
        // Fallback to SpeechSynthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ar-SA";
        utterance.onend = () => setPlayingAudioId(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("TTS play error:", err);
      setPlayingAudioId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px] relative">
      {/* Top Header Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Gemini Chatbot المطور
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Grounding & Live Voice
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              دعم التحدث التفاعلي والربط المباشر مع بيانات جوجل والخرائط
            </p>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Model Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="gemini-3.6-flash">gemini-3.6-flash (عام)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (معقد)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (سريع)</option>
            </select>
          </div>

          {/* Role selector */}
          <select
            value={botRole}
            onChange={(e) => setBotRole(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl focus:outline-hidden shadow-xs"
          >
            <option value="reem">دور: ريم المساعدة الذكية</option>
            <option value="marketing">دور: مستشار تسويقي</option>
            <option value="tech">دور: دعم فني وتطوير</option>
            <option value="custom">دور مخصص...</option>
          </select>

          {/* Live Voice Assistant Button */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all text-xs"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>محادثة صوتية حية (Live API)</span>
          </button>

          {/* Clear Thread */}
          <button
            onClick={() => {
              if (window.confirm("مسح المحادثة الحالية؟")) {
                setMessages([]);
              }
            }}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="مسح السجل"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Role Input field if selected */}
      {botRole === "custom" && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs">
          <Settings2 className="w-4 h-4 text-amber-600" />
          <input
            type="text"
            value={customRolePrompt}
            onChange={(e) => setCustomRolePrompt(e.target.value)}
            placeholder="أدخل الدور والتعليمات الخاصة بروبوت الشات هنا..."
            className="flex-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 px-3 py-1 rounded-lg text-xs"
          />
        </div>
      )}

      {/* Chat Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-slate-800 text-white dark:bg-slate-700"
                  : "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[80%] space-y-1.5 ${msg.role === "user" ? "items-end text-end" : "items-start"}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none font-medium"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Grounding Sources Badges */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>المصادر والروابط المستخرجة من جوجل:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.groundingSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-medium transition-colors"
                        >
                          {src.type === "maps" ? <MapPin className="w-3 h-3 text-red-500" /> : <ExternalLink className="w-3 h-3 text-blue-500" />}
                          <span className="truncate max-w-[180px]">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Time & TTS Listen button */}
              <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                <span>{msg.timestamp}</span>
                {msg.role === "model" && (
                  <button
                    onClick={() => handleTTS(msg.id, msg.text)}
                    disabled={playingAudioId === msg.id}
                    className="hover:text-emerald-500 flex items-center gap-0.5 transition-colors font-medium"
                  >
                    <Volume2 className={`w-3 h-3 ${playingAudioId === msg.id ? "text-emerald-500 animate-pulse" : ""}`} />
                    <span>{playingAudioId === msg.id ? "جاري التشغيل..." : "استمع للصوت"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
              <span>Gemini يفكر ويصيغ الإجابة...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar & Grounding Toggles */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* Grounding Options Toolbar */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px]">ميزات الربط الحية:</span>

            {/* Google Search Grounding Switch */}
            <button
              onClick={toggleSearch}
              className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] border ${
                useSearch
                  ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
              title="تفعيل نتائج وبحث جوجل المباشر (Google Search Grounding)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث جوجل المباشر</span>
              {useSearch && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
            </button>

            {/* Google Maps Grounding Switch */}
            <button
              onClick={toggleMaps}
              className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] border ${
                useMaps
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
              title="تفعيل نتائج خرائط وأماكن جوجل المباشرة (Google Maps Grounding)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>خرائط جوجل</span>
              {useMaps && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
            </button>
          </div>

          <span className="text-[10px] text-slate-400 hidden sm:inline">
            النموذج النشط: <strong className="text-slate-600 dark:text-slate-300">{selectedModel}</strong>
          </span>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              useSearch
                ? "اكتب سؤالك للبحث المباشر في نتائج جوجل..."
                : useMaps
                ? "ابحث عن موقع، عنوان، أو معلم على خرائط جوجل..."
                : "اكتب رسالتك لريم..."
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال</span>
          </button>
        </div>
      </div>

      {/* Live Voice Conversation Modal */}
      <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} />
    </div>
  );
};
