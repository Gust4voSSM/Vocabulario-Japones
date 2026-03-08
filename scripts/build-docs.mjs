import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Handlebars from "handlebars";

const rootDir = process.cwd();
const dataPath = path.join(rootDir, "data", "readme.json");
const templatePath = path.join(rootDir, "templates", "readme.hbs");
const outputPath = path.join(rootDir, "README.md");
const decksDir = path.join(rootDir, "decks");
const deckBuildDir = path.join(decksDir, ".build");

const KANA_TO_ROMAJI = {
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  "わ": "wa", "を": "o", "ん": "n",
  "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
  "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
  "ゔ": "vu",
  "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
  "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
  "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
  "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
  "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
  "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
  "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
  "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
  "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
  "ワ": "wa", "ヲ": "o", "ン": "n",
  "ガ": "ga", "ギ": "gi", "グ": "gu", "ゲ": "ge", "ゴ": "go",
  "ザ": "za", "ジ": "ji", "ズ": "zu", "ゼ": "ze", "ゾ": "zo",
  "ダ": "da", "ヂ": "ji", "ヅ": "zu", "デ": "de", "ド": "do",
  "バ": "ba", "ビ": "bi", "ブ": "bu", "ベ": "be", "ボ": "bo",
  "パ": "pa", "ピ": "pi", "プ": "pu", "ペ": "pe", "ポ": "po",
  "ァ": "a", "ィ": "i", "ゥ": "u", "ェ": "e", "ォ": "o",
  "ヴ": "vu"
};

const DIGRAPHS = {
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  "キャ": "kya", "キュ": "kyu", "キョ": "kyo",
  "シャ": "sha", "シュ": "shu", "ショ": "sho",
  "チャ": "cha", "チュ": "chu", "チョ": "cho",
  "ニャ": "nya", "ニュ": "nyu", "ニョ": "nyo",
  "ヒャ": "hya", "ヒュ": "hyu", "ヒョ": "hyo",
  "ミャ": "mya", "ミュ": "myu", "ミョ": "myo",
  "リャ": "rya", "リュ": "ryu", "リョ": "ryo",
  "ギャ": "gya", "ギュ": "gyu", "ギョ": "gyo",
  "ジャ": "ja", "ジュ": "ju", "ジョ": "jo",
  "ビャ": "bya", "ビュ": "byu", "ビョ": "byo",
  "ピャ": "pya", "ピュ": "pyu", "ピョ": "pyo",
  "ティ": "ti", "ディ": "di", "トゥ": "tu", "ドゥ": "du",
  "チェ": "che", "シェ": "she", "ジェ": "je",
  "ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo",
  "ウィ": "wi", "ウェ": "we", "ウォ": "wo",
  "ツァ": "tsa", "ツィ": "tsi", "ツェ": "tse", "ツォ": "tso"
};

