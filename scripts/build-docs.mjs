import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Handlebars from "handlebars";

const rootDir = process.cwd();
const dataPath = path.join(rootDir, "data", "readme.json");
const templatePath = path.join(rootDir, "templates", "readme.hbs");
const outputPath = path.join(rootDir, "README.md");
const embedsManifestPath = path.join(rootDir, "data", "embeds-manifest.json");
const radicalSvgCachePath = path.join(rootDir, "data", "radical-svg-cache.json");
const kanjiVgCachePath = path.join(rootDir, "data", "kanjivg-cache.json");
const decksDir = path.join(rootDir, "decks");
const deckBuildDir = path.join(decksDir, ".build");
const skipDecks = process.env.BUILD_DOCS_SKIP_DECKS === "1";

async function writeUtf8IfChanged(targetPath, content) {
  const next = String(content);
  try {
    const prev = await readFile(targetPath, "utf8");
    if (prev === next) {
      return false;
    }
  } catch {
    // File does not exist or cannot be read; write it.
  }
  await writeFile(targetPath, next, "utf8");
  return true;
}

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

function codepointGlyphId(char) {
  const first = Array.from(String(char ?? "").trim())[0];
  if (!first) {
    return "";
  }
  const cpHex = first.codePointAt(0).toString(16).toLowerCase();
  return `u${cpHex.padStart(4, "0")}`;
}

function parseGlyphSourceSpec(rawSourceSpec) {
  const raw = String(rawSourceSpec ?? "").trim().toLowerCase();
  if (!raw) {
    return null;
  }

  if (/^u[0-9a-f]{4,6}(?:-[a-z0-9_]+)?$/i.test(raw)) {
    return {
      glyphId: raw,
      sourceChar: "",
      cacheKeys: [`id:${raw}`, raw]
    };
  }

  const sourceChar = Array.from(raw)[0] ?? "";
  if (!sourceChar) {
    return null;
  }

  const glyphId = codepointGlyphId(sourceChar);
  return {
    glyphId,
    sourceChar,
    cacheKeys: [`char:${sourceChar}`, sourceChar, `id:${glyphId}`, glyphId]
  };
}

