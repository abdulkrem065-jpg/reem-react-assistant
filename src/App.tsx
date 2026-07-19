import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone,
  MessageSquare,
  Settings,
  Users,
  BarChart3,
  Calendar,
  Moon,
  Sun,
  Globe,
  Database,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  Mail,
  Search,
  Download,
  Upload,
  Play,
  Volume2,
  Check,
  AlertTriangle,
  UserCheck,
  Briefcase,
  ExternalLink,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Lead, KBItem, CompanyConfig, CalendarEvent, Role, Theme, Language } from "./types";
import { translations } from "./data/translations";
import {
  defaultKBItems,
  defaultLeads,
  defaultCompanyConfig,
  defaultCalendarEvents
} from "./data/defaultData";

export default function App() {
  // --- States ---
  const [lang, setLang] = useState<Language>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [role, setRole] = useState<Role>("admin");
  const [activeTab, setActiveTab] = useState<string>("assistant");

  // CRM & Knowledge Base States (persisted in localStorage)
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem("reem_leads");
    return saved ? JSON.parse(saved) : defaultLeads;
  });

  const [kbItems, setKbItems] = useState<KBItem[]>(() => {
    const saved = localStorage.getItem("reem_kb_items");
    return saved ? JSON.parse(saved) : defaultKBItems;
  });

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() => {
    const saved = localStorage.getItem("reem_company_config");
    return saved ? JSON.parse(saved) : defaultCompanyConfig;
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem("reem_calendar_events");
    return saved ? JSON.parse(saved) : defaultCalendarEvents;
  });

  const [isGoogleCalendarSynced, setIsGoogleCalendarSynced] = useState<boolean>(() => {
    return localStorage.getItem("reem_gcal_synced") === "true";
  });

  // Assistant Chat/Call Simulator States
  const [chatType, setChatType] = useState<"chat" | "call">("chat");
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isDialing, setIsDialing] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isReemThinking, setIsReemThinking] = useState<boolean>(false);

  // New lead notification
  const [recentCapturedLead, setRecentCapturedLead] = useState<Lead | null>(null);
  const [showNotification, setShowNotification] = useState<boolean>(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Edit/Add Forms
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadNotes, setLeadNotes] = useState<string>("");
  const [leadStatus, setLeadStatus] = useState<string>("");

  const [isKbModalOpen, setIsKbModalOpen] = useState<boolean>(false);
  const [kbForm, setKbForm] = useState<{ id: string; name: string; priceInfo: string; description: string }>({
    id: "",
    name: "",
    priceInfo: "",
    description: ""
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [eventForm, setEventForm] = useState<{ date: string; time: string; title: string; notes: string; leadId: string }>({
    date: "",
    time: "",
    title: "",
    notes: "",
    leadId: ""
  });

  // Direct numbers configurations
  const [directPhone, setDirectPhone] = useState(companyConfig.phone);
  const [directWhatsapp, setDirectWhatsapp] = useState(companyConfig.whatsapp);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<any>(null);

  // --- Sync storage ---
  useEffect(() => {
    localStorage.setItem("reem_leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem("reem_kb_items", JSON.stringify(kbItems));
  }, [kbItems]);

  useEffect(() => {
    localStorage.setItem("reem_company_config", JSON.stringify(companyConfig));
  }, [companyConfig]);

  useEffect(() => {
    localStorage.setItem("reem_calendar_events", JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem("reem_gcal_synced", String(isGoogleCalendarSynced));
  }, [isGoogleCalendarSynced]);

  // Handle HTML document theme and layout direction
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Is Out of Office right now?
  const isOutOfOffice = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, etc.
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check weekend
    if (companyConfig.weekendDays.includes(day)) {
      return true;
    }

    // Check business hours
    const [startH, startM] = companyConfig.businessStart.split(":").map(Number);
    const [endH, endM] = companyConfig.businessEnd.split(":").map(Number);

    const minutesNow = hour * 60 + minute;
    const minutesStart = startH * 60 + startM;
    const minutesEnd = endH * 60 + endM;

    return minutesNow < minutesStart || minutesNow > minutesEnd;
  }, [companyConfig]);

  // Translation Helper
  const t = translations[lang];

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isReemThinking]);

  // Call duration counter
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isCallActive]);

  // Initialize Chat with Welcome Greeting
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: "model",
          text: `أهلاً بك في ${companyConfig.name}، أنا ريم المساعدة الذكية. نشكرك على تواصلك معنا خارج أوقات الدوام الرسمي. كيف يمكنني مساعدتك اليوم؟`
        }
      ]);
    }
  }, [companyConfig.name]);

  // Voice player synthesizer (SpeechSynthesis API)
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      // Stop current speaking
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#]/g, ""); // strip markdown
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === "ar" ? "ar-SA" : "en-US";
      
      // Try to find a premium voice if possible
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => v.lang.startsWith(lang));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Core API Handlers ---
  const handleSendToReem = async (textToSend?: string) => {
    const msgText = textToSend || userInput;
    if (!msgText.trim()) return;

    // Add user message
    const updatedMessages = [...chatMessages, { role: "user" as const, text: msgText }];
    setChatMessages(updatedMessages);
    setUserInput("");
    setIsReemThinking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          companyConfig,
          knowledgeBase: kbItems
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "model", text: data.text }]);
      
      // Auto-speak in voice call mode
      if (chatType === "call" || isCallActive) {
        speakText(data.text);
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: "model", text: "عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً." }]);
    } finally {
      setIsReemThinking(false);
    }
  };

  // Parse and save customer data into CRM
  const handleSaveConversationAsLead = async () => {
    if (chatMessages.length <= 1) return;
    setIsReemThinking(true);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          knowledgeBase: kbItems
        }),
      });

      if (!response.ok) throw new Error("Failed to extract data");

      const extracted = await response.json();

      // Create a complete lead object
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: extracted.name || "عميل غير معروف",
        mobile: extracted.mobile || "-",
        email: extracted.email || "-",
        requestType: extracted.requestType || "استفسار عام",
        serviceType: extracted.serviceType || "استفسار عام عن الخدمات",
        quantity: extracted.quantity || "-",
        budget: extracted.budget || "-",
        requiredDate: extracted.requiredDate || "-",
        suggestedQuote: extracted.suggestedQuote || "لم يتم التحديد",
        summary: extracted.summary || "تواصل العميل معنا خارج أوقات العمل الرسمية.",
        timestamp: new Date().toISOString(),
        status: "عميل متوقع - يحتاج متابعة",
        notes: "تم استخلاص البيانات تلقائياً بواسطة ريم."
      };

      setLeads(prev => [newLead, ...prev]);
      setRecentCapturedLead(newLead);
      setShowNotification(true);

      // If Google Calendar synced, auto add follow up event 2 days later
      if (isGoogleCalendarSynced) {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 2);
        const yyyy = followUpDate.getFullYear();
        const mm = String(followUpDate.getMonth() + 1).padStart(2, "0");
        const dd = String(followUpDate.getDate()).padStart(2, "0");

        const newEvent: CalendarEvent = {
          id: `evt-${Date.now()}`,
          leadId: newLead.id,
          leadName: newLead.name,
          title: `متابعة: ${newLead.name}`,
          date: `${yyyy}-${mm}-${dd}`,
          time: "10:00",
          notes: `مكالمة متابعة العميل تلقائياً من نظام ريم. نوع الخدمة: ${newLead.serviceType}`
        };
        setCalendarEvents(prev => [...prev, newEvent]);
      }

      // Reset assistant chat
      setChatMessages([
        {
          role: "model",
          text: `أهلاً بك في ${companyConfig.name}، أنا ريم المساعدة الذكية. نشكرك على تواصلك معنا خارج أوقات الدوام الرسمي. كيف يمكنني مساعدتك اليوم؟`
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReemThinking(false);
    }
  };

  // Simulating Voice Call Interactions
  const handleToggleCall = () => {
    if (isCallActive) {
      // Hang up
      setIsCallActive(false);
      window.speechSynthesis.cancel();
      handleSaveConversationAsLead();
    } else {
      setIsDialing(true);
      setTimeout(() => {
        setIsDialing(false);
        setIsCallActive(true);
        speakText(`أهلاً بك في ${companyConfig.name}، أنا ريم المساعدة الذكية. نشكرك على تواصلك معنا خارج أوقات الدوام الرسمي. كيف يمكنني مساعدتك اليوم؟`);
      }, 2000);
    }
  };

  // Format Call Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- CRM Filters & Calculations ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchQuery =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.mobile.includes(searchQuery) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      const matchType = typeFilter === "all" || l.requestType === typeFilter;

      return matchQuery && matchStatus && matchType;
    });
  }, [leads, searchQuery, statusFilter, typeFilter]);

  // Analytics Math
  const analytics = useMemo(() => {
    const total = leads.length;
    const active = leads.filter(l => l.status === "عميل متوقع - يحتاج متابعة").length;
    const won = leads.filter(l => l.status.includes("ناجح")).length;
    const conversion = total > 0 ? Math.round((won / total) * 100) : 0;

    let pipeline = 0;
    leads.forEach(l => {
      if (l.status !== "مغلق - غير ناجح") {
        const numbers = l.suggestedQuote.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const avg = numbers.reduce((acc, curr) => acc + Number(curr), 0) / numbers.length;
          pipeline += avg;
        }
      }
    });

    return { total, active, conversion, pipeline };
  }, [leads]);

  // --- CRUD Services / Knowledge Base ---
  const handleSaveKbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== "admin") return;

    if (kbForm.id) {
      setKbItems(prev => prev.map(item => item.id === kbForm.id ? { ...item, ...kbForm } : item));
    } else {
      const newItem: KBItem = {
        ...kbForm,
        id: `kb-${Date.now()}`
      };
      setKbItems(prev => [...prev, newItem]);
    }
    setKbForm({ id: "", name: "", priceInfo: "", description: "" });
    setIsKbModalOpen(false);
  };

  const handleDeleteKbItem = (id: string) => {
    if (role !== "admin") return;
    if (window.confirm("هل أنت متأكد من رغبتك في حذف هذه الخدمة من قاعدة المعرفة؟")) {
      setKbItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // --- Schedule Events ---
  const handleSaveCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      leadId: eventForm.leadId,
      leadName: leads.find(l => l.id === eventForm.leadId)?.name || "عميل",
      title: eventForm.title,
      date: eventForm.date,
      time: eventForm.time,
      notes: eventForm.notes
    };
    setCalendarEvents(prev => [...prev, newEvent]);
    setIsEventModalOpen(false);
    setEventForm({ date: "", time: "", title: "", notes: "", leadId: "" });
  };

  // --- CRM Update notes / status ---
  const handleEditLeadStatus = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setLeadStatus(lead.status);
    setLeadNotes(lead.notes || "");
  };

  const handleSaveLeadEdits = () => {
    setLeads(prev => prev.map(l => l.id === editingLeadId ? { ...l, status: leadStatus, notes: leadNotes } : l));
    setEditingLeadId(null);
  };

  // --- Auto Backup Actions ---
  const downloadBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      leads,
      kbItems,
      companyConfig,
      calendarEvents
    }));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `reem_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.leads) setLeads(parsed.leads);
          if (parsed.kbItems) setKbItems(parsed.kbItems);
          if (parsed.companyConfig) {
            setCompanyConfig(parsed.companyConfig);
            setDirectPhone(parsed.companyConfig.phone);
            setDirectWhatsapp(parsed.companyConfig.whatsapp);
          }
          if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
          alert("تم استعادة جميع البيانات بنجاح من النسخة الاحتياطية!");
        } catch (err) {
          alert("خطأ في قراءة ملف النسخة الاحتياطية.");
        }
      };
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex flex-wrap items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white p-2.5 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              {t.appName}
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                V3.5 Live
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.tagline}</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 mt-4 sm:mt-0 flex-wrap">
          {/* Active Banner */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs ${isOutOfOffice ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"}`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOutOfOffice ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOutOfOffice ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
            {isOutOfOffice ? t.activeNow : t.inactiveNow}
          </div>

          {/* Quick numbers widget */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{t.directContact}</span>
            <a href={`tel:${directPhone}`} className="hover:underline flex items-center gap-1 font-mono text-slate-700 dark:text-slate-200">
              <Phone className="w-3.5 h-3.5" /> {directPhone}
            </a>
            <a href={`https://wa.me/${directWhatsapp}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>

          {/* Theme, Lang, Role switches */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              {t.switchLanguage}
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER: Role Switcher Info Banner */}
      <div className="bg-slate-100 dark:bg-slate-900/50 px-6 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">{t.roleLabel}</span>
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setRole("admin")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${role === "admin" ? "bg-emerald-500 text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              {t.adminRole}
            </button>
            <button
              onClick={() => setRole("sales")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${role === "sales" ? "bg-emerald-500 text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              {t.salesRole}
            </button>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>{role === "admin" ? "صلاحيات كاملة للمدير لتعديل الأسعار وإدارة المبيعات" : "وضع العرض ومتابعة العملاء لموظفي المبيعات"}</span>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="max-w-[1600px] mx-auto p-2 lg:p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* SIDE BAR NAVIGATION TABS */}
        <nav className="lg:col-span-3 space-y-1">
          <button
            onClick={() => setActiveTab("assistant")}
            className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-all text-xs font-medium ${activeTab === "assistant" ? "bg-emerald-500 text-white shadow-xs" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              {t.reemAssistant}
            </span>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold">LIVE</span>
          </button>

          <button
            onClick={() => setActiveTab("crm")}
            className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-all text-xs font-medium ${activeTab === "crm" ? "bg-emerald-500 text-white shadow-xs" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {t.crmDashboard}
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] px-1.5 py-0.5 rounded-md font-bold">
              {leads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full text-start p-2 rounded-lg flex items-center gap-2 transition-all text-xs font-medium ${activeTab === "analytics" ? "bg-emerald-500 text-white shadow-xs" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {t.salesAnalytics}
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-all text-xs font-medium ${activeTab === "calendar" ? "bg-emerald-500 text-white shadow-xs" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {t.calendar}
            </span>
            {isGoogleCalendarSynced && <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold">GCAL</span>}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full text-start p-2 rounded-lg flex items-center gap-2 transition-all text-xs font-medium ${activeTab === "settings" ? "bg-emerald-500 text-white shadow-xs" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
          >
            <Settings className="w-3.5 h-3.5" />
            {t.settings}
          </button>

          {/* Quick Business Hours Summary card */}
          <div className="bg-slate-100/55 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 mt-2 text-[11px]">
            <h4 className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              تفاصيل الدوام والتواصل
            </h4>
            <div className="space-y-1 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>اسم الشركة:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{companyConfig.name}</span>
              </div>
              <div className="flex justify-between">
                <span>ساعات العمل:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {companyConfig.businessStart} - {companyConfig.businessEnd}
                </span>
              </div>
              <div className="flex justify-between">
                <span>العطلات الأسبوعية:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {companyConfig.weekendDays.map(d => d === 5 ? t.friday : d === 6 ? t.saturday : t.sunday).join(", ")}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* CONTAINER VIEWPORTS */}
        <main className="lg:col-span-9 space-y-3">
          
          {/* POPUP NOTIFICATION (NEW CAPTURED LEAD ALERT) */}
          <AnimatePresence>
            {showNotification && recentCapturedLead && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="bg-emerald-50/90 dark:bg-slate-900/90 border border-emerald-500 p-3.5 rounded-lg mb-3 shadow-xs relative"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-md">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-400 text-xs">{t.leadCapturedTitle}</h3>
                    <p className="text-[11px] text-emerald-800 dark:text-slate-300 leading-relaxed">{t.leadCapturedDesc}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-emerald-200/50 dark:border-slate-800 text-[10px]">
                      <div><strong className="text-slate-500">{t.name}:</strong> <span className="font-bold">{recentCapturedLead.name}</span></div>
                      <div><strong className="text-slate-500">{t.phone}:</strong> <span className="font-mono">{recentCapturedLead.mobile}</span></div>
                      <div><strong className="text-slate-500">{t.service}:</strong> <span className="truncate block">{recentCapturedLead.serviceType}</span></div>
                      <div><strong className="text-slate-500">{t.suggestedQuote}:</strong> <span className="font-bold text-emerald-600 dark:text-emerald-400">{recentCapturedLead.suggestedQuote}</span></div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNotification(false)}
                    className="text-emerald-700 dark:text-slate-400 hover:text-emerald-900 p-1 rounded-full hover:bg-emerald-100 dark:hover:bg-slate-800"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: REEM AI ASSISTANT SIMULATOR */}
          {activeTab === "assistant" && (
            <div className="space-y-3">
              {/* Simulator Card Header */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    {t.callSimulator}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    اختبر طريقة استجابة المساعدة ريم مع العملاء وتوليد عروض الأسعار آلياً.
                  </p>
                </div>

                {/* Toggles between Voice Call and Text Chat simulation */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    onClick={() => { setChatType("chat"); window.speechSynthesis.cancel(); }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 ${chatType === "chat" ? "bg-white dark:bg-slate-700 shadow-xs text-emerald-500 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    محادثة كتابية
                  </button>
                  <button
                    onClick={() => { setChatType("call"); }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 ${chatType === "call" ? "bg-white dark:bg-slate-700 shadow-xs text-emerald-500 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    اتصال هاتفي
                  </button>
                </div>
              </div>

              {/* SIMULATOR WINDOW PANEL */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                
                {/* INTERACTIVE CHAT ENGINE */}
                <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex flex-col h-[480px] relative overflow-hidden">
                  
                  {/* SIMULATED PHONE HEAD */}
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/10 text-sm">
                          ر
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white dark:border-slate-900"></span>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold">ريم المساعدة الذكية</h3>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          {isReemThinking ? t.reemStatusThinking : "متصلة ونشطة"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Reset Button */}
                    <button
                      onClick={() => {
                        if (window.confirm("هل تريد إنهاء وحفظ المحادثة كعميل متوقع جديد؟")) {
                          handleSaveConversationAsLead();
                        }
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs flex items-center gap-1 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {t.endConversation}
                    </button>
                  </div>

                  {/* CHAT THREAD VIEWPORT */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50/30 dark:bg-slate-950/25">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-2.5 px-3 shadow-xs text-xs leading-relaxed ${msg.role === "user" ? "bg-emerald-500 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700/80"}`}
                        >
                          <div className="whitespace-pre-line">{msg.text}</div>
                          {msg.role === "model" && (
                            <div className="mt-1.5 flex justify-end">
                              <button
                                onClick={() => speakText(msg.text)}
                                className={`p-1 rounded text-[10px] flex items-center gap-0.5 ${msg.role === "user" ? "text-white/80 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"}`}
                                title="Play Voice Response"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>استمع</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isReemThinking && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg rounded-tl-none p-2.5 border border-slate-100 dark:border-slate-700/80 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* INPUT BAR */}
                  {chatType === "chat" ? (
                    <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendToReem()}
                        placeholder={t.typeMessage}
                        className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-xs dark:text-white"
                      />
                      <button
                        onClick={() => handleSendToReem()}
                        className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all flex items-center justify-center shadow-xs text-xs"
                      >
                        {t.sendMessage}
                      </button>
                    </div>
                  ) : (
                    /* VOICE CALL INTERFACE IN CHAT WINDOW */
                    <div className="p-4 bg-slate-900 text-white flex flex-col items-center justify-center space-y-3">
                      {isDialing ? (
                        <div className="text-center space-y-2">
                          <Phone className="w-8 h-8 text-emerald-400 animate-bounce mx-auto" />
                          <p className="text-xs font-semibold animate-pulse">{t.reemStatusDialing}</p>
                        </div>
                      ) : isCallActive ? (
                        <div className="text-center space-y-3 w-full">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                            <span className="text-xs font-mono text-slate-300">{formatTime(callDuration)}</span>
                          </div>
                          
                          {/* Pulsing sound waves */}
                          <div className="flex items-center justify-center gap-0.5 h-6">
                            <span className="w-0.5 bg-emerald-500 rounded-full h-3 animate-pulse"></span>
                            <span className="w-0.5 bg-emerald-400 rounded-full h-5 animate-pulse delay-75"></span>
                            <span className="w-0.5 bg-emerald-500 rounded-full h-4 animate-pulse delay-150"></span>
                            <span className="w-0.5 bg-emerald-300 rounded-full h-5 animate-pulse delay-75"></span>
                            <span className="w-0.5 bg-emerald-500 rounded-full h-3 animate-pulse"></span>
                          </div>

                          <p className="text-[11px] text-slate-400">{t.reemVoiceGreeting}</p>

                          <button
                            onClick={handleToggleCall}
                            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 mx-auto shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5 rotate-135" />
                            إنهاء المكالمة
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <p className="text-xs text-slate-400">انقر لبدء مكالمة صوتية تفاعلية مع ريم.</p>
                          <button
                            onClick={handleToggleCall}
                            className="px-4 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 mx-auto shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {t.startCall}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SIDEBAR: QUICK TEST PROMPTS & TEST SCENARIOS */}
                <div className="md:col-span-4 space-y-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2.5">
                    <h4 className="font-bold text-xs flex items-center gap-1 text-slate-700 dark:text-slate-200">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {t.quickPrompts}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      انقر على أي رسالة بالأسفل لإرسالها لريم واختبار قدرتها على توليد عروض الأسعار.
                    </p>

                    <div className="space-y-1.5 text-[11px]">
                      <button
                        onClick={() => handleSendToReem("أنا عبد الملك، أريد الحصول على عرض سعر لخدمة تصميم هوية بصرية كاملة وتصميم شعار للشركة")}
                        className="w-full text-start p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-all font-medium"
                      >
                        💬 {t.promptQuote}
                      </button>

                      <button
                        onClick={() => handleSendToReem("اسمي سارة، أريد حجز موعد جلسة استشارية تسويقية يوم الثلاثاء القادم لعيادتي الجديدة")}
                        className="w-full text-start p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-all font-medium"
                      >
                        📅 {t.promptAppt}
                      </button>

                      <button
                        onClick={() => handleSendToReem("أهلاً، ما هي الخدمات التقنية والتصميمية المتوفرة لديكم وما هي أسعاركم التقديرية؟")}
                        className="w-full text-start p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-all font-medium"
                      >
                        💡 {t.promptInquiry}
                      </button>

                      <button
                        onClick={() => handleSendToReem("اسمي فيصل، عندي شكوى بخصوص تأخر إطلاق الحملة التسويقية التي اتفقت معكم عليها")}
                        className="w-full text-start p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-all font-medium"
                      >
                        ⚠️ {t.promptComplaint}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Status card */}
                  <div className="bg-emerald-500/5 text-emerald-800 dark:text-emerald-400 p-3 rounded-lg border border-emerald-500/20 text-[11px] leading-relaxed space-y-1.5">
                    <h5 className="font-bold flex items-center gap-1 text-emerald-900 dark:text-emerald-300">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      التكامل السحابي والـ CRM
                    </h5>
                    <p>
                      عند انتهاء محادثتك، انقر على زر **"إنهاء وحفظ البيانات"** ليقوم الذكاء الاصطناعي باستخلاص تفاصيل العميل وتحديث لوحة المتابعة آلياً.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CRM LEADS DASHBOARD */}
          {activeTab === "crm" && (
            <div className="space-y-6">
              
              {/* Filter and Search Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-4 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-hidden text-sm dark:text-white"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex gap-2 flex-wrap text-xs">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-hidden font-medium"
                  >
                    <option value="all">{t.filterAll}</option>
                    <option value="عميل متوقع - يحتاج متابعة">{t.statusLead}</option>
                    <option value="تم التواصل">{t.statusContacted}</option>
                    <option value="مغلق - ناجح 🎉">{t.statusSuccess}</option>
                    <option value="مغلق - غير ناجح">{t.statusFailed}</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-hidden font-medium"
                  >
                    <option value="all">{t.filterTypeAll}</option>
                    <option value="عرض سعر">عرض سعر</option>
                    <option value="حجز موعد">حجز موعد</option>
                    <option value="استفسار عام">استفسار عام</option>
                    <option value="شكوى">شكوى</option>
                  </select>
                </div>

              </div>

              {/* Leads Listing */}
              <div className="space-y-4">
                {filteredLeads.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium">{t.noLeadsYet}</p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-xs hover:border-emerald-500/50 transition-all space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">{lead.name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${lead.requestType === "عرض سعر" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400" : lead.requestType === "حجز موعد" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400" : lead.requestType === "شكوى" ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {lead.requestType}
                            </span>
                            
                            {/* Lead Status badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${lead.status.includes("متابعة") ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400" : lead.status.includes("ناجح") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {lead.status}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 font-medium font-mono mt-1">
                            {new Date(lead.timestamp).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
                          </p>
                        </div>

                        {/* Quick Contact & Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEventForm(prev => ({ ...prev, leadId: lead.id, title: `موعد متابعة: ${lead.name}` }));
                              setIsEventModalOpen(true);
                            }}
                            className="p-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all text-slate-700 dark:text-slate-300"
                            title={t.scheduleMeeting}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">جدولة موعد</span>
                          </button>
                          
                          <button
                            onClick={() => handleEditLeadStatus(lead)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-all"
                            title="Edit Status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => setLeads(prev => prev.filter(l => l.id !== lead.id))}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-all"
                            title={t.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact and extracted content details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-slate-400 font-medium">قنوات التواصل</p>
                          <p className="font-semibold font-mono">{lead.mobile}</p>
                          <p className="text-[10px] text-slate-400 truncate">{lead.email}</p>
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-slate-400 font-medium">الخدمة والكمية</p>
                          <p className="font-semibold truncate">{lead.serviceType}</p>
                          <p className="text-[10px] text-slate-400">{t.quantity}: {lead.quantity}</p>
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-slate-400 font-medium">الميزانية والسعر المقترح</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200">{lead.budget}</p>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{t.suggestedQuote}: {lead.suggestedQuote}</p>
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-slate-400 font-medium">موعد التسليم</p>
                          <p className="font-semibold">{lead.requiredDate}</p>
                          <p className="text-[10px] text-slate-400">{t.automatedEmailAlert}</p>
                        </div>
                      </div>

                      {/* Lead Summary */}
                      <div className="bg-emerald-50/20 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong>ملخص ريم للمكالمة:</strong> {lead.summary}
                      </div>

                      {lead.notes && (
                        <div className="bg-amber-50/30 dark:bg-amber-950/10 p-3 rounded-2xl border border-amber-100/30 dark:border-amber-900/20 text-xs text-slate-600 dark:text-slate-400">
                          <strong>ملاحظات المبيعات:</strong> {lead.notes}
                        </div>
                      )}

                      {/* Edit Form inline expansion */}
                      {editingLeadId === lead.id && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-300">تحديث حالة المتابعة</label>
                              <select
                                value={leadStatus}
                                onChange={(e) => setLeadStatus(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden"
                              >
                                <option value="عميل متوقع - يحتاج متابعة">{t.statusLead}</option>
                                <option value="تم التواصل">{t.statusContacted}</option>
                                <option value="مغلق - ناجح 🎉">{t.statusSuccess}</option>
                                <option value="مغلق - غير ناجح">{t.statusFailed}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-300">ملاحظات فريق المتابعة</label>
                              <input
                                type="text"
                                value={leadNotes}
                                onChange={(e) => setLeadNotes(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden"
                                placeholder="اكتب ملاحظة لمتابعة العميل..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setEditingLeadId(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">إلغاء</button>
                            <button onClick={handleSaveLeadEdits} className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold">حفظ التغييرات</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STATISTICS & ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              
              {/* Widgets Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
                  <p className="text-xs text-slate-400 font-semibold">{t.totalLeads}</p>
                  <p className="text-3xl font-bold font-mono text-emerald-500">{analytics.total}</p>
                  <p className="text-[10px] text-slate-400">مكالمات خارج الدوام</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
                  <p className="text-xs text-slate-400 font-semibold">{t.activeLeads}</p>
                  <p className="text-3xl font-bold font-mono text-amber-500">{analytics.active}</p>
                  <p className="text-[10px] text-slate-400">تحت المتابعة الفورية</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
                  <p className="text-xs text-slate-400 font-semibold">{t.conversionRate}</p>
                  <p className="text-3xl font-bold font-mono text-blue-500">{analytics.conversion}%</p>
                  <p className="text-[10px] text-slate-400">نسبة نجاح الصفقات</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
                  <p className="text-xs text-slate-400 font-semibold">{t.pipelineValue}</p>
                  <p className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-200">
                    {analytics.pipeline.toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.currency}</span>
                  </p>
                  <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> مبيعات محتملة تولدت تلقائياً
                  </p>
                </div>
              </div>

              {/* Visual Performance Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart 1: Request distribution progress bar list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <h3 className="text-sm font-bold">{t.requestDistribution}</h3>
                  <div className="space-y-3.5 text-xs">
                    {["عرض سعر", "حجز موعد", "استفسار عام", "شكوى"].map((type) => {
                      const count = leads.filter(l => l.requestType === type).length;
                      const percent = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>{type}</span>
                            <span>{count} عملاء ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${type === "عرض سعر" ? "bg-blue-500" : type === "حجز موعد" ? "bg-purple-500" : type === "شكوى" ? "bg-red-500" : "bg-slate-400"}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: Top Requested services list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <h3 className="text-sm font-bold">{t.topServices}</h3>
                  <div className="space-y-3 text-xs">
                    {kbItems.map((item, idx) => {
                      const count = leads.filter(l => l.serviceType.includes(item.name)).length;
                      const percent = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{item.name}</p>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                          <span className="font-mono text-slate-400 shrink-0 font-semibold">{count} طلب</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR SCHEDULER */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    {t.calendarTitle}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    تابع مواعيد المتابعة التي حجزتها ريم للعملاء أو حددها فريق المبيعات.
                  </p>
                </div>

                <button
                  onClick={() => setIsGoogleCalendarSynced(prev => !prev)}
                  className={`px-4 py-2 text-xs font-semibold rounded-2xl flex items-center gap-2 transition-all ${isGoogleCalendarSynced ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  <Calendar className="w-4 h-4" />
                  {isGoogleCalendarSynced ? "ربط تقويم جوجل: مفعل 🟢" : t.syncGoogleCalendar}
                </button>
              </div>

              {isGoogleCalendarSynced && (
                <div className="bg-emerald-50/20 dark:bg-slate-900/50 p-4 rounded-3xl border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>{t.googleCalendarSynced}</span>
                </div>
              )}

              {/* Grid: Calendar month simulation & Upcoming Events List */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Simulating Monthly visual tracker */}
                <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl text-sm space-y-4">
                  <div className="flex justify-between items-center font-bold">
                    <span>يوليو 2026</span>
                    <span className="text-xs text-slate-400">العودة لليوم</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-2 border-b">
                    <span>ح</span><span>ن</span><span>ث</span><span>ر</span><span>خ</span><span>ج</span><span>س</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center font-mono">
                    {/* Placeholder offset for july 2026 */}
                    <span className="text-slate-200 dark:text-slate-800">28</span>
                    <span className="text-slate-200 dark:text-slate-800">29</span>
                    <span className="text-slate-200 dark:text-slate-800">30</span>
                    {[...Array(31)].map((_, idx) => {
                      const dayNum = idx + 1;
                      const dayStr = `2026-07-${dayNum.toString().padStart(2, "0")}`;
                      const hasEvent = calendarEvents.some(e => e.date === dayStr);
                      const isToday = dayNum === 18;
                      return (
                        <div
                          key={idx}
                          className={`p-1.5 rounded-xl text-xs flex flex-col items-center justify-between h-10 border ${isToday ? "bg-emerald-500 text-white font-bold" : "border-transparent hover:border-slate-200 dark:hover:border-slate-800"} ${hasEvent ? "ring-2 ring-emerald-500/30" : ""}`}
                        >
                          <span>{dayNum}</span>
                          {hasEvent && <span className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white" : "bg-emerald-500"}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Events list */}
                <div className="md:col-span-5 space-y-4">
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">الاجتماعات والمواعيد القادمة</h3>
                  <div className="space-y-3">
                    {calendarEvents.length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد مواعيد قادمة مجدولة.</p>
                    ) : (
                      calendarEvents.map(event => (
                        <div key={event.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800 dark:text-white">{event.title}</h4>
                            <span className="font-mono text-slate-400 font-semibold">{event.time}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">العميل: <span className="font-bold text-slate-700 dark:text-slate-200">{event.leadName}</span></p>
                          <p className="text-slate-400">{event.notes}</p>
                          <div className="pt-2 border-t flex justify-between text-[10px] text-slate-400">
                            <span>{event.date}</span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><Clock className="w-3 h-3" /> مضاف للتقويم</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & KNOWLEDGE BASE */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              
              {/* Role restriction notification */}
              {role === "sales" && (
                <div className="bg-amber-100/70 border border-amber-300 p-4 rounded-3xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{t.readOnlyWarning}</span>
                </div>
              )}

              {/* Company & business hours form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                  إعدادات الشركة والدوام الرسمي
                </h3>

                <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" onSubmit={(e) => { e.preventDefault(); if (role !== "admin") return; setCompanyConfig(prev => ({ ...prev, phone: directPhone, whatsapp: directWhatsapp })); alert("تم حفظ الإعدادات بنجاح!"); }}>
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">{t.companyNameLabel}</label>
                    <input
                      type="text"
                      value={companyConfig.name}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, name: e.target.value }))}
                      disabled={role !== "admin"}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">{t.directPhoneLabel}</label>
                    <input
                      type="text"
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      disabled={role !== "admin"}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">{t.directWhatsappLabel}</label>
                    <input
                      type="text"
                      value={directWhatsapp}
                      onChange={(e) => setDirectWhatsapp(e.target.value)}
                      disabled={role !== "admin"}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">أوقات العمل الرسمية (البداية والنهاية)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={companyConfig.businessStart}
                        onChange={(e) => setCompanyConfig(prev => ({ ...prev, businessStart: e.target.value }))}
                        disabled={role !== "admin"}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono text-center"
                      />
                      <input
                        type="time"
                        value={companyConfig.businessEnd}
                        onChange={(e) => setCompanyConfig(prev => ({ ...prev, businessEnd: e.target.value }))}
                        disabled={role !== "admin"}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono text-center"
                      />
                    </div>
                  </div>

                  {role === "admin" && (
                    <div className="md:col-span-2 pt-3">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-sm"
                      >
                        {t.saveSettings}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Knowledge Base Services list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t.kbTitle}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">{t.kbDesc}</p>
                  </div>
                  {role === "admin" && (
                    <button
                      onClick={() => { setKbForm({ id: "", name: "", priceInfo: "", description: "" }); setIsKbModalOpen(true); }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.addService}
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  {kbItems.map(item => (
                    <div key={item.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {role === "admin" && (
                            <>
                              <button onClick={() => { setKbForm(item); setIsKbModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteKbItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{item.priceInfo}</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup & System Security */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t.backupTitle}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.backupDesc}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 text-xs">
                  <button
                    onClick={downloadBackupData}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadBackup}
                  </button>

                  {role === "admin" && (
                    <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {t.restoreBackup}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreData}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* FOOTER METRICS */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-400 space-y-2">
        <p>© 2026 {companyConfig.name}. جميع الحقوق محفوظة.</p>
        <p className="flex items-center justify-center gap-1.5 text-[10px]">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          تم التشفير والنسخ الاحتياطي التلقائي للبيانات وحمايتها وفق أعلى معايير الأمان 24/7
        </p>
      </footer>

      {/* --- POPUP MODAL: KNOWLEDGE BASE SERVICE --- */}
      {isKbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base">{kbForm.id ? "تعديل الخدمة" : "إضافة خدمة جديدة لقاعدة المعرفة"}</h3>
            <form onSubmit={handleSaveKbItem} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">اسم الخدمة</label>
                <input
                  type="text"
                  required
                  value={kbForm.name}
                  onChange={(e) => setKbForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">معلومات السعر التقديري</label>
                <input
                  type="text"
                  required
                  value={kbForm.priceInfo}
                  onChange={(e) => setKbForm(prev => ({ ...prev, priceInfo: e.target.value }))}
                  placeholder="مثال: يبدأ من 500 ريال"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">وصف الخدمة</label>
                <textarea
                  required
                  value={kbForm.description}
                  onChange={(e) => setKbForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 h-24"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsKbModalOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL: CALENDAR SCHEDULER EVENT --- */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base">{t.scheduleEventModal}</h3>
            <form onSubmit={handleSaveCalendarEvent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">{t.eventTitle}</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">{t.eventDate}</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-600">{t.eventTime}</label>
                  <input
                    type="time"
                    required
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">{t.notes}</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 border rounded-xl">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl">{t.confirmSchedule}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
