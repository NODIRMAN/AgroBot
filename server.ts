import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Helper to check if API key exists, otherwise throw clear error
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Plant diagnosis endpoint
  app.post("/api/diagnose", async (req, res) => {
    try {
      const { crop, part, symptoms, distribution, image } = req.body;

      let ai;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }

      // Prepare contents for Gemini
      const textPart = {
        text: `You are a specialized agricultural diagnostic expert for farmers, agronomists, and home gardeners in Uzbekistan.
Your task is to analyze plant health problems and provide practical, field-ready recommendations.

The user has submitted the following details:
- Crop/Plant: ${crop || "Not specified"}
- Affected part: ${part || "Not specified"}
- Symptoms: ${symptoms || "Not specified"}
- Distribution/Pattern in field or greenhouse: ${distribution || "Not specified"}

If the user's input (symptoms or uploaded image) is completely unrelated to agriculture, plants, farming, gardening, or plant diseases/pests:
Do not answer the user's question or engage in the off-topic discussion.
Politely explain that you are an AI agricultural diagnostic expert specifically trained for plant health in Uzbekistan, and ask them to ask a question exclusively related to crops, plant diseases, pests, or gardening.
You must provide this friendly refusal in both Ўзбекча and Русский matching this structure exactly:
Ўзбекча — Кирилл алифбосида:
[Редд этиш матни (полиза рад жавоби)]

Русский:
[Текст вежливого отказа]

Otherwise, analyze the plant health problem under the climatic and production conditions of Uzbekistan.
Provide the output in exactly this format (do not change any headers or wording, write the actual diagnostics in Uzbek Cyrillic first, followed by the Russian section):

Ўзбекча — Кирилл алифбосида
Қисқа хулоса
[2–3 sentence summary of the likely problem]

Диагноз
Экин: [Selected or detected crop]
Аниқланган муаммо: [Likely plant disease, pest, nutrient deficiency, or physiological disorder]
Ишонч даражаси: [High / Medium / Low]
Асосий белгилари: [Visible signs supporting diagnosis]
Эҳтимолий сабаблар: [Primary and secondary causes]
Ўзбекистон шароити ҳисобга олинди: [Explain how Uzbekistan's conditions like hot/dry climate, alkaline/saline soils, diurnal temperature swings, irrigation-related stress, greenhouse vs open-field are considered]

Зудлик билан бажариладиган ишлар
[Urgent practical tasks]

Даволаш режаси
1. Профессионал анъанавий усул
[Field-level commercial agronomic treatments. Registered chemicals, fungicides, insecticides, or fertilizers. Mention that all chemical use must follow local registration, label instructions, safety interval, and PPE requirements.]

2. Органик усул
[Natural and biological methods. Beneficial microbes, Trichoderma, Bacillus, Beauveria, neem-based products, organic amendments, compost, etc.]

3. Уй шароитидаги усул
[Safe simple home gardener remedies. Pruning diseased leaves, improving ventilation, mild soap, ash, watering adjustments. No unsafe folk remedies or aggressive mixtures.]

Олдини олиш
[Preventive actions, cultural methods, crop rotation, soil management]

Қўшимча текшириш керак бўлган маълумотлар
[Additional observations or missing info needed to increase confidence]

Русский
Краткое заключение
[Russian translation of the 2-3 sentence summary]

Диагноз
Культура: [Selected or detected crop in Russian]
Выявленная проблема: [Problem name in Russian]
Уровень уверенности: [High / Medium / Low in Russian]
Основные признаки: [Visible signs in Russian]
Возможные причины: [Possible causes in Russian]
Условия Узбекистана учтены: [Explanation of Uzbek conditions in Russian]

Срочные действия
[Urgent practical tasks in Russian]

План лечения
1. Профессиональный традиционный подход
[Commercial treatments with chemical safety notes in Russian]

2. Органический подход
[Biological/organic methods in Russian]

3. Домашние условия
[Simple safe home remedies in Russian]

Профилактика
[Preventive actions in Russian]

Дополнительные данные для проверки
[Additional observations needed in Russian]
`
      };

      let contents: any = textPart;

      if (image) {
        // Base64 format: data:image/jpeg;base64,.....
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              textPart
            ]
          };
        }
      }

      // Try to generate content with fallback models to handle high demand or unavailable status
      const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash"];
      let response = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting diagnosis using model: ${modelName}`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
          });
          if (response) {
            console.log(`Successfully generated content using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed or unavailable:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(
          lastError?.message || 
          "Сунъий интеллект моделлари банд ёки ишламаяпти. Илтимос, бир оз кутиб қайта уриниб кўринг. / Все модели ИИ сейчас перегружены. Пожалуйста, подождите немного и повторите попытку."
        );
      }

      const text = response.text || "Диагноз тайёрлаб бўлмади. / Не удалось сгенерировать диагноз.";
      res.json({ success: true, text });
    } catch (error: any) {
      console.error("Diagnosis error:", error);
      res.status(500).json({ error: error.message || "An error occurred during diagnosis." });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite integration for development, static assets for production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
