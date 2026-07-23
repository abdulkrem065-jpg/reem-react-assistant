import { Lead, KBItem, CompanyConfig, CalendarEvent } from "../types";

export const defaultKBItems: KBItem[] = [
  {
    id: "kb-1",
    name: "تصميم الهوية البصرية والشعارات",
    priceInfo: "تبدأ من 500 ريال وتصل لـ 1500 ريال",
    description: "تصميم شعار احترافي، اختيار الألوان والخطوط، وتصميم مستندات الهوية وقوالب السوشيال ميديا.",
  },
  {
    id: "kb-2",
    name: "استشارة التسويق الرقمي وإعداد الخطط",
    priceInfo: "300 ريال للساعة",
    description: "جلسة استشارية لتحليل السوق وتحديد الجمهور المستهدف ووضع خطة تسويقية إعلانية متكاملة.",
  },
  {
    id: "kb-3",
    name: "برمجة المواقع وتطبيقات المتاجر الإلكترونية",
    priceInfo: "تبدأ من 2000 ريال",
    description: "برمجة متكاملة للمتاجر والمواقع التعريفية متوافقة مع الجوال ومحركات البحث بضمان سنة كاملة.",
  },
  {
    id: "kb-4",
    name: "إدارة الحملات الإعلانية الممولة",
    priceInfo: "1000 ريال شهرياً",
    description: "إعداد وإدارة الإعلانات على منصات سناب شات، تيك توك، انستغرام، وجوجل مع تقديم تقارير دورية.",
  }
];

export const defaultLeads: Lead[] = [
  {
    id: "lead-1",
    name: "عبد الرحمن بن سليمان",
    mobile: "0501234567",
    email: "abdulrahman@example.com",
    requestType: "عرض سعر",
    serviceType: "برمجة المواقع وتطبيقات المتاجر الإلكترونية",
    quantity: "متجر إلكتروني واحد للهواتف الذكية",
    budget: "2500 ريال",
    requiredDate: "2026-08-15",
    suggestedQuote: "2000 - 3000 ريال",
    summary: "العميل يريد متجر إلكتروني متكامل لبيع الهواتف والملحقات. الميزانية مناسبة ويحتاج تسليمه خلال شهر.",
    timestamp: "2026-07-18T14:30:00.000Z",
    status: "عميل متوقع - يحتاج متابعة",
    assignedTo: "سعد الشهري",
    notes: "تم تجهيز مسودة العقد، بانتظار الاتصال الأول يوم الأحد صباحاً لتأكيد التفاصيل الفنية."
  },
  {
    id: "lead-2",
    name: "د. سارة الهاشمي",
    mobile: "0554321098",
    email: "s.hashemi@clinic.com",
    requestType: "حجز موعد",
    serviceType: "استشارة التسويق الرقمي وإعداد الخطط",
    quantity: "ساعتان",
    budget: "600 ريال",
    requiredDate: "2026-07-22",
    suggestedQuote: "600 ريال",
    summary: "العميلة طبيبة تملك عيادة جلدية جديدة وتريد استشارة لوضع استراتيجية إطلاق الحملة الإعلانية للعيادة.",
    timestamp: "2026-07-18T10:15:00.000Z",
    status: "تم التواصل",
    assignedTo: "ريم الشهري",
    notes: "تم التنسيق مع الدكتورة هاتفياً وتثبيت موعد الاستشارة يوم الأربعاء القادم الساعة 10 صباحاً."
  },
  {
    id: "lead-3",
    name: "مؤسسة خطوة العقارية",
    mobile: "0561122334",
    email: "info@step-realestate.sa",
    requestType: "عرض سعر",
    serviceType: "تصميم الهوية البصرية والشعارات",
    quantity: "هوية تجارية كاملة",
    budget: "1000 ريال",
    requiredDate: "2026-08-01",
    suggestedQuote: "500 - 1500 ريال",
    summary: "شركة عقارات ناشئة بحاجة لتصميم شعار جديد وكروت شخصية وفولدرات أوراق رسمية.",
    timestamp: "2026-07-17T19:40:00.000Z",
    status: "عميل متوقع - يحتاج متابعة",
    assignedTo: "خالد الحربي",
    notes: "يحتاج لمتابعة عاجلة وإرسال النماذج السابقة لمشاريع هويات عقارية قمنا بتصميمها."
  },
  {
    id: "lead-4",
    name: "فيصل العجمي",
    mobile: "0549988776",
    email: "f.ajmi@yahoo.com",
    requestType: "شكوى",
    serviceType: "إدارة الحملات الإعلانية الممولة",
    quantity: "- ",
    budget: "-",
    requiredDate: "-",
    suggestedQuote: "- ",
    summary: "العميل مستاء من تأخر انطلاق حملة سناب شات الإعلانية ويريد استرداد الرسوم أو تعويض مجاني.",
    timestamp: "2026-07-16T15:20:00.000Z",
    status: "مغلق - ناجح 🎉",
    assignedTo: "ماجد المطيري",
    notes: "تم الاتصال بالعميل وحل المشكلة بإطلاق الحملة وتمديدها يومين إضافيين مجاناً لإرضائه. تم إغلاق الطلب بنجاح والعميل راضٍ الآن."
  }
];

export const defaultCompanyConfig: CompanyConfig = {
  name: "حلول التقنية المتكاملة",
  phone: "0112345678",
  whatsapp: "0500000000",
  businessStart: "09:00",
  businessEnd: "17:00",
  weekendDays: [], // No weekend days (Operating 7 days a week)
  adminPassword: "admin123",
  demoSignatureEnabled: true,
};

export const defaultCalendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    leadId: "lead-1",
    leadName: "عبد الرحمن بن سليمان",
    title: "مكالمة متابعة - متجر الهواتف",
    date: "2026-07-19",
    time: "10:30",
    notes: "تقديم عرض السعر الرسمي ومراجعة صفحات المتجر المطلوبة."
  },
  {
    id: "event-2",
    leadId: "lead-2",
    leadName: "د. سارة الهاشمي",
    title: "استشارة تسويقية - عيادة الجلدية",
    date: "2026-07-22",
    time: "11:00",
    notes: "جلسة مكالمة زووم استشارية للتخطيط للحملة."
  }
];
