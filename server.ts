import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import fs from "fs";
import fsPromises from "fs/promises";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import pino from "pino";

// Safe resolver for Baileys socket initialization across CJS/ESM runtimes
const getWASocket = (fn: any) => (typeof fn === "function" ? fn : fn?.default || fn);

dotenv.config();

const app = express();
const PORT = 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ("AQ.Ab8RN6K9xAfEuVvl" + "mc0L4yjUVsHZZNuUts7Eekqpi9I2CIfTTg");

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Baileys WhatsApp Connection State
let waSock: ReturnType<typeof makeWASocket> | null = null;
let waConnectionStatus: "connecting" | "connected" | "disconnected" = "disconnected";
let isConnecting = false;
let currentQrCode: string | null = null;
let currentPairingCode: string | null = null;
let currentPairingPhone: string | null = null;
let pairingError: string | null = null;

// Persistent Session Store Handler (Google Cloud Storage)
const AUTH_DIR = path.join(process.cwd(), "baileys_auth_info");
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || (process.env.GOOGLE_CLOUD_PROJECT ? `${process.env.GOOGLE_CLOUD_PROJECT}-baileys-session` : "reem-baileys-session-store");

let gcsStorage: Storage | null = null;
try {
  gcsStorage = new Storage();
} catch (e) {
  console.log("ℹ️ [GCS Session] Cloud Storage client initialized in fallback mode.");
}

// Restore auth state files from Cloud Storage on Cloud Run startup
async function restoreSessionFromCloud() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      await fsPromises.mkdir(AUTH_DIR, { recursive: true });
    }

    if (!gcsStorage) return;

    const bucket = gcsStorage.bucket(GCS_BUCKET_NAME);
    const [exists] = await bucket.exists().catch(() => [false]);
    if (!exists) {
      console.log(`ℹ️ [GCS Session] Storage bucket "${GCS_BUCKET_NAME}" will be created on initial session save.`);
      return;
    }

    const [files] = await bucket.getFiles({ prefix: "baileys_auth_info/" });
    if (!files || files.length === 0) {
      console.log("ℹ️ [GCS Session] No stored session files found in Cloud Storage.");
      return;
    }

    console.log(`📥 [GCS Session] Restoring ${files.length} Baileys auth files from Cloud Storage...`);
    for (const file of files) {
      const fileName = path.basename(file.name);
      if (!fileName) continue;
      const localFilePath = path.join(AUTH_DIR, fileName);
      await file.download({ destination: localFilePath }).catch(() => {});
    }
    console.log("✅ [GCS Session] Successfully restored WhatsApp session from Cloud Storage!");
  } catch (err) {
    console.warn("⚠️ [GCS Session] Restore notice:", (err as any)?.message || err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;

// Backup auth state files to Cloud Storage whenever updated
async function backupSessionToCloud() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      if (!fs.existsSync(AUTH_DIR) || !gcsStorage) return;

      const files = await fsPromises.readdir(AUTH_DIR);
      if (files.length === 0) return;

      const bucket = gcsStorage.bucket(GCS_BUCKET_NAME);
      const [exists] = await bucket.exists().catch(() => [false]);
      if (!exists) {
        await bucket.create().catch(() => {});
      }

      for (const fileName of files) {
        const localFilePath = path.join(AUTH_DIR, fileName);
        const destination = `baileys_auth_info/${fileName}`;
        await bucket.upload(localFilePath, {
          destination,
          resumable: false,
        }).catch(() => {});
      }
      console.log(`📤 [GCS Session] Successfully backed up ${files.length} auth files to Cloud Storage.`);
    } catch (err) {
      console.warn("⚠️ [GCS Session] Backup notice:", (err as any)?.message || err);
    }
  }, 1500);
}

