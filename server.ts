import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());

// API: Chat with Reem
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, companyConfig, knowledgeBase } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const companyName = companyConfig?.name || "التقنية الذكية";
    const kbText = (knowledgeBase || [])
      .map((item: any) => `- ${item.name}: ${item.priceInfo} (${item.description || ""})`)
      .join("\n");

    const systemInstruction = `
أنت "ريم"، مساعدة ذكاء اصطناعي ذكية ومحترفة لشركة "${companyName}".
مهمتك الأساسية هي الرد على تواصل العملاء خارج أوقات العمل الرسمية بنبرة ودودة، مهذبة ودافئة باللغة العربية الفصحى أو العامية المهذبة المفهومة.

🎯 أهدافك الأساسية:
1. الترحيب بالعميل بحرارة واحترافية، والاعتذار بلطف عن عدم توفر الموظفين حالياً لأن الوقت خارج أوقات العمل الرسمية.
2. فهم احتياج العميل بسرعة وتحديد الفئة: (استفسار عام، عرض سعر، شكوى، حجز موعد).
3. تقديم عروض أسعار أولية ودقيقة بناءً على قاعدة المعرفة المتوفرة لديك أدناه.
4. جمع بيانات العميل الأساسية (الاسم، رقم الجوال، البريد الإلكتروني، نوع الخدمة المطلوبة).
5. إبلاغ العميل بأنه سيتم التواصل معه في أول يوم عمل لتأكيد التفاصيل.

📋 هيكل المحادثة الإلزامي (تدفق تفاعلي خطوة بخطوة):
- الخطوة 1: الرد التلقائي الترحيبي (ابدأ به دائماً في أول رسالة): "أهلاً بك في ${companyName}، أنا ريم المساعدة الذكية. نشكرك على تواصلك معنا خارج أوقات الدوام الرسمي. كيف يمكنني مساعدتك اليوم؟"
- الخطوة 2: استمع جيداً لما يطلبه العميل وحدد الخدمة المطلوبة.
- الخطوة 3: إذا طلب عرض سعر، اسأله عن التفاصيل التالية بالترتيب تفاعلياً (واحدة تلو الأخرى أو باسلوب لطيف): (نوع الخدمة/المنتج المطلوب، الكمية أو الحجم، الميزانية المتوقعة، والتاريخ المطلوب للتسليم).
- الخطوة 4: بناءً على معلومات قاعدة المعرفة أدناه، قدّم عرضاً سعرياً تقريبياً بوضوح. يجب صياغة السعر على شكل: "بناءً على معلوماتك، التكلفة التقديرية تتراوح بين [أقل سعر] و [أعلى سعر] ريال". وأكد له أن هذا السعر تقديري وتقريبي فقط وغير ملزم قانونياً.
- الخطوة 5: اطلب بيانات التواصل بلطف: "للتأكيد، أرجو مشاركة اسمك الكامل ورقم جوالك وبريدك الإلكتروني".
- الخطوة 6: لخص البيانات التي جمعتها باختصار وأكد عليها ثم أنهِ المحادثة: "شكراً لك [اسم العميل]، تم تسجيل طلبك وسيتواصل معك فريقنا في أقرب وقت رسمي. أتمنى لك يوماً طيباً".

📌 قواعد ذهبية لا تحيد عنها أبداً:
- لا تفتعل معلومات أو خدمات أو أسعار غير موجودة في قاعدة المعرفة.
- إذا سألك العميل عن شيء خارج نطاق معرفتك، قل بلطف: "هذا سؤال مهم، سأحوله للفريق المختص ليرد عليك خلال ساعات العمل الرسمية".
- لا تقدم تخفيضات أو وعود غير مدروسة. العروض تقديرية فقط وليست ملزمة.
- لا تطلب أبداً معلومات حساسة (مثل أرقام بطاقات الائتمان، الحسابات البنكية، أو كلمات المرور).
- التزم باللهجة العربية الودودة والمهذبة للغاية.

🗂️ قاعدة المعرفة للخدمات والأسعار التقديرية:
${kbText || `
- خدمة التصميم الجرافيكي: تبدأ من 500 ريال.
- استشارة التسويق الرقمي: 300 ريال للساعة.
- حزمة البرمجة الأساسية: 2000 ريال.
`}
`;

    // Transform messages to Gemini SDK contents format
    const contents = messages.map((msg: any) => {
      const role = msg.role === "user" ? "user" : "model";
      return {
        role,
        parts: [{ text: msg.text }],
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "عذراً، لم أستطع معالجة الرد حالياً.";
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// API: Extract Lead Data from Transcript
app.post("/api/extract", async (req, res) => {
  try {
    const { messages, knowledgeBase } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const transcript = messages
      .map((m: any) => `${m.role === "user" ? "العميل" : "ريم"}: ${m.text}`)
      .join("\n");

    const kbText = (knowledgeBase || [])
      .map((item: any) => `- ${item.name}: ${item.priceInfo}`)
      .join("\n");

    const prompt = `
حلل المحادثة التالية بين المساعدة الذكية "ريم" والعميل، واستخلص البيانات المطلوبة بدقة بالغة في صيغة ملف JSON.
إذا لم يتم ذكر قيمة لأي حقل، اتركه فارغاً كـ "".

المحادثة:
\"\"\"
${transcript}
\"\"\"

قاعدة الأسعار كمرجع:
${kbText}

المطلوب استخلاصه في صيغة JSON بالبنية التالية:
{
  "name": "اسم العميل الكامل",
  "mobile": "رقم الجوال",
  "email": "البريد الإلكتروني",
  "requestType": "نوع الطلب (اختر بدقة: 'عرض سعر' أو 'استفسار عام' أو 'شكوى' أو 'حجز موعد')",
  "serviceType": "الخدمة أو المنتج المطلوب",
  "quantity": "الكمية المطلوبة (إن وجدت)",
  "budget": "الميزانية المتوقعة للعميل (إن وجدت)",
  "requiredDate": "التاريخ المطلوب للتسليم (إن وجد)",
  "suggestedQuote": "العرض السعري المقترح (مثلاً: '500-1000 ريال' أو '300 ريال' بناءً على السعر التقريبي في قاعدة المعرفة المرجعية والمحادثة)",
  "summary": "ملخص موجز للمحادثة واحتياجات العميل باللغة العربية"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            mobile: { type: Type.STRING },
            email: { type: Type.STRING },
            requestType: { type: Type.STRING },
            serviceType: { type: Type.STRING },
            quantity: { type: Type.STRING },
            budget: { type: Type.STRING },
            requiredDate: { type: Type.STRING },
            suggestedQuote: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["name", "mobile", "email", "requestType", "serviceType", "quantity", "budget", "requiredDate", "suggestedQuote", "summary"],
        },
      },
    });

    const resultText = response.text || "{}";
    const extractedData = JSON.parse(resultText);

    res.json(extractedData);
  } catch (error: any) {
    console.error("Gemini Extraction API Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract lead data" });
  }
});

// API: Send WhatsApp Message via Twilio
app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { to, message, credentials } = req.body;

    const accountSid = credentials?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = credentials?.authToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = credentials?.fromNumber || process.env.TWILIO_FROM_NUMBER;

    if (!to || !message) {
      return res.status(400).json({ error: "الرجاء إدخال رقم المستلم ونص الرسالة." });
    }

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(400).json({ 
        error: "إعدادات Twilio غير مكتملة. يرجى إدخال الحساب (Account SID) والرمز (Auth Token) ورقم الإرسال في الإعدادات أو كمتغيرات بيئة." 
      });
    }

    // Clean phone number (must be international)
    let formattedTo = to.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
    if (!formattedTo.startsWith("+")) {
      if (formattedTo.startsWith("00")) {
        formattedTo = "+" + formattedTo.slice(2);
      } else if (formattedTo.startsWith("05") || formattedTo.startsWith("5")) {
        // Assume Saudi Arabia default country code if starts with 05 or 5
        const cleanDigits = formattedTo.startsWith("0") ? formattedTo.slice(1) : formattedTo;
        formattedTo = "+966" + cleanDigits;
      } else {
        formattedTo = "+" + formattedTo;
      }
    }

    const toWhatsapp = `whatsapp:${formattedTo}`;
    const fromWhatsapp = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const bodyParams = new URLSearchParams({
      To: toWhatsapp,
      From: fromWhatsapp,
      Body: message
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Twilio API Error:", data);
      return res.status(response.status).json({ 
        error: data.message || "فشل إرسال رسالة الواتساب عبر Twilio." 
      });
    }

    return res.json({ 
      success: true, 
      sid: data.sid, 
      status: data.status,
      message: "تم إرسال رسالة الواتساب بنجاح عبر Twilio!" 
    });
  } catch (error: any) {
    console.error("WhatsApp Route Error:", error);
    return res.status(500).json({ error: error.message || "حدث خطأ داخلي في الخادم." });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