const MACRONS = { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" };

function splitIds(csv) {
  return String(csv ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function slugFromIds(ids) {
  return ids.join("-").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "deck";
}

function sanitizeDeckId(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "deck";
}

function stripHints(raw) {
  const withoutRuby = String(raw)
    .replace(/<ruby>\s*([^<]+?)\s*(?:<rp>.*?<\/rp>)?\s*<rt>.*?<\/rt>\s*(?:<rp>.*?<\/rp>)?\s*<\/ruby>/giu, "$1")
    .replace(/<[^>]+>/g, "");
  return withoutRuby.replace(/[（(][^）)]*[）)]/gu, "").replace(/\s+/g, "").trim();
}

function toRuby(text) {
  const raw = String(text);
  const whole = raw.match(/^([^()（）]+)[（(]([^）)]+)[）)]$/u);
  if (whole) {
    return `<ruby>${whole[1]}<rt>${whole[2]}</rt></ruby>`;
  }
  return raw.replace(/(.)[（(](.*?)[）)]/gu, "<ruby>$1<rt>$2</rt></ruby>");
}

function extractKanaFromAnnotated(text) {
  return String(text).replace(/(.)[（(](.*?)[）)]/gu, "$2");
}

function extractKanaFromRuby(text) {
  const matches = [...String(text).matchAll(/<rt>(.*?)<\/rt>/gu)];
  return matches.map((match) => match[1]).join("");
}

function isKanaOnly(text) {
  return /^[\u3040-\u30ffー]+$/u.test(text);
}

function kanaToRomajiText(text) {
  let result = "";
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    const pair = text.slice(i, i + 2);

    if (c === "っ" || c === "ッ") {
      const nextPair = text.slice(i + 1, i + 3);
      const nextRoma = DIGRAPHS[nextPair] || KANA_TO_ROMAJI[text[i + 1]] || "";
      if (nextRoma) {
        result += nextRoma[0];
      }
      i += 1;
      continue;
    }

    if (c === "ー") {
      const last = result[result.length - 1];
      if (last && MACRONS[last]) {
        result = result.slice(0, -1) + MACRONS[last];
      }
      i += 1;
      continue;
    }

    if (DIGRAPHS[pair]) {
      result += DIGRAPHS[pair];
      i += 2;
      continue;
    }

    if (KANA_TO_ROMAJI[c]) {
      result += KANA_TO_ROMAJI[c];
      i += 1;
      continue;
    }

    result += c;
    i += 1;
  }

  return result;
}

function normalizeVocab(rawList) {
  const index = new Map();

  for (const item of Array.isArray(rawList) ? rawList : []) {
    const japaneseRaw = String(item.japanese ?? "").trim();
    const vocabId = stripHints(japaneseRaw);

    if (!vocabId) {
      continue;
    }

    const hasRuby = /<ruby>/iu.test(japaneseRaw);
    const japaneseDisplay = hasRuby ? japaneseRaw : toRuby(japaneseRaw);
    const plainJapanese = stripHints(japaneseRaw);
    const kanaFromHints = hasRuby ? extractKanaFromRuby(japaneseRaw) : extractKanaFromAnnotated(japaneseRaw);
    const kanaFallback = isKanaOnly(plainJapanese) ? plainJapanese : "";
    const kana = String(item.kana ?? (kanaFromHints || kanaFallback)).trim();
    const manualRomaji = String(item.romaji ?? "").trim();
    const generatedRomaji = kana ? kanaToRomajiText(kana) : "";

    if (index.has(vocabId)) {
      console.warn(`[shadow] vocab '${vocabId}' foi redefinido; mantendo a ultima ocorrencia.`);
    }

    index.set(vocabId, {
      vocabId,
      japaneseRaw,
      japaneseDisplay,
      plainJapanese,
      kana,
      romaji: manualRomaji,
      romajiDisplay: manualRomaji || generatedRomaji || "-",
      portuguese: String(item.portuguese ?? "").trim()
    });
  }

  return index;
}

function resolveGlossary(glossaryIdsCsv, glossaries, vocabIndex) {
  const glossaryIds = splitIds(glossaryIdsCsv);
  const seen = new Set();
  const out = [];

  for (const glossaryId of glossaryIds) {
    const refs = glossaries?.[glossaryId];
    if (!Array.isArray(refs)) {
      console.warn(`[missing] glossario '${glossaryId}' nao encontrado.`);
      continue;
    }

    for (const ref of refs) {
      const vocabId = stripHints(ref);
      if (!vocabId) {
        continue;
      }
      if (seen.has(vocabId)) {
        continue;
      }

      const entry = vocabIndex.get(vocabId);
      if (!entry) {
        console.warn(`[missing] vocab '${vocabId}' referenciado em '${glossaryId}' nao existe em vocabSource.`);
        continue;
      }

      seen.add(vocabId);
      out.push(entry);
    }
  }

  return { glossaryIds, entries: out };
}

function renderVocabularyTable(entries) {
  const lines = [
    "| Japonês | Romaji | Português |",
    "| :--- | :--- | :--- |"
  ];

  for (const entry of entries) {
    lines.push(`| ${entry.japaneseDisplay} | *${entry.romajiDisplay}* | ${entry.portuguese} |`);
  }

  return lines.join("\n");
}