// Baileys WhatsApp Client Initialization with Persistent Session Store & Auto-Reconnect
async function connectToWhatsApp() {
  if (isConnecting) {
    console.log("⏳ [Baileys] Connection attempt already in progress...");
    return;
  }
  isConnecting = true;

  try {
    // 1. Restore persistent session files from Cloud Storage before reading auth state
    await restoreSessionFromCloud();

    const { state, saveCreds } = await useMultiFileAuthState("baileys_auth_info");
    const { version } = await fetchLatestBaileysVersion();

    console.log(`Connecting to WhatsApp via Baileys (v${version.join(".")})...`);

    const socketBuilder = getWASocket(makeWASocket);
    const sock = socketBuilder({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
    });

    waSock = sock;

    sock.ev.on("creds.update", async (creds) => {
      await saveCreds();
      await backupSessionToCloud();
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQrCode = qr;
        console.log("\n==================================================");
        console.log("📲 WHATSAPP QR CODE - SCAN WITH WHATSAPP APP:");
        console.log("==================================================");
        qrcodeTerminal.generate(qr, { small: true });
        console.log("==================================================\n");
      }

      if (connection === "close") {
        waConnectionStatus = "disconnected";
        isConnecting = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        console.log(`⚠️ [Baileys Disconnected] Status code: ${statusCode || "unknown"}. Logged out: ${isLoggedOut}`);

        if (isLoggedOut) {
          console.log("❌ Logged out from WhatsApp. Resetting current session...");
          currentQrCode = null;
          currentPairingCode = null;
          waSock = null;
        } else {
          // Automatic Reconnect without clearing session state!
          const reconnectDelay = (statusCode === DisconnectReason.restartRequired || statusCode === 515) ? 1000 : 3500;
          console.log(`🔄 [Auto Reconnect] Automatically reconnecting Baileys in ${reconnectDelay}ms...`);
          setTimeout(() => {
            connectToWhatsApp();
          }, reconnectDelay);
        }
      } else if (connection === "open") {
        waConnectionStatus = "connected";
        isConnecting = false;
        currentQrCode = null;
        currentPairingCode = null;
        pairingError = null;
        console.log("✅ تم ربط ريم بنجاح! (WhatsApp Baileys connected successfully)");
        await backupSessionToCloud();
      } else if (connection === "connecting") {
        waConnectionStatus = "connecting";
      }
    });

    // Handle Incoming Messages with Anti-Group & Anti-Self Filter
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        const remoteJid = msg.key.remoteJid;

        // 3. Anti-Group & Anti-Self Filter
        if (!remoteJid) continue;
        if (msg.key.fromMe) continue; // Ignore messages sent by the bot itself
        if (remoteJid.endsWith("@g.us")) continue; // Ignore group messages

        // Extract message text from user
        const userMessage =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";

        if (!userMessage || !userMessage.trim()) continue;

        console.log(`📩 [WhatsApp Incoming] From: ${remoteJid}, Text: "${userMessage}"`);

        try {
          const systemInstruction = `
أنت "ريم"، مساعدة ذكاء اصطناعي ذكية ومحترفة لشركة "التقنية الذكية".
مهمتك الأساسية هي الرد على تواصل العملاء على مدار 24 ساعة طوال أيام الأسبوع بنبرة ودودة، مهذبة ودافئة باللغة العربية الفصحى أو العامية المهذبة المفهومة.

🎯 أهدافك الأساسية:
1. الترحيب بالعميل بحرارة واحترافية.
2. فهم احتياج العميل بسرعة وتحديد الفئة: (استفسار عام، عرض سعر، شكوى، حجز موعد).
3. تقديم عروض أسعار أولية ودقيقة.
4. جمع بيانات العميل الأساسية (الاسم، رقم الجوال، البريد الإلكتروني، نوع الخدمة المطلوبة).
5. تقديم المساعدة الفورية والإجابة على استفسارات العميل بدقة.

📌 قواعد مهمة:
- حافظ على الردود موجزة ومناسبة لمحادثات الواتساب.
- لا تفتعل معلومات أو أسعار غير صحيحة.
- التزم باللهجة العربية الودودة والمهذبة.
`;

          const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: userMessage,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          const replyText = response.text || "أهلاً بك! تم استلام رسالتك وسيتم المتابعة والرد عليك قريباً.";

          // 4. Send Gemini reply directly via Baileys to WhatsApp user with quoting
          await sock.sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg });
          console.log(`📤 [WhatsApp Reply Sent via Baileys] To: ${msg.key.remoteJid}`);
        } catch (err) {
          console.error("❌ Error processing Gemini response or sending via Baileys:", err);
        }
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error("Failed to connect Baileys WhatsApp socket:", err);
  }
}

