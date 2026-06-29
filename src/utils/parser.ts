export interface ParsedReport {
  summary: string;
  diagnosis: {
    crop: string;
    problem: string;
    confidence: string;
    signs: string;
    causes: string;
    uzbekistanConditions: string;
  };
  urgentActions: string;
  treatments: {
    conventional: string;
    organic: string;
    household: string;
  };
  prevention: string;
  additionalInfo: string;
}

// Splits the raw text into Uzbek and Russian
export function splitLanguages(text: string): { uzbekRaw: string; russianRaw: string } {
  // Search for the Russian divider
  const russianDividers = [
    "\nРусский",
    "\n**Русский**",
    "\n### Русский",
    "\n## Русский",
    "Русский — ",
    "Русский - "
  ];

  let splitIndex = -1;
  let dividerLength = 0;

  for (const div of russianDividers) {
    const idx = text.indexOf(div);
    if (idx !== -1) {
      splitIndex = idx;
      dividerLength = div.length;
      break;
    }
  }

  // Fallback: search for just "Русский"
  if (splitIndex === -1) {
    const fallbackIdx = text.lastIndexOf("Русский");
    if (fallbackIdx !== -1 && fallbackIdx > text.length * 0.3) {
      splitIndex = fallbackIdx;
      dividerLength = "Русский".length;
    }
  }

  if (splitIndex !== -1) {
    let uzbek = text.substring(0, splitIndex).trim();
    let russian = text.substring(splitIndex + dividerLength).trim();

    // Clean up language headers
    uzbek = uzbek.replace(/^[Ўў]збекча\s*—\s*Кирилл\s*алифбосида\s*/i, "").trim();
    russian = russian.replace(/^[Кк]раткое\s+заключение/i, "Краткое заключение").trim();

    return { uzbekRaw: uzbek, russianRaw: russian };
  }

  return { uzbekRaw: text, russianRaw: "" };
}

// Parses Uzbek Cyrillic section
export function parseUzbek(text: string): ParsedReport {
  const report: ParsedReport = {
    summary: "",
    diagnosis: {
      crop: "",
      problem: "",
      confidence: "",
      signs: "",
      causes: "",
      uzbekistanConditions: "",
    },
    urgentActions: "",
    treatments: {
      conventional: "",
      organic: "",
      household: "",
    },
    prevention: "",
    additionalInfo: "",
  };

  try {
    // Extract summary (text under "Қисқа хулоса" until "Диагноз")
    const summaryMatch = text.match(/Қисқа хулоса([\s\S]*?)Диагноз/i);
    if (summaryMatch) report.summary = summaryMatch[1].trim();

    // Diagnosis fields
    const diagBlockMatch = text.match(/Диагноз([\s\S]*?)(Зудлик билан бажариладиган ишлар|Даволаш режаси)/i);
    if (diagBlockMatch) {
      const diagBlock = diagBlockMatch[1];
      report.diagnosis.crop = extractField(diagBlock, ["Экин:", "экин:"]);
      report.diagnosis.problem = extractField(diagBlock, ["Аниқланган муаммо:", "аниқланган муаммо:"]);
      report.diagnosis.confidence = extractField(diagBlock, ["Ишонч даражаси:", "ишонч даражаси:"]);
      report.diagnosis.signs = extractField(diagBlock, ["Асосий белгилари:", "асосий белгилари:"]);
      report.diagnosis.causes = extractField(diagBlock, ["Эҳтимолий сабаблар:", "эҳтимолий сабаблар:"]);
      report.diagnosis.uzbekistanConditions = extractField(diagBlock, ["Ўзбекистон шароити ҳисобга олинди:", "ўзбекистон шароити ҳисобга олинди:"]);
    }

    // Urgent actions
    const urgentMatch = text.match(/Зудлик билан бажариладиган ишлар([\s\S]*?)(Даволаш режаси|Даволаш режаси)/i);
    if (urgentMatch) report.urgentActions = urgentMatch[1].trim();

    // Treatments block
    const treatBlockMatch = text.match(/Даволаш режаси([\s\S]*?)Олдини олиш/i);
    if (treatBlockMatch) {
      const block = treatBlockMatch[1];
      report.treatments.conventional = extractTreatmentField(block, ["1. Профессионал анъанавий усул", "Профессионал анъанавий усул"], ["2. Органик усул", "3. Уй шароитидаги усул"]);
      report.treatments.organic = extractTreatmentField(block, ["2. Органик усул", "Органик усул"], ["3. Уй шароитидаги усул"]);
      report.treatments.household = extractTreatmentField(block, ["3. Уй шароитидаги усул", "Уй шароитидаги усул"], []);
    }

    // Prevention
    const prevMatch = text.match(/Олдини олиш([\s\S]*?)(Қўшимча текшириш керак бўлган маълумотлар|Қўшимча маълумотлар)/i);
    if (prevMatch) {
      report.prevention = prevMatch[1].trim();
    } else {
      // maybe at the end
      const lastMatch = text.match(/Олдини олиш([\s\S]*?)$/i);
      if (lastMatch) report.prevention = lastMatch[1].split("Қўшимча")[0].trim();
    }

    // Additional info
    const addMatch = text.match(/Қўшимча текшириш керак бўлган маълумотлар([\s\S]*?)$/i);
    if (addMatch) report.additionalInfo = addMatch[1].trim();
  } catch (e) {
    console.error("Error parsing Uzbek text:", e);
  }

  // Fallback for unparsed chunks
  if (!report.summary) {
    report.summary = text;
  }

  return report;
}

