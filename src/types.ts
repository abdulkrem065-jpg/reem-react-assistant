export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email: string;
  requestType: "عرض سعر" | "استفسار عام" | "شكوى" | "حجز موعد" | string;
  serviceType: string;
  quantity: string;
  budget: string;
  requiredDate: string;
  suggestedQuote: string;
  summary: string;
  timestamp: string; // ISO or formatted date
  status: "عميل متوقع - يحتاج متابعة" | "تم التواصل" | "مغلق - ناجح" | "مغلق - غير ناجح" | string;
  assignedTo?: string;
  notes?: string;
}

export interface KBItem {
  id: string;
  name: string;
  priceInfo: string;
  description: string;
}

export interface CompanyConfig {
  name: string;
  phone: string;
  whatsapp: string;
  businessStart: string; // "09:00"
  businessEnd: string; // "17:00"
  weekendDays: number[]; // 0 for Sunday, 5 for Friday, 6 for Saturday, etc.
}

export interface CalendarEvent {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  notes?: string;
}

export type Role = "admin" | "sales";
export type Theme = "light" | "dark";
export type Language = "ar" | "en";