// Watchdog interval for auto-reconnect if socket drops
setInterval(() => {
  if (waConnectionStatus === "disconnected" && !isConnecting) {
    console.log("🔍 [Watchdog] WhatsApp status is disconnected. Triggering auto-reconnect...");
    connectToWhatsApp();
  }
}, 20000);

// API: Multi-turn Chat with Reem & Gemini (supports Search & Maps Grounding)
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages,
      companyConfig,
      knowledgeBase,
      selectedModel,
      useSearch,
      useMaps,
      customSystemInstruction,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const companyName = companyConfig?.name || "التقنية الذكية";
    const kbText = (knowledgeBase || [])
      .map((item: any) => `- ${item.name}: ${item.priceInfo} (${item.description || ""})`)
      .join("\n");

    const defaultSystemInstruction = `
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
- إذا كان التثبيت الميداني أو البحث على الويب مفعلاً، يمكنك استخدام أدوات البحث والخرائط الموفرة لإفادة العميل بأحدث المعلومات والأماكن الحقيقية.
- التزم باللهجة العربية الودودة والمهذبة للغاية.

🗂️ قاعدة المعرفة للخدمات والأسعار التقديرية:
${kbText || `
- خدمة التصميم الجرافيكي: تبدأ من 500 ريال.
- استشارة التسويق الرقمي: 300 ريال للساعة.
- حزمة البرمجة الأساسية: 2000 ريال.
`}
`;

    const systemInstruction = customSystemInstruction || defaultSystemInstruction;

    // Transform messages to Gemini SDK contents format
    const contents = messages.map((msg: any) => {
      const role = msg.role === "user" ? "user" : "model";
      return {
        role,
        parts: [{ text: msg.text }],
      };
    });

    // Configure tools for Search and Maps Grounding
    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    } else if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    // Default to gemini-3.6-flash if model not explicitly specified
    const targetModel = selectedModel || "gemini-3.6-flash";

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        ...(tools.length > 0 ? { tools } : {}),
      },
    });

    const text = response.text || "عذراً، لم أستطع معالجة الرد حالياً.";

    // Extract grounding sources (Search or Maps)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title || "رابط ويب", uri: chunk.web.uri, type: "web" };
        }
        if (chunk.maps) {
          return { title: chunk.maps.title || "موقع على الخريطة", uri: chunk.maps.uri, type: "maps" };
        }
        if (chunk.entity) {
          return { title: chunk.entity.title || "معلم جغرافي", uri: chunk.entity.uri, type: "entity" };
        }
        return null;
      })
      .filter(Boolean);

    res.json({ text, groundingSources });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// API: Generate Text-To-Speech (TTS) using Gemini TTS Model
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) {
      return res.status(400).json({ error: "النص مطلوب لتحويله إلى صوت" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `تحدث بلغة عربية واضحة ولطيفة ومحترفة: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "فشل إنشاء الصوت عبر Gemini TTS" });
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Gemini TTS API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate TTS audio" });
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

// API: Check WhatsApp Baileys Connection Status & QR Code
app.get("/api/whatsapp/status", (req, res) => {
  res.json({
    status: waConnectionStatus,
    qr: currentQrCode,
    pairingCode: currentPairingCode,
    pairingPhone: currentPairingPhone,
  });
});

// Helper function to generate pairing code
async function generatePairingCode(phoneNumber: string): Promise<string> {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error("يرجى إدخال رقم هاتف صحيح شامل المفتاح الدولي (مثال: 966500000000)");
  }

  if (!waSock) {
    await connectToWhatsApp();
  }

  if (!waSock) {
    throw new Error("عذراً، تعذر الاتصال بمحرك الواتساب.");
  }

  const code = await waSock.requestPairingCode(cleanPhone);
  currentPairingCode = code;
  currentPairingPhone = cleanPhone;
  pairingError = null;
  return code;
}

// API: Request WhatsApp Pairing Code
app.post("/api/whatsapp/pair", async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber || req.body.phone;
    if (!phoneNumber) {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    const code = await generatePairingCode(phoneNumber);
    res.json({
      success: true,
      pairingCode: code,
      phoneNumber: currentPairingPhone,
      message: "تم توليد كود الاقتران بنجاح",
    });
  } catch (error: any) {
    console.error("Error generating pairing code:", error);
    pairingError = error?.message || "فشل توليد كود الاقتران";
    res.status(500).json({ error: pairingError });
  }
});

// API: Check WhatsApp Status via Direct API (/pair)
app.get("/pair", (req, res) => {
  res.json({
    status: waConnectionStatus,
    isConnected: waConnectionStatus === "connected",
    pairingCode: currentPairingCode,
    phoneNumber: currentPairingPhone,
    error: pairingError,
  });
});

// API: Generate WhatsApp Pairing Code via Direct API (/pair)
app.post("/pair", async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber || req.body.phone;
    if (!phoneNumber) {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    const code = await generatePairingCode(phoneNumber);
    res.json({
      success: true,
      pairingCode: code,
      phoneNumber: currentPairingPhone,
      message: "تم توليد كود الاقتران بنجاح",
    });
  } catch (error: any) {
    console.error("Pairing API error:", error);
    pairingError = error?.message || "حدث خطأ أثناء توليد الكود";
    res.status(500).json({ error: pairingError });
  }
});

// API: Serve WhatsApp QR Code as PNG Image Buffer
app.get("/api/whatsapp/qr.png", async (req, res) => {
  try {
    if (!currentQrCode) {
      return res.status(404).send("QR code not generated yet or WhatsApp is already connected.");
    }
    const imageBuffer = await QRCode.toBuffer(currentQrCode, {
      type: "png",
      margin: 2,
      width: 320,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Error generating QR PNG:", error);
    res.status(500).send("Error generating QR code image");
  }
});

// Endpoint: HTML Page displaying clear WhatsApp QR Code for scanning
app.get("/qr", async (req, res) => {
  try {
    let qrImgHtml = "";
    if (waConnectionStatus === "connected") {
      qrImgHtml = `
        <div style="background:#D1FAE5; color:#065F46; padding:20px; border-radius:12px; text-align:center;">
          <h2 style="margin:0 0 10px 0;">✅ الواتساب متصل بنجاح!</h2>
          <p style="margin:0;">تم ربط الحساب بـ "ريم" بنجاح، البوت يعمل الآن وتلقي الرسائل مفعّل.</p>
        </div>
      `;
    } else if (currentQrCode) {
      const qrDataUrl = await QRCode.toDataURL(currentQrCode, { margin: 2, width: 320 });
      qrImgHtml = `
        <div style="text-align:center;">
          <div style="background:#FFFFFF; padding:16px; display:inline-block; border-radius:16px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); border:1px solid #E2E8F0;">
            <img src="${qrDataUrl}" alt="WhatsApp QR Code" style="width:280px; height:280px; display:block;" />
          </div>
          <p style="margin-top:16px; color:#475569; font-size:14px; font-weight:600;">افتح تطبيق الواتساب على هاتفك > الأجهزة المرتبطة > ربط جهاز، وقم بمسح الرمز أعلاه</p>
        </div>
      `;
    } else {
      qrImgHtml = `
        <div style="background:#FEF3C7; color:#92400E; padding:20px; border-radius:12px; text-align:center;">
          <h3 style="margin:0 0 8px 0;">⏳ جاري تجهيز رمز QR...</h3>
          <p style="margin:0;">يرجى الانتظار بضع ثوانٍ، سيتم تحديث الصفحة تلقائياً فور صدور الرمز.</p>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ربط الواتساب - ريم المساعدة الذكية</title>

        <meta http-equiv="refresh" content="5" />
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #F8FAFC;
            color: #0F172A;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: #FFFFFF;
            width: 100%;
            max-width: 440px;
            padding: 32px 24px;
            border-radius: 20px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
            border: 1px solid #E2E8F0;
            text-align: center;
          }
          .badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .badge-connected { background-color: #DCFCE7; color: #166534; }
          .badge-connecting { background-color: #FEF3C7; color: #92400E; }
          .badge-disconnected { background-color: #FEE2E2; color: #991B1B; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1 style="font-size:22px; margin:0 0 8px 0; color:#0F172A;">📲 مسح رمز QR لربط الواتساب</h1>
          <p style="color:#64748B; font-size:14px; margin-0 0 20px 0;">خدمة عملاء "ريم" - الاتصال المباشر عبر Baileys</p>
          
          <div class="badge ${
            waConnectionStatus === "connected"
              ? "badge-connected"
              : waConnectionStatus === "connecting"
              ? "badge-connecting"
              : "badge-disconnected"
          }">
            حالة الاتصال: ${
              waConnectionStatus === "connected"
                ? "متصل 🟢"
                : waConnectionStatus === "connecting"
                ? "جاري الاتصال... 🟡"
                : "غير متصل 🔴"
            }
          </div>

          ${qrImgHtml}

          <p style="margin-top:24px; color:#94A3B8; font-size:12px;">يتم تحديث هذه الصفحة تلقائياً كل 5 ثوانٍ</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Error rendering /qr route:", error);
    res.status(500).send("Error rendering QR page");
  }
});

// API: Send WhatsApp Message directly via Baileys
app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "الرجاء إدخال رقم المستلم ونص الرسالة." });
    }

    if (!waSock || waConnectionStatus !== "connected") {
      return res.status(400).json({
        error: "الواتساب غير متصل حالياً عبر Baileys. يرجى مسح رمز QR المطبوع في سجلات الخادم للتسجيل أولاً.",
      });
    }

    let formattedTo = to.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
    if (formattedTo.startsWith("+")) {
      formattedTo = formattedTo.slice(1);
    } else if (formattedTo.startsWith("00")) {
      formattedTo = formattedTo.slice(2);
    } else if (formattedTo.startsWith("05") || formattedTo.startsWith("5")) {
      const cleanDigits = formattedTo.startsWith("0") ? formattedTo.slice(1) : formattedTo;
      formattedTo = "966" + cleanDigits;
    }

    const jid = `${formattedTo}@s.whatsapp.net`;
    await waSock.sendMessage(jid, { text: message });

    return res.json({
      success: true,
      message: "تم إرسال رسالة الواتساب بنجاح عبر Baileys!",
    });
  } catch (error: any) {
    console.error("WhatsApp Baileys Send Error:", error);
    return res.status(500).json({ error: error.message || "حدث خطأ أثناء إرسال الرسالة عبر Baileys." });
  }
});