function renderReadings(kunyomi, onyomi) {
  const kunyomiList = Array.isArray(kunyomi) ? kunyomi.filter(Boolean) : [];
  const onyomiList = Array.isArray(onyomi) ? onyomi.filter(Boolean) : [];

  if (kunyomiList.length === 0 && onyomiList.length === 0) {
    return "";
  }

  const lines = ["> Leituras relevantes para o capítulo", ">"];
  if (kunyomiList.length > 0) {
    lines.push(`> Japonesa (*kun’yomi*): ${kunyomiList.join(", ")}`);
    if (onyomiList.length > 0) {
      lines.push(">");
    }
  }
  if (onyomiList.length > 0) {
    lines.push(`> Chinesa (*on’yomi*): ${onyomiList.join(", ")}`);
  }

  return lines.join("\n");
}

function renderKanjiSet(setIdsCsv, kanjiSets, kanjiCatalog) {
  const setIds = splitIds(setIdsCsv);
  const kanjiSeen = new Set();
  const lines = [];

  for (const setId of setIds) {
    const kanjiIds = kanjiSets?.[setId];
    if (!Array.isArray(kanjiIds)) {
      console.warn(`[missing] kanjiSet '${setId}' nao encontrado.`);
      continue;
    }

    for (const kanjiId of kanjiIds) {
      if (kanjiSeen.has(kanjiId)) {
        continue;
      }
      kanjiSeen.add(kanjiId);

      const info = kanjiCatalog?.[kanjiId];
      if (!info) {
        console.warn(`[missing] kanji '${kanjiId}' referenciado em set '${setId}' nao existe no catalogo.`);
        continue;
      }

      lines.push("---");
      lines.push(`#### <span class=\"kanji-title\">${kanjiId}</span>`);
      lines.push("");
      lines.push(`*${info.significado ?? ""}*`);
      lines.push("");

      const readings = renderReadings(info.kunyomi, info.onyomi);
      if (readings) {
        lines.push(readings);
      }
    }
  }

  return lines.join("\n");
}

function encodeCards(entries) {
  const cards = entries.map((entry) => ({
    furigana: entry.japaneseDisplay,
    romaji: entry.romajiDisplay,
    meaning: entry.portuguese,
    japones: entry.japaneseRaw,
    romajiRaw: entry.romaji,
    portugues: entry.portuguese
  }));

  return Buffer.from(JSON.stringify(cards), "utf8").toString("base64");
}

function cardsForDeck(entries) {
  return entries.map((entry) => ({
    vocabId: entry.vocabId,
    Japones: entry.japaneseRaw,
    Romaji: entry.romaji,
    Portugues: entry.portuguese
  }));
}

function renderEmbed(entries, config) {
  const id = `embed-${config.localSlug}`;
  const dataB64 = encodeCards(entries);
  const globalDeckHref = `decks/${config.globalFile}`;
  const localDeckHref = `decks/${config.localFile}`;
  const firstPassNoShuffleAttr = config.firstPassNoShuffle ? " data-first-pass-no-shuffle=\"1\"" : "";
  const shuffleDisabledAttr = config.firstPassNoShuffle ? " disabled" : "";

  const html = [
    "<div class=\"anki-embed-group\">",
    `  <div class=\"anki-embed\" id=\"${id}\" data-cards-b64=\"${dataB64}\"${firstPassNoShuffleAttr}>`,
    "    <div class=\"anki-card\" data-face=\"front\"></div>",
    "    <div class=\"anki-controls\">",
    "      <button type=\"button\" class=\"icon-only\" data-action=\"prev\" title=\"Anterior\" aria-label=\"Anterior\"><i class=\"fa-solid fa-chevron-left\" aria-hidden=\"true\"></i></button>",
    "      <button type=\"button\" class=\"icon-only flip-toggle\" data-action=\"flip\" title=\"Virar\" aria-label=\"Virar\"><i class=\"fa-regular fa-eye\" aria-hidden=\"true\"></i><i class=\"fa-solid fa-eye\" aria-hidden=\"true\"></i></button>",
    "      <button type=\"button\" class=\"icon-only\" data-action=\"next\" title=\"Próxima\" aria-label=\"Próxima\"><i class=\"fa-solid fa-chevron-right\" aria-hidden=\"true\"></i></button>",
    `      <button type="button" class="icon-only" data-action="shuffle" title="Embaralhar" aria-label="Embaralhar"${shuffleDisabledAttr}><i class="fa-solid fa-shuffle" aria-hidden="true"></i></button>`,
    "    </div>",
    "  </div>",
    "  <div class=\"anki-export-controls\">",
    `    <a href=\"${globalDeckHref}\" class=\"deck-download deck-primary\" download>Adicionar ao deck</a>`,
    `    <a href=\"${localDeckHref}\" class=\"deck-download deck-secondary\" download>Exportar só este bloco</a>`,
    "  </div>",
    "</div>"
  ];

  return { html: html.join("\n"), cards: cardsForDeck(entries) };
}