function parseSvgPaths(rawSvg) {
  const viewBoxMatch = String(rawSvg).match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = String(viewBoxMatch?.[1] ?? "").trim() || "0 0 200 200";
  const paths = [];
  const pathRegex = /<path\b[^>]*\bd\s*=\s*(["'])(.*?)\1/gi;
  let match = pathRegex.exec(String(rawSvg));
  while (match) {
    const d = String(match[2] ?? "").trim();
    if (d) {
      paths.push(d);
    }
    match = pathRegex.exec(String(rawSvg));
  }
  return { viewBox, paths };
}

async function loadRadicalSvgCache() {
  if (!existsSync(radicalSvgCachePath)) {
    return {};
  }
  const raw = await readFile(radicalSvgCachePath, "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

async function saveRadicalSvgCache(cache) {
  await writeUtf8IfChanged(radicalSvgCachePath, JSON.stringify(cache, null, 2) + "\n");
}

async function loadKanjivgCache() {
  if (!existsSync(kanjiVgCachePath)) {
    return {};
  }
  const raw = await readFile(kanjiVgCachePath, "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

async function saveKanjivgCache(cache) {
  await writeUtf8IfChanged(kanjiVgCachePath, JSON.stringify(cache, null, 2) + "\n");
}

function parseXmlAttributes(rawAttrs) {
  const attrs = {};
  const attrRegex = /([a-zA-Z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g;
  let match = attrRegex.exec(String(rawAttrs ?? ""));
  while (match) {
    attrs[match[1]] = match[3];
    match = attrRegex.exec(String(rawAttrs ?? ""));
  }
  return attrs;
}

function pushPathInMap(map, key, d) {
  if (!key || !d) {
    return;
  }
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(d);
}

function parseKanjivgSvg(rawSvg) {
  const source = String(rawSvg ?? "");
  const viewBoxMatch = source.match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = String(viewBoxMatch?.[1] ?? "").trim() || "0 0 109 109";
  const byElement = {};
  const byElementPosition = {};
  const stack = [];

  const tagRegex = /<\s*(\/?)\s*(g|path)\b([^>]*)>/gi;
  let match = tagRegex.exec(source);
  while (match) {
    const isClosing = Boolean(match[1]);
    const tagName = String(match[2] ?? "").toLowerCase();
    const attrsRaw = String(match[3] ?? "");
    const isSelfClosing = /\/\s*$/.test(attrsRaw);

    if (tagName === "g") {
      if (isClosing) {
        if (stack.length > 0) {
          stack.pop();
        }
        match = tagRegex.exec(source);
        continue;
      }

      const attrs = parseXmlAttributes(attrsRaw);
      stack.push({
        element: String(attrs["kvg:element"] ?? attrs.element ?? "").trim(),
        position: String(attrs["kvg:position"] ?? attrs.position ?? "").trim().toLowerCase()
      });

      if (isSelfClosing && stack.length > 0) {
        stack.pop();
      }

      match = tagRegex.exec(source);
      continue;
    }

    if (tagName === "path" && !isClosing) {
      const attrs = parseXmlAttributes(attrsRaw);
      const d = String(attrs.d ?? "").trim();
      if (!d) {
        match = tagRegex.exec(source);
        continue;
      }

      const seenElement = new Set();
      const seenElementPos = new Set();
      for (const layer of stack) {
        const element = String(layer.element ?? "").trim();
        if (!element) {
          continue;
        }

        if (!seenElement.has(element)) {
          seenElement.add(element);
          pushPathInMap(byElement, element, d);
        }

        const position = String(layer.position ?? "").trim().toLowerCase();
        if (position) {
          const key = `${element}|${position}`;
          if (!seenElementPos.has(key)) {
            seenElementPos.add(key);
            pushPathInMap(byElementPosition, key, d);
          }
        }
      }
    }

    match = tagRegex.exec(source);
  }

  return { viewBox, byElement, byElementPosition };
}

function codepointKanjivgFilename(char) {
  const first = Array.from(String(char ?? "").trim())[0];
  if (!first) {
    return "";
  }
  return first.codePointAt(0).toString(16).toLowerCase().padStart(5, "0");
}

async function fetchKanjivgKanjiData(kanjiChar, cache) {
  const cleanKanji = Array.from(String(kanjiChar ?? "").trim())[0] ?? "";
  if (!cleanKanji) {
    return null;
  }

  const cached = cache[cleanKanji];
  if (cached && typeof cached === "object" && !Array.isArray(cached) && cached.byElement) {
    return cached;
  }

  const filename = codepointKanjivgFilename(cleanKanji);
  if (!filename) {
    return null;
  }

  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${filename}.svg`;
  try {
    const response = await fetch(url, { headers: { "accept": "image/svg+xml,text/plain,*/*" } });
    if (!response.ok) {
      console.warn(`[warn] KanjiVG ausente para '${cleanKanji}' (${filename}) [${response.status}].`);
      return null;
    }
    const rawSvg = await response.text();
    const parsed = parseKanjivgSvg(rawSvg);
    const out = {
      kanji: cleanKanji,
      source: "kanjivg",
      filename,
      viewBox: parsed.viewBox,
      byElement: parsed.byElement,
      byElementPosition: parsed.byElementPosition
    };
    cache[cleanKanji] = out;
    return out;
  } catch (error) {
    console.warn(`[warn] erro ao baixar KanjiVG para '${cleanKanji}' (${filename}): ${error.message}`);
    return null;
  }
}

const RADICAL_ELEMENT_ALIASES = {
  "⺗": ["心"],
  "忄": ["心"],
  "⺘": ["手"],
  "扌": ["手"],
  "氵": ["水"],
  "⺡": ["水"],
  "艹": ["艸"],
  "⻌": ["辵"]
};

function normalizeElementLabel(rawElement) {
  const clean = String(rawElement ?? "").trim();
  if (!clean) {
    return "";
  }

  const glyphOnly = clean.match(/^u([0-9a-f]{4,6})$/i);
  if (glyphOnly) {
    try {
      return String.fromCodePoint(Number.parseInt(glyphOnly[1], 16));
    } catch {
      return clean;
    }
  }

  return Array.from(clean)[0] ?? clean;
}

function resolveElementCandidates(radicalId) {
  const primary = normalizeElementLabel(radicalId);
  if (!primary) {
    return [];
  }

  const out = [primary];
  const aliases = RADICAL_ELEMENT_ALIASES[primary] ?? [];
  for (const alias of aliases) {
    if (alias && !out.includes(alias)) {
      out.push(alias);
    }
  }
  return out;
}

function resolvePositionHint(radicalDef) {
  return String(radicalDef?.position ?? radicalDef?.kanjiVgPosition ?? "").trim().toLowerCase();
}

function pickKanjivgVector(kanjiData, elementCandidates, positionHint) {
  if (!kanjiData || !kanjiData.byElement) {
    return null;
  }

  if (positionHint) {
    for (const element of elementCandidates) {
      const key = `${element}|${positionHint}`;
      const paths = kanjiData.byElementPosition?.[key];
      if (Array.isArray(paths) && paths.length > 0) {
        return {
          provider: "kanjivg",
          element,
          position: positionHint,
          viewBox: kanjiData.viewBox,
          paths
        };
      }
    }
  }

  for (const element of elementCandidates) {
    const paths = kanjiData.byElement?.[element];
    if (Array.isArray(paths) && paths.length > 0) {
      return {
        provider: "kanjivg",
        element,
        position: "",
        viewBox: kanjiData.viewBox,
        paths
      };
    }
  }

  return null;
}

async function fetchRadicalVector(sourceSpec, cache) {
  const parsedSource = parseGlyphSourceSpec(sourceSpec);
  if (!parsedSource) {
    return null;
  }

  for (const key of parsedSource.cacheKeys) {
    const cached = cache[key];
    if (cached && Array.isArray(cached.paths) && cached.paths.length > 0) {
      return cached;
    }
  }

  const glyphId = parsedSource.glyphId;
  if (!glyphId) {
    return null;
  }

  const url = `https://glyphwiki.org/glyph/${glyphId}.svg`;
  try {
    const response = await fetch(url, { headers: { "accept": "image/svg+xml,text/plain,*/*" } });
    if (!response.ok) {
      console.warn(`[warn] falha ao baixar SVG do radical '${String(sourceSpec ?? "")}' (${glyphId}) [${response.status}].`);
      return null;
    }
    const rawSvg = await response.text();
    const parsed = parseSvgPaths(rawSvg);
    if (!Array.isArray(parsed.paths) || parsed.paths.length === 0) {
      console.warn(`[warn] SVG do radical '${String(sourceSpec ?? "")}' (${glyphId}) sem paths utilitarias.`);
      return null;
    }

    const out = {
      glyphId,
      source: parsedSource.sourceChar || String(sourceSpec ?? "").trim(),
      viewBox: parsed.viewBox,
      paths: parsed.paths
    };
    for (const key of parsedSource.cacheKeys) {
      cache[key] = out;
    }
    return out;
  } catch (error) {
    console.warn(`[warn] erro ao baixar SVG do radical '${String(sourceSpec ?? "")}' (${glyphId}): ${error.message}`);
    return null;
  }
}

async function enrichKanjiSvgCatalog(rawCatalog, caches) {
  const out = {};
  const sourceCatalog = (rawCatalog && typeof rawCatalog === "object" && !Array.isArray(rawCatalog)) ? rawCatalog : {};
  const radicalSvgCache = caches?.radicalSvgCache ?? {};
  const kanjiVgCache = caches?.kanjiVgCache ?? {};

  for (const [kanjiId, kanjiDef] of Object.entries(sourceCatalog)) {
    if (!kanjiDef || typeof kanjiDef !== "object" || Array.isArray(kanjiDef)) {
      continue;
    }

    const radicalsOut = {};
    const rawRadicals = (kanjiDef.radicais && typeof kanjiDef.radicais === "object" && !Array.isArray(kanjiDef.radicais))
      ? kanjiDef.radicais
      : {};

    for (const [radicalId, radicalDef] of Object.entries(rawRadicals)) {
      const cleanId = String(radicalId ?? "").trim();
      if (!cleanId) {
        continue;
      }

      const normalizedRadicalDef = (radicalDef && typeof radicalDef === "object" && !Array.isArray(radicalDef))
        ? radicalDef
        : { position: "full" };
      const item = { ...normalizedRadicalDef };
      const kanjiVgData = await fetchKanjivgKanjiData(kanjiId, kanjiVgCache);
      const elementCandidates = resolveElementCandidates(cleanId);
      const positionHint = resolvePositionHint(normalizedRadicalDef);
      const kvgVector = pickKanjivgVector(kanjiVgData, elementCandidates, positionHint);

      if (kvgVector) {
        item.svgPaths = kvgVector.paths;
        item.svgViewBox = kvgVector.viewBox;
        item.svgGlyphId = `kanjivg:${kanjiVgData.filename}`;
        item.svgSource = kvgVector.element;
        item.svgSourceRequested = elementCandidates[0] ?? cleanId;
        item.svgProvider = "kanjivg";
        if (kvgVector.position) {
          item.svgPositionMatched = kvgVector.position;
        }
      } else {
        const sourceSpec = String(radicalDef.source ?? cleanId).trim();
        const vector = await fetchRadicalVector(sourceSpec, radicalSvgCache);
        if (vector) {
          item.svgPaths = vector.paths;
          item.svgViewBox = vector.viewBox;
          item.svgGlyphId = vector.glyphId;
          item.svgSource = vector.source;
          item.svgSourceRequested = sourceSpec;
          item.svgProvider = "glyphwiki";
        }
      }
      radicalsOut[cleanId] = item;
    }

    out[kanjiId] = {
      ...kanjiDef,
      viewBox: String(kanjiDef.viewBox ?? "").trim() || "0 0 120 120",
      radicais: radicalsOut
    };
  }

  return out;
}

function buildKanjiSvgCatalogFromData(jsonData) {
  const merged = {};

  const fromKanjiCatalog = jsonData?.kanjiCatalog ?? {};
  if (fromKanjiCatalog && typeof fromKanjiCatalog === "object" && !Array.isArray(fromKanjiCatalog)) {
    for (const [kanjiId, kanjiInfo] of Object.entries(fromKanjiCatalog)) {
      if (!kanjiInfo || typeof kanjiInfo !== "object" || Array.isArray(kanjiInfo)) {
        continue;
      }
      const radicaisRaw = kanjiInfo.radicais;
      const radicais = (radicaisRaw && typeof radicaisRaw === "object" && !Array.isArray(radicaisRaw))
        ? radicaisRaw
        : { [kanjiId]: { position: "full" } };
      merged[kanjiId] = {
        viewBox: kanjiInfo.viewBox,
        radicais
      };
    }
  }

  const legacy = jsonData?.kanjiSvgCatalog ?? jsonData?.kanji_svg_catalog ?? {};
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    for (const [kanjiId, svg] of Object.entries(legacy)) {
      if (!merged[kanjiId] && svg && typeof svg === "object" && !Array.isArray(svg)) {
        merged[kanjiId] = svg;
      }
    }
  }

  return merged;
}

function getKanjiPatterns(kanjiCatalog) {
  return Object.keys(kanjiCatalog ?? {})
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function buildKanjiHref(kanjiId) {
  return `#/?id=${kanjiId}`;
}

function linkKanjiInText(text, kanjiPatterns) {
  if (!text || kanjiPatterns.length === 0) {
    return text;
  }

  let out = "";
  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const pattern of kanjiPatterns) {
      if (text.startsWith(pattern, i)) {
        matched = pattern;
        break;
      }
    }

    if (matched) {
      out += `<a class="kanji-ref" href="${buildKanjiHref(matched)}">${matched}</a>`;
      i += matched.length;
      continue;
    }

    out += text[i];
    i += 1;
  }
  return out;
}

function linkKanjiInHtml(html, kanjiPatterns) {
  if (!html || kanjiPatterns.length === 0) {
    return html;
  }

  const parts = String(html).split(/(<[^>]+>)/g);
  let inAnchor = 0;
  let inRt = 0;
  let out = "";

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (part.startsWith("<")) {
      const tagMatch = part.match(/^<\s*(\/?)\s*([a-z0-9:-]+)/i);
      const isClosing = Boolean(tagMatch?.[1]);
      const tagName = (tagMatch?.[2] ?? "").toLowerCase();
      const isSelfClosing = /\/\s*>$/.test(part);

      if (tagName === "a" && !isSelfClosing) {
        if (isClosing) {
          inAnchor = Math.max(0, inAnchor - 1);
        } else {
          inAnchor += 1;
        }
      }

      if (tagName === "rt" && !isSelfClosing) {
        if (isClosing) {
          inRt = Math.max(0, inRt - 1);
        } else {
          inRt += 1;
        }
      }

      out += part;
      continue;
    }

    if (inAnchor > 0 || inRt > 0) {
      out += part;
      continue;
    }

    out += linkKanjiInText(part, kanjiPatterns);
  }

  return out;
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

function buildVocabularyRows(entries, kanjiPatterns) {
  return entries.map((entry) => ({
    japanese: linkKanjiInHtml(entry.japaneseDisplay, kanjiPatterns),
    romaji: entry.romajiDisplay,
    portuguese: entry.portuguese
  }));
}

function renderVocabularyComponent(entries, config) {
  const id = `vocab-${config.slotSuffix}`;
  return {
    html: `[[vocab-table:${id}]]`,
    slot: {
      id,
      rows: buildVocabularyRows(entries, config.kanjiPatterns)
    }
  };
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

function slotIdFromText(prefix, text) {
  const codepoints = Array.from(String(text ?? ""))
    .map((char) => char.codePointAt(0).toString(16))
    .join("-");
  return `${prefix}-${codepoints || "x"}`;
}

function normalizeRadicalDict(rawRadicals, radicalCatalog) {
  if (!rawRadicals || typeof rawRadicals !== "object" || Array.isArray(rawRadicals)) {
    return {};
  }

  const out = {};
  for (const [radicalId, rawData] of Object.entries(rawRadicals)) {
    if (!radicalId) {
      continue;
    }

    const value = {};
    if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
      const colorCode = String(rawData.colorCode ?? "").trim();
      const significado = String(rawData.significado ?? "").trim();
      if (colorCode) {
        value.colorCode = colorCode;
      }
      if (significado) {
        value.significado = significado;
      }
    }

    if (!value.significado) {
      const catalogMeaning = String(radicalCatalog?.[radicalId]?.significado ?? "").trim();
      if (catalogMeaning) {
        value.significado = catalogMeaning;
      }
    }

    out[radicalId] = value;
  }

  return out;
}

function buildVerbeteRadicalConfig(rawVerbeteRadicals, svgDef, radicalCatalog) {
  const explicit = normalizeRadicalDict(rawVerbeteRadicals, radicalCatalog);
  if (Object.keys(explicit).length > 0) {
    return explicit;
  }

  const fallback = {};
  const svgRadicals = (svgDef?.radicais && typeof svgDef.radicais === "object" && !Array.isArray(svgDef.radicais))
    ? svgDef.radicais
    : {};

  for (const radicalId of Object.keys(svgRadicals)) {
    if (!radicalId) {
      continue;
    }
    const meaning = String(radicalCatalog?.[radicalId]?.significado ?? "").trim();
    fallback[radicalId] = meaning ? { significado: meaning } : {};
  }

  return fallback;
}

function parseKanjiPairId(rawPairId) {
  const parts = String(rawPairId ?? "").split("|").map((item) => item.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { leftKanji: parts[0], rightKanji: parts[1] };
}

function renderVerbeteComponent(kanjiId, verbeteKanji, kanjiSvgCatalog, kanjiCatalog, radicalCatalog) {
  const cleanId = String(kanjiId ?? "").trim();
  const slotId = slotIdFromText("verbete", cleanId);
  const svg = kanjiSvgCatalog?.[cleanId] ?? null;
  const radicals = buildVerbeteRadicalConfig(verbeteKanji?.[cleanId], svg, radicalCatalog);
  const meaning = String(kanjiCatalog?.[cleanId]?.significado ?? "").trim();
  const kunyomi = Array.isArray(kanjiCatalog?.[cleanId]?.kunyomi)
    ? kanjiCatalog[cleanId].kunyomi.filter(Boolean).map((v) => String(v).trim()).filter(Boolean)
    : [];
  const onyomi = Array.isArray(kanjiCatalog?.[cleanId]?.onyomi)
    ? kanjiCatalog[cleanId].onyomi.filter(Boolean).map((v) => String(v).trim()).filter(Boolean)
    : [];

  const slot = {
    id: slotId,
    kanjiId: cleanId,
    meaning,
    kunyomi,
    onyomi,
    radicals,
    svg,
    valid: Boolean(cleanId && svg)
  };

  if (!cleanId) {
    slot.reason = "Verbete sem kanji id.";
  } else if (!svg) {
    slot.reason = `SVG nao encontrado para '${cleanId}'.`;
    console.warn(`[missing] SVG do kanji '${cleanId}' nao encontrado em kanjiSvgCatalog.`);
  }

  return {
    html: `[[kanji-verbete:${slotId}]]`,
    slot
  };
}

function renderVerbetesFromSet(
  setIdsCsv,
  kanjiSets,
  verbeteKanji,
  kanjiSvgCatalog,
  kanjiCatalog,
  radicalCatalog,
  verbeteSlots
) {
  const setIds = splitIds(setIdsCsv);
  const kanjiSeen = new Set();
  const htmlParts = [];

  for (const setId of setIds) {
    const kanjiIds = kanjiSets?.[setId];
    if (!Array.isArray(kanjiIds)) {
      console.warn(`[missing] kanjiSet '${setId}' nao encontrado.`);
      continue;
    }

    for (const kanjiId of kanjiIds) {
      const cleanId = String(kanjiId ?? "").trim();
      if (!cleanId || kanjiSeen.has(cleanId)) {
        continue;
      }
      kanjiSeen.add(cleanId);
      const rendered = renderVerbeteComponent(cleanId, verbeteKanji, kanjiSvgCatalog, kanjiCatalog, radicalCatalog);
      verbeteSlots.set(rendered.slot.id, rendered.slot);
      htmlParts.push(rendered.html);
    }
  }

  return htmlParts.join("\n\n");
}

function renderComparacaoComponent(pairId, comparacaoKanji, kanjiSvgCatalog, kanjiCatalog, radicalCatalog) {
  const cleanId = String(pairId ?? "").trim();
  const slotId = slotIdFromText("comparacao", cleanId);
  const pair = parseKanjiPairId(cleanId);
  const radicals = normalizeRadicalDict(comparacaoKanji?.[cleanId], radicalCatalog);
  const leftKanji = pair?.leftKanji ?? "";
  const rightKanji = pair?.rightKanji ?? "";
  const leftMeaning = String(kanjiCatalog?.[leftKanji]?.significado ?? "").trim();
  const rightMeaning = String(kanjiCatalog?.[rightKanji]?.significado ?? "").trim();
  const leftSvg = leftKanji ? (kanjiSvgCatalog?.[leftKanji] ?? null) : null;
  const rightSvg = rightKanji ? (kanjiSvgCatalog?.[rightKanji] ?? null) : null;

  const slot = {
    id: slotId,
    pairId: cleanId,
    leftKanji,
    rightKanji,
    leftMeaning,
    rightMeaning,
    radicals,
    leftSvg,
    rightSvg,
    valid: Boolean(pair && leftSvg && rightSvg)
  };

  if (!pair) {
    slot.reason = `ID de comparacao invalido '${cleanId}'. Use o formato 'KANJI|KANJI'.`;
    console.warn(`[invalid] comparacao '${cleanId}' invalida. Use o formato 'KANJI|KANJI'.`);
  } else {
    if (!leftSvg) {
      console.warn(`[missing] SVG do kanji '${leftKanji}' nao encontrado em kanjiSvgCatalog.`);
    }
    if (!rightSvg) {
      console.warn(`[missing] SVG do kanji '${rightKanji}' nao encontrado em kanjiSvgCatalog.`);
    }
    if (!leftSvg || !rightSvg) {
      slot.reason = `SVG ausente para comparacao '${cleanId}'.`;
    }
  }

  return {
    html: `[[kanji-comparacao:${slotId}]]`,
    slot
  };
}

function encodeCards(entries, kanjiPatterns) {
  const cards = entries.map((entry) => ({
    furigana: linkKanjiInHtml(entry.japaneseDisplay, kanjiPatterns),
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
  const dataB64 = encodeCards(entries, config.kanjiPatterns);
  const globalDeckHref = `decks/${config.globalFile}`;
  const localDeckHref = `decks/${config.localFile}`;
  const firstPassNoShuffleAttr = config.firstPassNoShuffle ? " data-first-pass-no-shuffle=\"1\"" : "";

  const html = `[[anki-embed:${id}]]`;
  return {
    html,
    cards: cardsForDeck(entries),
    slot: {
      id,
      cardsB64: dataB64,
      globalDeckHref,
      localDeckHref,
      firstPassNoShuffle: Boolean(firstPassNoShuffleAttr)
    }
  };
}

function parseEmbedRequests(templateRaw) {
  const requests = [];
  const regex = /{{{\s*Embed\s+"([^"]+)"\s+"([^"]+)"/g;
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

function registerHelpers(data, deckPayloads, embedSlots, tableSlots, verbeteSlots, comparacaoSlots) {
  const kanjiPatterns = getKanjiPatterns(data.kanjiCatalog);

  Handlebars.registerHelper("Vocab", (glossaryIdsCsv) => {
    const { glossaryIds, entries } = resolveGlossary(glossaryIdsCsv, data.glossaries, data.vocabIndex);
    const slotSuffix = slugFromIds(glossaryIds);
    const rendered = renderVocabularyComponent(entries, { slotSuffix, kanjiPatterns });
    tableSlots.set(rendered.slot.id, rendered.slot);
    return new Handlebars.SafeString(rendered.html);
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
    const rendered = renderEmbed(entries, { localSlug, localFile, globalFile, firstPassNoShuffle, kanjiPatterns });
    embedSlots.set(rendered.slot.id, rendered.slot);

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

  Handlebars.registerHelper("Verbetes", (setIdsCsv) => {
    if (typeof setIdsCsv !== "string") {
      throw new Error("Verbetes exige set ids CSV: {{{Verbetes \"cap1-main\"}}}");
    }
    return new Handlebars.SafeString(renderVerbetesFromSet(
      setIdsCsv,
      data.kanjiSets,
      data.verbeteKanji,
      data.kanjiSvgCatalog,
      data.kanjiCatalog,
      data.radicalCatalog,
      verbeteSlots
    ));
  });

  Handlebars.registerHelper("Verbete", (kanjiId) => {
    if (typeof kanjiId !== "string") {
      throw new Error("Verbete exige kanji id string: {{{Verbete \"悪\"}}}");
    }
    const rendered = renderVerbeteComponent(
      kanjiId,
      data.verbeteKanji,
      data.kanjiSvgCatalog,
      data.kanjiCatalog,
      data.radicalCatalog
    );
    verbeteSlots.set(rendered.slot.id, rendered.slot);
    return new Handlebars.SafeString(rendered.html);
  });

  Handlebars.registerHelper("Comparacao", (pairId) => {
    if (typeof pairId !== "string") {
      throw new Error("Comparacao exige id no formato KANJI|KANJI: {{{Comparacao \"塊|魂\"}}}");
    }
    const rendered = renderComparacaoComponent(
      pairId,
      data.comparacaoKanji,
      data.kanjiSvgCatalog,
      data.kanjiCatalog,
      data.radicalCatalog
    );
    comparacaoSlots.set(rendered.slot.id, rendered.slot);
    return new Handlebars.SafeString(rendered.html);
  });
}

const [rawData, rawTemplate] = await Promise.all([
  readFile(dataPath, "utf8"),
  readFile(templatePath, "utf8")
]);

const jsonData = JSON.parse(rawData.replace(/^\uFEFF/, ""));
const templateSource = rawTemplate.replace(/^\uFEFF/, "");
const baseKanjiSvgCatalog = buildKanjiSvgCatalogFromData(jsonData);
const radicalSvgCache = await loadRadicalSvgCache();
const kanjiVgCache = await loadKanjivgCache();
const kanjiSvgCatalog = await enrichKanjiSvgCatalog(baseKanjiSvgCatalog, {
  radicalSvgCache,
  kanjiVgCache
});
await saveRadicalSvgCache(radicalSvgCache);
await saveKanjivgCache(kanjiVgCache);
const normalized = {
  ...jsonData,
  vocabIndex: normalizeVocab(jsonData.vocabSource),
  glossaries: jsonData.glossaries ?? {},
  kanjiCatalog: jsonData.kanjiCatalog ?? {},
  kanjiSets: jsonData.kanjiSets ?? {},
  radicalCatalog: jsonData.radicais ?? {},
  verbeteKanji: jsonData.verbete_kanji ?? {},
  comparacaoKanji: jsonData.comparacao_kanji ?? {},
  kanjiSvgCatalog
};

const embedRequests = parseEmbedRequests(templateSource);
const pythonPath = skipDecks ? null : ensurePythonReady(embedRequests.length);
const decksToBuild = { local: new Map(), global: new Map() };
const embedSlots = new Map();
const tableSlots = new Map();
const verbeteSlots = new Map();
const comparacaoSlots = new Map();
registerHelpers(normalized, decksToBuild, embedSlots, tableSlots, verbeteSlots, comparacaoSlots);

const template = Handlebars.compile(templateSource, { noEscape: true });
const rendered = template(normalized).trimEnd() + "\n";

await writeUtf8IfChanged(outputPath, rendered);
await writeUtf8IfChanged(embedsManifestPath, JSON.stringify({
  embeds: Object.fromEntries(embedSlots),
  tables: Object.fromEntries(tableSlots),
  verbetes: Object.fromEntries(verbeteSlots),
  comparacoes: Object.fromEntries(comparacaoSlots)
}, null, 2) + "\n");
await exportDecks(pythonPath, decksToBuild);

console.log(`README generated from ${path.relative(rootDir, dataPath)} using ${path.relative(rootDir, templatePath)}.`);
const generatedDeckFiles = [
  ...Array.from(decksToBuild.global.keys()),
  ...Array.from(decksToBuild.local.keys())
];
if (generatedDeckFiles.length > 0) {
  if (skipDecks) {
    console.log("Deck export skipped (BUILD_DOCS_SKIP_DECKS=1).");
  } else {
    console.log(`Decks generated: ${generatedDeckFiles.join(", ")}`);
  }
}

