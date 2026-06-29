import React, { useState, useEffect, useRef } from "react";
import { 
  Sprout, 
  AlertTriangle, 
  Image as ImageIcon, 
  Upload, 
  FileText, 
  History, 
  Info, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  HelpCircle, 
  X, 
  Search, 
  RotateCcw, 
  Droplets, 
  Thermometer, 
  Check,
  Languages
} from "lucide-react";
import { DiagnosisRequest, SavedDiagnosis } from "./types";
import { parseUzbek, parseRussian, splitLanguages, ParsedReport } from "./utils/parser";

// Preset crops common in Uzbekistan
const COMMON_CROPS = [
  { id: "cotton", nameUz: "Ғўза (Пахта)", nameRu: "Хлопчатник (Хлопок)", category: "Техник" },
  { id: "wheat", nameUz: "Буғдой", nameRu: "Пшеница", category: "Ғалла" },
  { id: "tomato", nameUz: "Помидор", nameRu: "Томат (Помидор)", category: "Сабзавот" },
  { id: "cucumber", nameUz: "Бодринг", nameRu: "Огурец", category: "Сабзавот" },
  { id: "grape", nameUz: "Узум", nameRu: "Виноград", category: "Боғдорчилик" },
  { id: "apple", nameUz: "Олма", nameRu: "Яблоня", category: "Боғдорчилик" },
  { id: "melon", nameUz: "Қовун / Тарвуз", nameRu: "Дыня / Арбуз", category: "Полиз" },
  { id: "onion", nameUz: "Пиёз", nameRu: "Лук", category: "Сабзавот" },
];

const AFFECTED_PARTS = [
  { id: "leaves", nameUz: "Барглар", nameRu: "Листья" },
  { id: "stem", nameUz: "Поя ёки новдалар", nameRu: "Стебель или побеги" },
  { id: "fruit", nameUz: "Мева ёки ҳосил", nameRu: "Плоды" },
  { id: "roots", nameUz: "Илдиз тизими", nameRu: "Корневая система" },
  { id: "whole", nameUz: "Бутун ўсимлик", nameRu: "Все растение" },
];

const DISTRIBUTION_PATTERNS = [
  { id: "single", nameUz: "Якка тартибда (бир нечта ўсимлик)", nameRu: "Одиночные растения" },
  { id: "scattered", nameUz: "Тарқоқ ҳолда (дала бўйлаб очоқлар)", nameRu: "Очаговое распространение" },
  { id: "whole_field", nameUz: "Ялпи зарарланиш (бутун майдон/иссиқхона)", nameRu: "Сплошное поражение поля/теплицы" },
];

// Curated Uzbekistan high-quality sample cases for immediate testing
const SAMPLE_PRESETS = [
  {
    id: "preset-1",
    titleUz: "Ғўзадаги ўргимчаккана",
    titleRu: "Паутинный клещ на хлопчатнике",
    crop: "Ғўза (Пахта)",
    part: "Барглар",
    symptoms: "Баргларнинг орқа томонида майда оқ-сариқ нуқталар пайдо бўлган, ингичка тўр билан қопланган. Барглар қуриб, қизариб тўкилмоқда.",
    distribution: "Тарқоқ ҳолда (дала бўйлаб очоқлар)",
    image: "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=600&q=80",
    sampleCode: "cotton_spider_mite"
  },
  {
    id: "preset-2",
    titleUz: "Помидордаги фитофтороз",
    titleRu: "Фитофтороз на томатах",
    crop: "Помидор",
    part: "Барглар ва мевалар",
    symptoms: "Баргларда тўқ жигарранг, ҳўл доғлар пайдо бўлган. Нам ҳавода барг орқасида оқ ғубор кўринади. Меваларда ҳам қаттиқ жигарранг доғлар бор.",
    distribution: "Ялпи зарарланиш (бутун майдон/иссиқхона)",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80",
    sampleCode: "tomato_late_blight"
  },
  {
    id: "preset-3",
    titleUz: "Узумдаги оидиум (кул касаллиги)",
    titleRu: "Оидиум (мучнистая роса) винограда",
    crop: "Узум",
    part: "Бутун ўсимлик",
    symptoms: "Барг ва узум бошларида кулранг-оқ унсимон ғубор пайдо бўлган. Узум доналари ёрилиб, чириб кетяпти. Кучли балиқ ҳиди келади.",
    distribution: "Якка тартибда (бир нечта ўсимлик)",
    image: "https://images.unsplash.com/photo-1539519532150-ae9920d30618?auto=format&fit=crop&w=600&q=80",
    sampleCode: "grape_powdery_mildew"
  }
];