function parseEmbedRequests(templateRaw) {
  const requests = [];
  const regex = /{{{\s*Embed\s+"([^"]+)"\s+"([^"]+)"\s*}}}/g;
  let match = regex.exec(templateRaw);
  while (match) {
    requests.push({ deckId: match[1], glossaries: match[2] });
    match = regex.exec(templateRaw);
  }
  return requests;
}

function getVenvPythonPath() {
  if (process.platform === "win32") {
    return path.join(rootDir, ".venv", "Scripts", "python.exe");
  }
  return path.join(rootDir, ".venv", "bin", "python");
}

function ensurePythonReady(embedRequestsCount) {
  if (embedRequestsCount === 0) {
    return null;
  }

  const pythonPath = getVenvPythonPath();
  if (!existsSync(pythonPath)) {
    throw new Error("Python .venv nao encontrado. Rode `npm run setup:py` antes do build.");
  }

  const check = spawnSync(pythonPath, ["-c", "import genanki"], { stdio: "pipe" });
  if (check.status !== 0) {
    throw new Error("Dependencia Python `genanki` ausente no .venv. Rode `npm run setup:py`.");
  }

  return pythonPath;
}

async function exportDecks(pythonPath, deckPayloads) {
  const localDecks = Array.from(deckPayloads.local.values());
  const globalDecks = Array.from(deckPayloads.global.values()).map((deck) => ({
    fileName: deck.fileName,
    deckName: deck.deckName,
    cards: Array.from(deck.cardsByVocab.values())
  }));
  const allDecks = [...globalDecks, ...localDecks];

  if (!pythonPath || allDecks.length === 0) {
    return;
  }

  await mkdir(deckBuildDir, { recursive: true });

  for (const deck of allDecks) {
    const inputStem = deck.fileName.replace(/\.apkg$/i, "");
    const inputPath = path.join(deckBuildDir, `${inputStem}.json`);
    const outputPathDeck = path.join(decksDir, deck.fileName);
    await writeFile(inputPath, JSON.stringify({
      deck_name: deck.deckName,
      cards: deck.cards
    }, null, 2), "utf8");

    const run = spawnSync(pythonPath, [
      path.join(rootDir, "scripts", "export_anki.py"),
      "--input", inputPath,
      "--output", outputPathDeck
    ], { stdio: "pipe", encoding: "utf8" });

    if (run.status !== 0) {
      throw new Error(`Falha ao gerar deck '${deck.fileName}': ${run.stderr || run.stdout}`);
    }
  }
}

