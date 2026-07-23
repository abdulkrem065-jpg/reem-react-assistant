import React, { useState } from "react";
import {
  MessageCircle,
  Sparkles,
  Bot,
  Shield,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  Lock,
  ArrowRight,
  Zap,
  CalendarCheck,
  Tag,
  Share2,
  ExternalLink,
} from "lucide-react";
import { GeminiChatbot } from "./GeminiChatbot";
import { CompanyConfig, KBItem } from "../types";

interface DemoViewProps {
  companyConfig: CompanyConfig;
  knowledgeBase: KBItem[];
  onGoToAdmin: () => void;
}

export const DemoView: React.FC<DemoViewProps> = ({
  companyConfig,
  knowledgeBase,
  onGoToAdmin,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareDemo = () => {
    const demoUrl = `${window.location.origin}/demo`;
    navigator.clipboard.writeText(demoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl selection:bg-emerald-500 selection:text-white">
      
      {/* TOP HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white p-2.5 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {companyConfig.name}
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                النسخة التجريبية الحية
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              اختبر المساعدة الذكية "ريم" واكتشف قدرتها على الرد التفاعلي 24/7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleShareDemo}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="مشاركة الرابط التجريبي"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{copiedLink ? "تم نسخ الرابط! 🎉" : "مشاركة الرابط"}</span>
          </button>

          <button
            onClick={onGoToAdmin}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>دخول لوحة التحكم (Admin)</span>
          </button>
        </div>
      </header>

      {/* HERO & DEMO MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        
        {/* HERO BANNER */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-2xl space-y-6">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 animate-bounce" />
              جاهزة للعمل السحابي 24/7 دون انقطاع
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              جرب المساعدة الذكية <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">"ريم"</span> مباشرة من المتصفح
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              هذه بيئة تجريبية حية ومفتوحة للعملاء لاختبار طريقة تفاعل "ريم"، المساعدة الذكية المدعومة بأحدث نماذج Gemini. يمكنك طرح أي سؤال عن خدمات الشركة، الأسعار، أو حجز مواعيد.
            </p>

            {/* Quick Feature Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2 text-slate-200">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>رد فوري 24/7 بدون توقف</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2 text-slate-200">
                <Tag className="w-4 h-4 text-teal-400 shrink-0" />
                <span>عروض أسعار تلقائية</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2 text-slate-200">
                <CalendarCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>جدولة المواعيد التفاعلية</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2 text-slate-200">
                <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                <span>نماذج Gemini الذكية</span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CHAT DEMO CONSOLE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Interactive Chat Window */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                نافذة المحادثة التفاعلية الحية
              </h3>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                متصل بالذكاء الاصطناعي
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-2 sm:p-4 shadow-xl">
              <GeminiChatbot companyConfig={companyConfig} knowledgeBase={knowledgeBase} />
            </div>
          </div>

          {/* Side Info & Knowledge Base Preview */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Knowledge Base Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-400" />
                قاعدة المعرفة والخدمات المقترحة
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                تعتمد "ريم" على قاعدة المعرفة أدناه للإجابة على استفسارات الأسعار والخدمات:
              </p>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {knowledgeBase.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{item.name}</span>
                      <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-lg text-[10px]">
                        {item.priceInfo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Contact & Call To Action */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-900/50 rounded-3xl p-5 space-y-4 text-xs shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Phone className="w-4 h-4" />
                تواصل مباشر للحصول على ريم لشركتك
              </div>
              <p className="text-slate-300 leading-relaxed">
                هل ترغب بتفعيل "ريم" المساعدة الذكية لربطها بواتساب شركتك مباشرة وتوليد العملاء تلقائياً؟
              </p>

              <div className="space-y-2 pt-1">
                <a
                  href={`https://wa.me/${companyConfig.whatsapp}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن تفعيل المساعدة الذكية ريم لشركتي.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  تواصل عبر الواتساب المباشر
                </a>

                <a
                  href={`tel:${companyConfig.phone}`}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  الاتصال الهاتفي المباشر: {companyConfig.phone}
                </a>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 {companyConfig.name}. جميع الحقوق محفوظة - ريم المساعدة الذكية.</p>
        <p className="text-[10px] text-slate-600">
          تم التشفير والعمل السحابي بنسبة 99.9% على سيرفرات Cloud Run مع دعم التحديث التلقائي 24/7.
        </p>
      </footer>

    </div>
  );
};