// Helper to convert remote sample images to Base64 easily for API
const getSampleBase64Placeholder = (code: string): string => {
  // We can provide simulated high-quality mock representations or let the system draw or fetch
  // For safety, we will just use standard illustrative vectors or simple patterns so they send well.
  return code;
};

export default function App() {
  const [crop, setCrop] = useState("");
  const [part, setPart] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [distribution, setDistribution] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Active report states
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [parsedUz, setParsedUz] = useState<ParsedReport | null>(null);
  const [parsedRu, setParsedRu] = useState<ParsedReport | null>(null);
  
  // History
  const [history, setHistory] = useState<SavedDiagnosis[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Upload drag states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("uz_plant_diagnoses");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local history", e);
      }
    }
  }, []);

  // Sync history to localStorage
  const saveToHistory = (newDiag: SavedDiagnosis) => {
    const updated = [newDiag, ...history.filter(h => h.id !== newDiag.id)].slice(0, 30);
    setHistory(updated);
    localStorage.setItem("uz_plant_diagnoses", JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem("uz_plant_diagnoses", JSON.stringify(updated));
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
      setRawResponse(null);
      setParsedUz(null);
      setParsedRu(null);
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("Ҳақиқатан ҳам барча таҳлиллар тарихини ўчириб ташламоқчимисиз? / Вы действительно хотите удалить всю историю анализов?")) {
      setHistory([]);
      localStorage.removeItem("uz_plant_diagnoses");
      setSelectedHistoryId(null);
      setRawResponse(null);
      setParsedUz(null);
      setParsedRu(null);
    }
  };

  // Handle preset click
  const applyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setCrop(preset.crop);
    setPart(preset.part);
    setSymptoms(preset.symptoms);
    setDistribution(preset.distribution);
    setImage(preset.image);
    setErrorMsg(null);
  };

  // Convert uploaded file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Рсм ҳажми жуда катта. Илтимос, 10МБ дан кичик расм юкланг. / Файл слишком большой. Загрузите фото до 10МБ.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Run the plant diagnosis using server side proxy API
  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop && !symptoms && !image) {
      setErrorMsg("Илтимос, экин турини танланг, аломатларини ёзинг ёки сурат юкланг! / Пожалуйста, выберите культуру, опишите симптомы или загрузите фото!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setRawResponse(null);
    setParsedUz(null);
    setParsedRu(null);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crop,
          part,
          symptoms,
          distribution,
          image: image?.startsWith("data:") ? image : undefined // only send real base64
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Серверда хатолик юз берди. / На сервере произошла ошибка.");
      }

      const rawText = data.text;
      setRawResponse(rawText);

      // Process and separate languages
      const { uzbekRaw, russianRaw } = splitLanguages(rawText);
      const parsedUzbek = parseUzbek(uzbekRaw);
      const parsedRussian = parseRussian(russianRaw || uzbekRaw);

      setParsedUz(parsedUzbek);
      setParsedRu(parsedRussian);

      // Save to history list
      const newSaved: SavedDiagnosis = {
        id: "diag-" + Date.now(),
        date: new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" }),
        crop: crop || parsedUzbek.diagnosis.crop || "Аниқланмади",
        part: part || "Барча қисмлар",
        symptoms: symptoms || "Сурат орқали таҳлил",
        distribution: distribution || "Якка тартибда",
        image: image || undefined,
        result: rawText,
      };
      
      saveToHistory(newSaved);
      setSelectedHistoryId(newSaved.id);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Хатолик юз берди. Илтимос, қайта уриниб кўринг. / Произошла ошибка. Пожалуйста, попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  // View historical diagnosis
  const selectHistoryItem = (item: SavedDiagnosis) => {
    setSelectedHistoryId(item.id);
    setRawResponse(item.result);
    
    const { uzbekRaw, russianRaw } = splitLanguages(item.result);
    setParsedUz(parseUzbek(uzbekRaw));
    setParsedRu(parseRussian(russianRaw || uzbekRaw));

    // Restore form values to simplify iterative workflow
    setCrop(item.crop);
    setPart(item.part);
    setSymptoms(item.symptoms);
    setDistribution(item.distribution);
    setImage(item.image || null);
    setErrorMsg(null);
  };

  // Reset form
  const handleReset = () => {
    setCrop("");
    setPart("");
    setSymptoms("");
    setDistribution("");
    setImage(null);
    setRawResponse(null);
    setParsedUz(null);
    setParsedRu(null);
    setSelectedHistoryId(null);
    setErrorMsg(null);
  };

  // Out of scope trigger demo helper
  const handleDemoOutOfScope = () => {
    setCrop("Умумий савол");
    setSymptoms("How to write a simple fast Fourier transform algorithm in Python?");
    setPart("");
    setDistribution("");
    setImage(null);
  };

  return (
    <div id="agro-diagnost-root" className="min-h-screen bg-[#FDFBF7] text-[#2D3427] flex flex-col font-sans selection:bg-[#5A6B47]/20 selection:text-[#2D3427]">
      {/* Top Banner / Header */}
      <header id="main-header" className="bg-white border-b border-[#E0DBC5] sticky top-0 z-20 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5A6B47] flex items-center justify-center text-white shadow-md">
              <Sprout className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-[#2D3427] tracking-tight">AGRO-DIAGNOST</span>
                <span className="text-[10px] bg-[#5A6B47]/10 text-[#5A6B47] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Uzbekistan</span>
              </div>
              <p className="text-[11px] text-[#8E8A7B] font-medium leading-none mt-0.5">O'zbekiston qishloq xo'jaligi mutaxassislari uchun professional diagnostika</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right text-xs text-[#8E8A7B]">
              <span className="font-semibold text-[#5A6B47]">Тошкент вақти:</span>
              <span>{new Date().toLocaleDateString("uz-UZ")} | 18:35</span>
            </div>
            <button 
              onClick={handleReset} 
              className="text-xs bg-[#F4F1EA] hover:bg-[#E9E5D8] text-[#5A6B47] font-semibold py-2 px-3 rounded-lg border border-[#E0DBC5] transition flex items-center gap-1.5"
              id="btn-new-analysis"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Янги таҳлил / Новый анализ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Inputs and History (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Diagnostic Input Form */}
          <div className="bg-white rounded-xl border border-[#E0DBC5] shadow-sm overflow-hidden" id="card-diagnostic-form">
            <div className="bg-[#F4F1EA] px-5 py-4 border-b border-[#E0DBC5] flex justify-between items-center">
              <h2 className="font-display font-bold text-[#5A6B47] text-sm tracking-wide uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#A67C52]" />
                Муаммони аниқлаш / Диагностика поля
              </h2>
              <span className="text-xs bg-[#E9E5D8] px-2 py-0.5 rounded font-mono text-[#7A7566]">v1.0</span>
            </div>

            <form onSubmit={handleDiagnose} className="p-5 space-y-4">
              
              {/* Presets and Quick Testing Assist */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#8E8A7B]">
                    Тезкор намуналар / Готовые примеры
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Синаб кўриш учун</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-left p-2 rounded-lg border border-[#E0DBC5] bg-[#FDFBF7] hover:bg-[#F4F1EA] hover:border-[#5A6B47]/50 transition text-[11px] font-medium leading-tight text-[#2D3427] flex flex-col justify-between"
                    >
                      <span className="font-bold text-[#5A6B47] block truncate">{preset.titleUz}</span>
                      <span className="text-[#8E8A7B] text-[9px] block truncate">{preset.titleRu}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F4F1EA] my-3"></div>

              {/* Crop selection */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#5A6B47] uppercase tracking-wider">
                  Экин тури / Сельскохозяйственная культура <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full bg-[#FDFBF7] border border-[#E0DBC5] rounded-lg p-2.5 text-sm text-[#2D3427] focus:outline-none focus:ring-2 focus:ring-[#5A6B47] focus:border-transparent transition appearance-none"
                    required
                  >
                    <option value="">-- Экинни танланг / Выберите культуру --</option>
                    {COMMON_CROPS.map((c) => (
                      <option key={c.id} value={c.nameUz}>
                        {c.nameUz} | {c.nameRu} ({c.category})
                      </option>
                    ))}
                    <option value="Бошқа экин">Бошқа экин / Другая культура</option>
                    <option value="Умумий савол">Умумий савол / Другой вопрос</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#7A7566]">
                    <Sprout className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Affected part selection */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#5A6B47] uppercase tracking-wider">
                  Зарарланган қисм / Пораженный орган
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AFFECTED_PARTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPart(p.nameUz)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition ${
                        part === p.nameUz
                          ? "bg-[#5A6B47] text-white border-transparent shadow-sm"
                          : "bg-[#FDFBF7] border-[#E0DBC5] text-[#2D3427] hover:bg-[#F4F1EA]"
                      }`}
                    >
                      <span className="block truncate">{p.nameUz}</span>
                      <span className="block text-[9px] opacity-75 truncate">{p.nameRu}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field distribution */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#5A6B47] uppercase tracking-wider">
                  Тарқалиш шакли / Распространение на участке
                </label>
                <select
                  value={distribution}
                  onChange={(e) => setDistribution(e.target.value)}
                  className="w-full bg-[#FDFBF7] border border-[#E0DBC5] rounded-lg p-2.5 text-xs text-[#2D3427] focus:outline-none focus:ring-2 focus:ring-[#5A6B47] focus:border-transparent transition"
                >
                  <option value="">-- Тарқалиш характери / Выберите характер --</option>
                  {DISTRIBUTION_PATTERNS.map((p) => (
                    <option key={p.id} value={p.nameUz}>
                      {p.nameUz} / {p.nameRu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image upload / Camera area with Drag and Drop */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#5A6B47] uppercase tracking-wider">
                  Касаллик ёки зараркунанда сурати / Фото повреждения (Тавсия этилади)
                </label>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition ${
                    dragActive 
                      ? "border-[#5A6B47] bg-[#5A6B47]/5" 
                      : image 
                        ? "border-[#5A6B47] bg-white" 
                        : "border-[#C5C0AF] bg-[#FDFBF7] hover:bg-[#F4F1EA]"
                  }`}
                  onClick={triggerFileInput}
                >
                  {image ? (
                    <div className="relative w-full h-full group">
                      {image.startsWith("http") ? (
                        <img 
                          src={image} 
                          alt="Uploaded plant preview" 
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <img 
                          src={image} 
                          alt="Uploaded base64 preview" 
                          className="w-full h-full object-cover rounded-md"
                        />
                      )}
                      <div className="absolute inset-0 bg-[#2D3427]/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-md">
                        <p className="text-white text-xs font-semibold bg-[#2D3427]/80 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          Алмаштириш / Заменить
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
                        title="Расмни ўчириш / Удалить фото"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-[#E9E5D8] text-[#5A6B47] rounded-full mx-auto flex items-center justify-center shadow-inner">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-[#5A6B47]">Расмни юкланг ёки судраб ташланг</span>
                        <p className="text-[10px] text-[#8E8A7B] mt-0.5">Сурат сифатли ва яқиндан олинган бўлиши аниқликни оширади</p>
                      </div>
                      <span className="text-[9px] bg-[#E9E5D8] text-[#7A7566] px-2 py-0.5 rounded font-mono">JPG, PNG ёки WEBP (Макс 10МБ)</span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Symptom description textbox */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#5A6B47] uppercase tracking-wider flex justify-between">
                  <span>Аломатлар тавсифи / Описание симптомов <span className="text-red-500">*</span></span>
                  <span className="text-[10px] lowercase text-[#8E8A7B]">Ўзбек ёки рус тилида</span>
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Масалан: Баргларда сариқ доғлар пайдо бўлди, қисман қуриш ва ингичка ўргимчак тўри бор, ҳаво жуда иссиқ ва қуруқ бўлганлиги сабабли тез тарқалмоқда..."
                  className="w-full bg-[#FDFBF7] border border-[#E0DBC5] rounded-lg p-3 text-sm text-[#2D3427] placeholder:text-[#8E8A7B] focus:outline-none focus:ring-2 focus:ring-[#5A6B47] focus:border-transparent transition h-28 resize-none"
                  required
                ></textarea>
              </div>

              {/* Validation / Error Banner */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-800 space-y-1" id="error-banner">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Хатолик юз берди / Ошибка</span>
                  </div>
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 bg-white hover:bg-[#F4F1EA] border border-[#E0DBC5] text-[#7A7566] font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Тозалаш / Сбросить
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 bg-[#5A6B47] hover:bg-[#4E5C3D] text-white font-bold py-2.5 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  id="btn-submit-diagnose"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Таҳлил қилиняпти...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Диагноз олиш / Получить диагноз</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Out-Of-Scope Trigger Demonstration Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleDemoOutOfScope}
                  className="text-[10px] text-emerald-800 hover:underline font-mono"
                  title="Ташқи мавзу саволининг рад этилишини синаш"
                >
                  [Синов] Муносиб бўлмаган мавзу саволини киритиш (FFT algorithm)
                </button>
              </div>

            </form>
          </div>

          {/* Past History Panel */}
          <div className="bg-white rounded-xl border border-[#E0DBC5] shadow-sm overflow-hidden" id="card-history">
            <div className="bg-[#F4F1EA] px-5 py-3 border-b border-[#E0DBC5] flex justify-between items-center">
              <h3 className="font-display font-bold text-[#5A6B47] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4" />
                Таҳлиллар тарихи / История ({history.length})
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-[10px] text-red-600 hover:underline font-semibold"
                >
                  Тозалаш / Очистить
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8E8A7B] italic">
                Аввалги таҳлиллар мавжуд эмас. Янги таҳлилни бошланг.
                <br />
                История пуста. Начните первый анализ.
              </div>
            ) : (
              <div className="divide-y divide-[#F4F1EA] max-h-60 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectHistoryItem(item)}
                    className={`p-3 text-xs cursor-pointer transition flex justify-between items-start ${
                      selectedHistoryId === item.id 
                        ? "bg-[#5A6B47]/10 border-l-4 border-[#5A6B47]" 
                        : "hover:bg-[#FDFBF7]"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#2D3427] truncate">{item.crop}</span>
                        <span className="text-[10px] bg-[#E9E5D8] px-1.5 py-0.5 rounded text-[#7A7566] text-[9px] truncate">{item.part}</span>
                      </div>
                      <p className="text-[10px] text-[#8E8A7B] truncate italic">
                        {item.symptoms}
                      </p>
                      <span className="text-[9px] text-[#8E8A7B] block font-mono">
                        {item.date}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="text-red-500 hover:text-red-700 p-1 opacity-60 hover:opacity-100 transition"
                      title="Ўчириш / Удалить"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uzbekistan conditions informational banner */}
          <div className="bg-[#E9E5D8] rounded-xl p-4 border border-[#C5C0AF] text-[11px] text-[#7A7566] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#2D3427]">
              <Info className="w-3.5 h-3.5 text-[#5A6B47]" />
              <span>ЎЗБЕКИСТОН ИҚЛИМИ ВА ТУПРОҚ ШАРОИТИ</span>
            </div>
            <p className="leading-relaxed">
              Диагностика тизими республикамизнинг ўзига хос иқлим шароитларини – <strong>ёздаги кучли жазирама ва қуруқ шамолларни (гармсел)</strong>, 
              кундузги ва тунги ҳароратнинг кескин тебранишини, <strong>айрим ҳудудлардаги тупроқнинг шўрланиши</strong> ҳамда ирригация/суғориш билан боғлиқ 
              стрессларни ҳисобга олади.
            </p>
          </div>

        </div>

        {/* Right Side: Diagnosis Results with Double Language (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Empty state / Welcome info */}
          {!rawResponse && !loading && (
            <div className="bg-white rounded-xl border border-[#E0DBC5] p-8 text-center space-y-6 shadow-sm" id="welcome-panel">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 bg-[#5A6B47]/10 text-[#5A6B47] rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <Sprout className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#2D3427]">
                  Қишлоқ хўжалиги экинларини диагностика қилиш тизими
                </h3>
                <p className="text-xs text-[#7A7566] leading-relaxed">
                  Бу ерда Ўзбекистоннинг суғориладиган деҳқончилик шароитига мослаштирилган батафсил диагноз ва уч босқичли даволаш режаси (Профессионал, Органик, Уй шароитида) кўрсатилади.
                </p>
              </div>

              <div className="border-t border-[#F4F1EA] my-4"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-lg bg-[#FDFBF7] border border-[#E0DBC5] space-y-2">
                  <span className="text-xs font-bold text-[#5A6B47] uppercase tracking-wide">👨‍🌾 Деҳқон ва фермерларга:</span>
                  <p className="text-[11px] text-[#7A7566] leading-relaxed">
                    Катта майдонлар ва тижорат ишлаб чиқариши учун рўйхатдан ўтган кимёвий воситалар, агротехник тадбирлар ва хавфсизлик қоидалари.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#FDFBF7] border border-[#E0DBC5] space-y-2">
                  <span className="text-xs font-bold text-[#A67C52] uppercase tracking-wide">🏡 Томорқа ва боғдорларга:</span>
                  <p className="text-[11px] text-[#7A7566] leading-relaxed">
                    Кичик ер эгалари ва ҳаваскор боғбонлар учун уй шароитида осон топиладиган, соғлиқ ва атроф-муҳитга безарар табиий чоралар.
                  </p>
                </div>
              </div>

              {/* Visual guidance block */}
              <div className="bg-[#F4F1EA] p-3 rounded-lg flex items-center justify-center gap-2 text-xs text-[#5A6B47]">
                <ShieldAlert className="w-4 h-4" />
                <span className="font-semibold">Барча тавсиялар Давлат Кимё комиссияси стандартлари асосида тақдим этилади.</span>
              </div>
            </div>
          )}

          {/* Loading state visual shimmer/spinner */}
          {loading && (
            <div className="bg-white rounded-xl border border-[#E0DBC5] p-12 text-center space-y-4 shadow-sm">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-[#F4F1EA] rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-[#5A6B47] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[#5A6B47]">
                  <Sprout className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-[#2D3427]">Германий сунъий интеллект модели сурат ва маълумотларни таҳлил қилмоқда...</p>
                <p className="text-xs text-[#8E8A7B]">Ўзбекистон тупроқ ва иқлим параметрлари интеграция қилинмоқда</p>
              </div>
              <div className="max-w-xs mx-auto bg-[#F4F1EA] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#5A6B47] h-full animate-[shimmer_1.5s_infinite] w-3/4 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Diagnosis Reports (Uzbek first, Russian second) */}
          {rawResponse && !loading && (
            <div className="space-y-6" id="diagnosis-results-block">

              {/* General Response Status Info */}
              <div className="bg-white p-4 rounded-xl border border-[#E0DBC5] flex flex-wrap justify-between items-center gap-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F0EBE0] text-[#5A6B47] rounded-full font-bold">
                    ID: #UZ-{selectedHistoryId ? selectedHistoryId.split("-")[1]?.substring(6) : Math.floor(1000 + Math.random() * 9000)}
                  </span>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${
                    (parsedUz?.diagnosis.confidence?.includes("Юқори") || parsedUz?.diagnosis.confidence?.toLowerCase().includes("high"))
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    Ишонч: {parsedUz?.diagnosis.confidence || "Юқори / Высокий"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8E8A7B]">
                  <Languages className="w-3.5 h-3.5 text-[#5A6B47]" />
                  <span>Икки тилли таҳлил (Ўзбек / Русский)</span>
                </div>
              </div>

              {/* UZBEK SECTION (Cyrillic) */}
              <div className="bg-white rounded-xl border-l-4 border-l-[#5A6B47] border-y border-r border-[#E0DBC5] p-6 space-y-6 shadow-sm">
                
                {/* Language Title Header */}
                <div className="flex justify-between items-center border-b border-[#F4F1EA] pb-3">
                  <h3 className="font-serif italic font-bold text-[#5A6B47] text-xl tracking-tight">
                    Ўзбекча — Кирилл алифбосида
                  </h3>
                  <span className="text-[10px] bg-[#5A6B47]/15 text-[#5A6B47] font-bold px-2 py-0.5 rounded">UZ</span>
                </div>

                {/* Short Summary (Қисқа хулоса) */}
                {parsedUz?.summary && (
                  <div className="bg-[#F9F7F2] p-4 border-l-4 border-[#A67C52] rounded-r-lg">
                    <h4 className="font-bold text-[#A67C52] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Қисқа хулоса
                    </h4>
                    <p className="text-xs text-[#2D3427] leading-relaxed whitespace-pre-line">
                      {parsedUz.summary}
                    </p>
                  </div>
                )}

                {/* Diagnosis Table/Cards */}
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-[#5A6B47] text-xs uppercase tracking-wider border-b border-[#F4F1EA] pb-1">
                    Диагноз тафсилотлари
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5]">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Экин:</span>
                      <span className="font-semibold text-[#2D3427]">{parsedUz?.diagnosis.crop || crop || "Аниқланди"}</span>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5]">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Муаммо:</span>
                      <span className="font-bold text-red-700">{parsedUz?.diagnosis.problem || "Аниқланди"}</span>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5] sm:col-span-2">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Асосий белгилари:</span>
                      <p className="text-[#2D3427] mt-0.5 leading-relaxed">{parsedUz?.diagnosis.signs || "Аниқ белгилари бор"}</p>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5] sm:col-span-2">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Эҳтимолий сабаблар:</span>
                      <p className="text-[#2D3427] mt-0.5 leading-relaxed">{parsedUz?.diagnosis.causes || "Кўрсатилган"}</p>
                    </div>
                    {parsedUz?.diagnosis.uzbekistanConditions && (
                      <div className="bg-[#5A6B47]/5 p-3 rounded-lg border border-[#5A6B47]/20 sm:col-span-2 text-emerald-950">
                        <span className="font-bold block uppercase text-[10px] text-[#5A6B47] tracking-wider">Ўзбекистон шароити ҳисобга олинди:</span>
                        <p className="mt-0.5 leading-relaxed font-medium">{parsedUz.diagnosis.uzbekistanConditions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Urgent Actions (Зудлик билан бажариладиган ишлар) */}
                {parsedUz?.urgentActions && (
                  <div className="bg-amber-50 p-4 border-l-4 border-amber-600 rounded-r-lg text-xs space-y-1">
                    <h4 className="font-bold text-amber-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-700" />
                      Зудлик билан бажариладиган ишлар
                    </h4>
                    <p className="leading-relaxed whitespace-pre-line text-amber-950">
                      {parsedUz.urgentActions}
                    </p>
                  </div>
                )}

                {/* Remedies (Даволаш режаси) */}
                <div className="space-y-4">
                  <h4 className="font-display font-semibold text-[#5A6B47] text-xs uppercase tracking-wider border-b border-[#F4F1EA] pb-1">
                    Даволаш режаси (3 хил усул)
                  </h4>
                  
                  <div className="space-y-3 text-xs">
                    
                    {/* 1. Professional Conventional */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#5A6B47] text-white font-mono text-xs flex items-center justify-center font-bold">1</span>
                        <h5 className="font-bold text-[#5A6B47] uppercase tracking-wide">Профессионал анъанавий усул</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedUz?.treatments.conventional || "Мавжуд эмас"}
                      </p>
                      <div className="mt-2 pl-8 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-150 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
                        <span>
                          <strong>Диққат:</strong> Барча кимёвий воситаларни қўллашда маҳаллий рўйхатдан ўтганлик, қадоқдаги йўриқнома, хавфсизлик муддати, доза ва шахсий ҳимоя воситалари (ШҲВ) талабларига қатъий риоя қилинг. Кимёвий моддалар билан ишлашда лицензияланган агроном билан маслаҳатлашинг.
                        </span>
                      </div>
                    </div>

                    {/* 2. Organic */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#A67C52] text-white font-mono text-xs flex items-center justify-center font-bold">2</span>
                        <h5 className="font-bold text-[#A67C52] uppercase tracking-wide">Органик усул</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedUz?.treatments.organic || "Мавжуд эмас"}
                      </p>
                    </div>

                    {/* 3. Household */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#7A7566] text-white font-mono text-xs flex items-center justify-center font-bold">3</span>
                        <h5 className="font-bold text-[#7A7566] uppercase tracking-wide">Уй шароитидаги усул</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedUz?.treatments.household || "Мавжуд эмас"}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Prevention (Олдини олиш) */}
                {parsedUz?.prevention && (
                  <div className="space-y-2 border-t border-[#F4F1EA] pt-4 text-xs">
                    <h4 className="font-bold text-[#5A6B47] uppercase tracking-wider text-[11px]">
                      Олдини олиш ва агротехника
                    </h4>
                    <p className="leading-relaxed text-[#2D3427] whitespace-pre-line">
                      {parsedUz.prevention}
                    </p>
                  </div>
                )}

                {/* Missing Info Needed (Қўшимча текшириш керак бўлган маълумотлар) */}
                {parsedUz?.additionalInfo && (
                  <div className="p-3 bg-[#F4F1EA] rounded-lg border border-[#E0DBC5] text-xs text-[#7A7566] space-y-1">
                    <span className="font-bold uppercase text-[10px] text-[#2D3427] block">Қўшимча текшириш керак бўлган маълумотлар:</span>
                    <p className="italic leading-relaxed whitespace-pre-line">
                      {parsedUz.additionalInfo}
                    </p>
                  </div>
                )}

              </div>


              {/* RUSSIAN SECTION */}
              <div className="bg-white rounded-xl border-l-4 border-l-[#A67C52] border-y border-r border-[#E0DBC5] p-6 space-y-6 shadow-sm">
                
                {/* Language Title Header */}
                <div className="flex justify-between items-center border-b border-[#F4F1EA] pb-3">
                  <h3 className="font-serif italic font-bold text-[#A67C52] text-xl tracking-tight">
                    Русский перевод
                  </h3>
                  <span className="text-[10px] bg-[#A67C52]/15 text-[#A67C52] font-bold px-2 py-0.5 rounded">RU</span>
                </div>

                {/* Short Summary (Краткое заключение) */}
                {parsedRu?.summary && (
                  <div className="bg-[#F1F3EF] p-4 border-l-4 border-[#5A6B47] rounded-r-lg">
                    <h4 className="font-bold text-[#5A6B47] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Краткое заключение
                    </h4>
                    <p className="text-xs text-[#2D3427] leading-relaxed whitespace-pre-line">
                      {parsedRu.summary}
                    </p>
                  </div>
                )}

                {/* Diagnosis Table/Cards */}
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-[#5A6B47] text-xs uppercase tracking-wider border-b border-[#F4F1EA] pb-1">
                    Детали диагноза
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5]">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Культура:</span>
                      <span className="font-semibold text-[#2D3427]">{parsedRu?.diagnosis.crop || "Определена"}</span>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5]">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Проблема:</span>
                      <span className="font-bold text-red-700">{parsedRu?.diagnosis.problem || "Определена"}</span>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5] sm:col-span-2">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Основные признаки:</span>
                      <p className="text-[#2D3427] mt-0.5 leading-relaxed">{parsedRu?.diagnosis.signs || "Указаны"}</p>
                    </div>
                    <div className="bg-[#F4F1EA]/50 p-2.5 rounded-lg border border-[#E0DBC5] sm:col-span-2">
                      <span className="text-[#8E8A7B] font-bold block uppercase text-[10px] tracking-wider">Возможные причины:</span>
                      <p className="text-[#2D3427] mt-0.5 leading-relaxed">{parsedRu?.diagnosis.causes || "Указаны"}</p>
                    </div>
                    {parsedRu?.diagnosis.uzbekistanConditions && (
                      <div className="bg-[#A67C52]/5 p-3 rounded-lg border border-[#A67C52]/20 sm:col-span-2 text-amber-950">
                        <span className="font-bold block uppercase text-[10px] text-[#A67C52] tracking-wider">Условия Узбекистана учтены:</span>
                        <p className="mt-0.5 leading-relaxed font-medium">{parsedRu.diagnosis.uzbekistanConditions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Urgent Actions (Срочные действия) */}
                {parsedRu?.urgentActions && (
                  <div className="bg-amber-50 p-4 border-l-4 border-amber-600 rounded-r-lg text-xs space-y-1">
                    <h4 className="font-bold text-amber-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-700" />
                      Срочные действия
                    </h4>
                    <p className="leading-relaxed whitespace-pre-line text-amber-950">
                      {parsedRu.urgentActions}
                    </p>
                  </div>
                )}

                {/* Remedies (План лечения) */}
                <div className="space-y-4">
                  <h4 className="font-display font-semibold text-[#5A6B47] text-xs uppercase tracking-wider border-b border-[#F4F1EA] pb-1">
                    План лечения (3 подхода)
                  </h4>
                  
                  <div className="space-y-3 text-xs">
                    
                    {/* 1. Professional Conventional */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#5A6B47] text-white font-mono text-xs flex items-center justify-center font-bold">1</span>
                        <h5 className="font-bold text-[#5A6B47] uppercase tracking-wide">Профессиональный традиционный подход</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedRu?.treatments.conventional || "Нет данных"}
                      </p>
                      <div className="mt-2 pl-8 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-150 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
                        <span>
                          <strong>Внимание:</strong> Применение любых химических средств защиты должно строго соответствовать местным государственным реестрам, инструкциям на этикетке, срокам ожидания, дозировке и требованиям к средствам индивидуальной защиты (СИЗ). Для работы с химикатами проконсультируйтесь с лицензированным агрономом.
                        </span>
                      </div>
                    </div>

                    {/* 2. Organic */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#A67C52] text-white font-mono text-xs flex items-center justify-center font-bold">2</span>
                        <h5 className="font-bold text-[#A67C52] uppercase tracking-wide">Органический подход</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedRu?.treatments.organic || "Нет данных"}
                      </p>
                    </div>

                    {/* 3. Household */}
                    <div className="p-4 bg-white border border-[#E0DBC5] rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#7A7566] text-white font-mono text-xs flex items-center justify-center font-bold">3</span>
                        <h5 className="font-bold text-[#7A7566] uppercase tracking-wide">Домашние условия</h5>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-[#2D3427] pl-8">
                        {parsedRu?.treatments.household || "Нет данных"}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Prevention (Профилактика) */}
                {parsedRu?.prevention && (
                  <div className="space-y-2 border-t border-[#F4F1EA] pt-4 text-xs">
                    <h4 className="font-bold text-[#5A6B47] uppercase tracking-wider text-[11px]">
                      Профилактика и агротехника
                    </h4>
                    <p className="leading-relaxed text-[#2D3427] whitespace-pre-line">
                      {parsedRu.prevention}
                    </p>
                  </div>
                )}

                {/* Missing Info Needed (Дополнительные данные для проверки) */}
                {parsedRu?.additionalInfo && (
                  <div className="p-3 bg-[#F4F1EA] rounded-lg border border-[#E0DBC5] text-xs text-[#7A7566] space-y-1">
                    <span className="font-bold uppercase text-[10px] text-[#2D3427] block">Дополнительные данные для проверки:</span>
                    <p className="italic leading-relaxed whitespace-pre-line">
                      {parsedRu.additionalInfo}
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Page Footer */}
      <footer className="mt-auto bg-[#F4F1EA] border-t border-[#E0DBC5] py-6 text-xs text-[#8E8A7B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left space-y-1">
            <p className="font-bold text-[#5A6B47]">© 2026 AGRO-DIAGNOST UZBEKISTAN</p>
            <p className="text-[11px]">Дала шароитида аниқ қарор чиқаришдан олдин соҳа мутахассиси ва агроном билан маслаҳатлашиш тавсия этилади.</p>
          </div>
          <div className="flex gap-6 font-semibold">
            <a href="#agro-diagnost-root" className="hover:text-[#5A6B47] transition">Юқорига қайтиш / Наверх</a>
            <span className="text-[#C5C0AF]">|</span>
            <span className="text-[#7A7566]">Фойдаланиш шартлари / Условия использования</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