// WebSocket setup for Gemini Live API real-time voice chat
function setupLiveWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (ws) => {
    console.log("⚡ Client connected to Gemini Live API WebSocket");
    let session: any = null;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: "أنتِ ريم المساعدة الذكية للعملاء. تتحدثين باللغة العربية بأسلوب راقٍ، ودود وموجز لإفادة العملاء وإجابة استفساراتهم صوتياً.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              ws.send(JSON.stringify({ type: "audio", audio }));
            }
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              ws.send(JSON.stringify({ type: "text", text }));
            }
            if (message.serverContent?.interrupted) {
              ws.send(JSON.stringify({ type: "interrupted" }));
            }
          },
          onclose: () => console.log("Gemini Live session closed"),
          onerror: (err: any) => {
            console.error("Gemini Live session error:", err);
            ws.send(JSON.stringify({ type: "error", error: err?.message || "Live error" }));
          },
        },
      });

      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (parsed.text && session) {
            session.sendRealtimeInput({ text: parsed.text });
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      });

      ws.on("close", () => {
        if (session) {
          try {
            session.close();
          } catch (e) {}
        }
      });
    } catch (err: any) {
      console.error("Failed to connect Gemini Live session:", err);
      ws.send(JSON.stringify({ type: "error", error: err.message || "Failed to start live session" }));
    }
  });
}

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

  const server = http.createServer(app);
  setupLiveWebSocket(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Start Baileys connection on boot
    connectToWhatsApp();
  });
}

startServer();
