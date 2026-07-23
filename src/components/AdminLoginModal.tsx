import React, { useState } from "react";
import { Lock, ShieldCheck, Key, ArrowRight, Eye, EyeOff, Sparkles, MessageCircle } from "lucide-react";

interface AdminLoginModalProps {
  onLoginSuccess: () => void;
  onGoToDemo: () => void;
  expectedPassword?: string;
  appName?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onLoginSuccess,
  onGoToDemo,
  expectedPassword = "admin123",
  appName = "ريم - المساعدة الذكية",
}) => {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === expectedPassword) {
      sessionStorage.setItem("reem_admin_auth", "true");
      onLoginSuccess();
    } else {
      setErrorMsg("كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Top Decorative Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mb-1">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            لوحة التحكم والإدارة
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            هذه المنطقة محمية. يرجى إدخال كلمة مرور الإدارة للوصول إلى إعدادات {appName} وإدارة العملاء.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              كلمة مرور الإدارة (Admin Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-red-500 font-medium pt-1 animate-shake">
                ⚠️ {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            تسجيل الدخول للوحة التحكم
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">هل ترغب بالمعاينة أولاً؟</span>
          <button
            onClick={onGoToDemo}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            الذهاب للرابط التجريبي (/demo)
          </button>
        </div>

      </div>
    </div>
  );
};