function registerHelpers(data, deckPayloads) {
  Handlebars.registerHelper("Vocab", (glossaryIdsCsv) => {
    const { entries } = resolveGlossary(glossaryIdsCsv, data.glossaries, data.vocabIndex);
    return new Handlebars.SafeString(renderVocabularyTable(entries));
  });

  Handlebars.registerHelper("Embed", (deckId, glossaryIdsCsv, maybeFlag, maybeOptions) => {
    const options = maybeOptions && maybeOptions.hash ? maybeOptions : (maybeFlag && maybeFlag.hash ? maybeFlag : null);
    const flagArg = typeof maybeFlag === "string" ? maybeFlag.trim().toLowerCase() : "";
    const firstPassNoShuffle = Boolean(
      options?.hash?.firstPassNoShuffle ||
      flagArg === "firstpassnoshuffle" ||
      flagArg === "no-shuffle-first-pass" ||
      flagArg === "lock-shuffle-first-pass"
    );
    const deckLabel = String(deckId ?? "").trim();
    if (!deckLabel) {
      throw new Error("Embed exige deckId: {{{Embed \"deck-id\" \"glossario1,glossario2\"}}}");
    }
    if (typeof glossaryIdsCsv !== "string") {
      throw new Error("Embed exige glossarios CSV como segundo argumento: {{{Embed \"deck-id\" \"glossario1,glossario2\"}}}");
    }
    const { glossaryIds, entries } = resolveGlossary(glossaryIdsCsv, data.glossaries, data.vocabIndex);
    const deckKey = sanitizeDeckId(deckLabel);
    const localSuffix = slugFromIds(glossaryIds);
    const localSlug = `${deckKey}-${localSuffix}`;
    const localFile = `${deckKey}__${localSuffix}.apkg`;
    const globalFile = `${deckKey}.apkg`;
    const rendered = renderEmbed(entries, { localSlug, localFile, globalFile, firstPassNoShuffle });

    if (!deckPayloads.local.has(localFile)) {
      deckPayloads.local.set(localFile, {
        fileName: localFile,
        deckName: `SiteJapones::${deckLabel}::bloco::${localSuffix}`,
        cards: rendered.cards
      });
    }

    if (!deckPayloads.global.has(globalFile)) {
      deckPayloads.global.set(globalFile, {
        fileName: globalFile,
        deckName: `SiteJapones::${deckLabel}`,
        cardsByVocab: new Map()
      });
    }

    const globalDeck = deckPayloads.global.get(globalFile);
    for (const card of rendered.cards) {
      globalDeck.cardsByVocab.set(card.vocabId, card);
    }

    return new Handlebars.SafeString(rendered.html);
  });

  Handlebars.registerHelper("Kanji", (setIdsCsv) => {
    return new Handlebars.SafeString(renderKanjiSet(setIdsCsv, data.kanjiSets, data.kanjiCatalog));
  });
}

const [rawData, rawTemplate] = await Promise.all([
  readFile(dataPath, "utf8"),
  readFile(templatePath, "utf8")
]);

const jsonData = JSON.parse(rawData.replace(/^\uFEFF/, ""));
const templateSource = rawTemplate.replace(/^\uFEFF/, "");
const normalized = {
  ...jsonData,
  vocabIndex: normalizeVocab(jsonData.vocabSource),
  glossaries: jsonData.glossaries ?? {},
  kanjiCatalog: jsonData.kanjiCatalog ?? {},
  kanjiSets: jsonData.kanjiSets ?? {}
};

const embedRequests = parseEmbedRequests(templateSource);
const pythonPath = ensurePythonReady(embedRequests.length);
const decksToBuild = { local: new Map(), global: new Map() };
registerHelpers(normalized, decksToBuild);

const template = Handlebars.compile(templateSource, { noEscape: true });
const rendered = template(normalized).trimEnd() + "\n";

await writeFile(outputPath, rendered, "utf8");
await exportDecks(pythonPath, decksToBuild);

console.log(`README generated from ${path.relative(rootDir, dataPath)} using ${path.relative(rootDir, templatePath)}.`);
const generatedDeckFiles = [
  ...Array.from(decksToBuild.global.keys()),
  ...Array.from(decksToBuild.local.keys())
];
if (generatedDeckFiles.length > 0) {
  console.log(`Decks generated: ${generatedDeckFiles.join(", ")}`);
}