// Parses Russian section
export function parseRussian(text: string): ParsedReport {
  const report: ParsedReport = {
    summary: "",
    diagnosis: {
      crop: "",
      problem: "",
      confidence: "",
      signs: "",
      causes: "",
      uzbekistanConditions: "",
    },
    urgentActions: "",
    treatments: {
      conventional: "",
      organic: "",
      household: "",
    },
    prevention: "",
    additionalInfo: "",
  };

  try {
    // Summary
    const summaryMatch = text.match(/Краткое заключение([\s\S]*?)Диагноз/i);
    if (summaryMatch) report.summary = summaryMatch[1].trim();

    // Diagnosis
    const diagBlockMatch = text.match(/Диагноз([\s\S]*?)(Срочные действия|План лечения)/i);
    if (diagBlockMatch) {
      const diagBlock = diagBlockMatch[1];
      report.diagnosis.crop = extractField(diagBlock, ["Культура:", "культура:"]);
      report.diagnosis.problem = extractField(diagBlock, ["Выявленная проблема:", "выявленная проблема:"]);
      report.diagnosis.confidence = extractField(diagBlock, ["Уровень уверенности:", "уровень уверенности:"]);
      report.diagnosis.signs = extractField(diagBlock, ["Основные признаки:", "основные признаки:"]);
      report.diagnosis.causes = extractField(diagBlock, ["Возможные причины:", "возможные причины:"]);
      report.diagnosis.uzbekistanConditions = extractField(diagBlock, ["Условия Узбекистана учтены:", "условия Узбекистана учтены:"]);
    }

    // Urgent actions
    const urgentMatch = text.match(/Срочные действия([\s\S]*?)(План лечения)/i);
    if (urgentMatch) report.urgentActions = urgentMatch[1].trim();

    // Treatments
    const treatBlockMatch = text.match(/План лечения([\s\S]*?)Профилактика/i);
    if (treatBlockMatch) {
      const block = treatBlockMatch[1];
      report.treatments.conventional = extractTreatmentField(block, ["1. Профессиональный традиционный подход", "Профессиональный традиционный подход"], ["2. Органический подход", "3. Домашние условия"]);
      report.treatments.organic = extractTreatmentField(block, ["2. Органический подход", "Органический подход"], ["3. Домашние условия"]);
      report.treatments.household = extractTreatmentField(block, ["3. Домашние условия", "Домашние условия"], []);
    }

    // Prevention
    const prevMatch = text.match(/Профилактика([\s\S]*?)(Дополнительные данные для проверки|Дополнительные данные)/i);
    if (prevMatch) {
      report.prevention = prevMatch[1].trim();
    } else {
      const lastMatch = text.match(/Профилактика([\s\S]*?)$/i);
      if (lastMatch) report.prevention = lastMatch[1].split("Дополнительные")[0].trim();
    }

    // Additional info
    const addMatch = text.match(/Дополнительные данные для проверки([\s\S]*?)$/i);
    if (addMatch) report.additionalInfo = addMatch[1].trim();
  } catch (e) {
    console.error("Error parsing Russian text:", e);
  }

  // Fallback
  if (!report.summary) {
    report.summary = text;
  }

  return report;
}

function extractField(block: string, headers: string[]): string {
  for (const header of headers) {
    const startIdx = block.indexOf(header);
    if (startIdx !== -1) {
      // Find the next header or newline with a header
      const rest = block.substring(startIdx + header.length);
      // Look for next label (e.g. word followed by colon on new line)
      const nextMatch = rest.match(/\n\s*[^:\n]+:/);
      if (nextMatch && nextMatch.index !== undefined) {
        return rest.substring(0, nextMatch.index).trim().replace(/^[\*\s\-]+|[\*\s\-]+$/g, "");
      }
      return rest.trim().replace(/^[\*\s\-]+|[\*\s\-]+$/g, "");
    }
  }
  return "";
}

function extractTreatmentField(block: string, headers: string[], stops: string[]): string {
  let startIdx = -1;
  let matchedHeader = "";
  for (const header of headers) {
    const idx = block.indexOf(header);
    if (idx !== -1) {
      startIdx = idx;
      matchedHeader = header;
      break;
    }
  }

  if (startIdx === -1) return "";

  const rest = block.substring(startIdx + matchedHeader.length);

  // Find where any of the stop headers start
  let minStopIdx = rest.length;
  for (const stop of stops) {
    const idx = rest.indexOf(stop);
    if (idx !== -1 && idx < minStopIdx) {
      minStopIdx = idx;
    }
  }

  return rest.substring(0, minStopIdx).trim().replace(/^[\*\s\-]+|[\*\s\-]+$/g, "");
}
