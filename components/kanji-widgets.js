import { escapeHtml } from "./utils.js";

var KANJI_TOKEN_COLORS = {
  "red-500": "#ef4444",
  "blue-500": "#3b82f6",
  "amber-500": "#f59e0b",
  "pink-500": "#ec4899",
  "green-500": "#22c55e",
  "slate-500": "#64748b",
};

function resolveKanjiColor(token) {
  var clean = String(token || "").trim();
  if (!clean) {
    return "";
  }
  return KANJI_TOKEN_COLORS[clean] || clean;
}

function parseSvgViewBox(raw) {
  var values = String(raw || "")
    .trim()
    .split(/\s+/)
    .map(function (part) {
      return Number(part);
    });
  if (values.length !== 4 || values.some(function (n) { return !Number.isFinite(n); })) {
    return null;
  }
  if (values[2] <= 0 || values[3] <= 0) {
    return null;
  }
  return {
    minX: values[0],
    minY: values[1],
    width: values[2],
    height: values[3],
  };
}

function estimatePathBounds(pathList) {
  if (!Array.isArray(pathList) || pathList.length === 0) {
    return null;
  }

  var minX = Infinity;
  var minY = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  var hasPoint = false;

  pathList.forEach(function (d) {
    var text = String(d || "");
    if (!text) {
      return;
    }

    var nums = text.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    for (var i = 0; i + 1 < nums.length; i += 2) {
      var x = Number(nums[i]);
      var y = Number(nums[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      hasPoint = true;
      if (x < minX) { minX = x; }
      if (y < minY) { minY = y; }
      if (x > maxX) { maxX = x; }
      if (y > maxY) { maxY = y; }
    }
  });

  if (!hasPoint) {
    return null;
  }

  var width = maxX - minX;
  var height = maxY - minY;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    minX: minX,
    minY: minY,
    width: width,
    height: height,
  };
}

function buildKanjiSvgMarkup(svgDef) {
  if (!svgDef || typeof svgDef !== "object") {
    return "";
  }

  var viewBox = String(svgDef.viewBox || "0 0 120 120").trim() || "0 0 120 120";
  var radicals = svgDef.radicais;
  if (!radicals || typeof radicals !== "object" || Array.isArray(radicals)) {
    return "";
  }

  var layers = Object.keys(radicals)
    .map(function (radicalId) {
      var node = radicals[radicalId] || {};
      var glyph = String(node.glyph || radicalId);
      var x = Number(node.x);
      var y = Number(node.y);
      var fontSize = Number(node.fontSize);
      var size = Number(node.size);
      var fontFamily = String(node.fontFamily || '"Noto Serif JP", "Hiragino Mincho ProN", serif');
      var fontWeight = String(node.fontWeight || "500");
      var textAnchor = String(node.textAnchor || "middle");
      var transform = String(node.transform || "").trim();
      var provider = String(node.svgProvider || "").trim().toLowerCase();
      var vectorMode = provider === "kanjivg" ? "stroke" : "fill";
      var useNativeKanjivg = provider === "kanjivg" && node.manualPlacement !== true;
      var xSafe = Number.isFinite(x) ? x : 60;
      var ySafe = Number.isFinite(y) ? y : 82;
      var sizeSafe = Number.isFinite(size) && size > 0
        ? size
        : (Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 72);
      var transformAttr = transform ? (' transform="' + escapeHtml(transform) + '"') : "";
      var pathList = Array.isArray(node.svgPaths)
        ? node.svgPaths.filter(function (d) { return String(d || "").trim(); })
        : [];
      var pathViewBox = parseSvgViewBox(node.svgViewBox || "0 0 200 200");

      if (pathList.length > 0 && pathViewBox) {
        var pathMarkup = pathList
          .map(function (d) {
            return '<path d="' + escapeHtml(d) + '" />';
          })
          .join("");

        if (useNativeKanjivg) {
          return ""
            + '<g data-radical-id="' + escapeHtml(radicalId) + '" data-vector-mode="' + escapeHtml(vectorMode) + '">'
            + pathMarkup
            + "</g>";
        }

        var pathBounds = estimatePathBounds(pathList) || pathViewBox;
        var scale = sizeSafe / Math.max(pathBounds.width, pathBounds.height);
        var tx = xSafe - ((pathBounds.minX + (pathBounds.width / 2)) * scale);
        var ty = ySafe - ((pathBounds.minY + (pathBounds.height / 2)) * scale);

        return ""
          + '<g data-radical-id="' + escapeHtml(radicalId) + '" data-vector-mode="' + escapeHtml(vectorMode) + '">'
          + '<g transform="translate(' + String(tx) + " " + String(ty) + ") scale(" + String(scale) + ')">'
          + pathMarkup
          + "</g>"
          + "</g>";
      }

      return ""
        + '<g data-radical-id="' + escapeHtml(radicalId) + '" data-vector-mode="fill">'
        + "<text"
        + ' x="' + String(xSafe) + '"'
        + ' y="' + String(ySafe) + '"'
        + ' font-size="' + String(sizeSafe) + '"'
        + ' text-anchor="' + escapeHtml(textAnchor) + '"'
        + ' font-family="' + escapeHtml(fontFamily) + '"'
        + ' font-weight="' + escapeHtml(fontWeight) + '"'
        + transformAttr
        + ">"
        + escapeHtml(glyph)
        + "</text>"
        + "</g>";
    })
    .join("");

  if (!layers) {
    return "";
  }

  return ""
    + '<svg class="kanji-svg" viewBox="' + escapeHtml(viewBox) + '" aria-hidden="true" focusable="false">'
    + layers
    + "</svg>";
}

function findRadicalGroups(svgRoot, radicalId) {
  return Array.from(svgRoot.querySelectorAll("[data-radical-id]")).filter(function (group) {
    return group.getAttribute("data-radical-id") === radicalId;
  });
}

function buildConvexHull(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  var unique = [];
  var seen = new Set();
  points.forEach(function (point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return;
    }
    var key = String(Math.round(point.x * 100) / 100) + "," + String(Math.round(point.y * 100) / 100);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push({ x: point.x, y: point.y });
  });

  if (unique.length <= 3) {
    return unique;
  }

  unique.sort(function (a, b) {
    if (a.x === b.x) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  function cross(o, a, b) {
    return ((a.x - o.x) * (b.y - o.y)) - ((a.y - o.y) * (b.x - o.x));
  }

  var lower = [];
  unique.forEach(function (point) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  });

  var upper = [];
  for (var i = unique.length - 1; i >= 0; i -= 1) {
    var point = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function collectGroupPathPoints(group) {
  if (!group || !group.ownerSVGElement) {
    return [];
  }

  var svg = group.ownerSVGElement;
  var groupMatrix = group.getScreenCTM();
  if (!groupMatrix) {
    return [];
  }

  var inverseGroupMatrix;
  try {
    inverseGroupMatrix = groupMatrix.inverse();
  } catch (_error) {
    return [];
  }

  var paths = Array.from(group.querySelectorAll("path")).filter(function (pathNode) {
    return !pathNode.classList.contains("kanji-radical-hull")
      && !pathNode.classList.contains("kanji-radical-hitbox");
  });
  var points = [];

  paths.forEach(function (pathNode) {
    var pathMatrix = pathNode.getScreenCTM();
    if (!pathMatrix) {
      return;
    }

    var length;
    try {
      length = pathNode.getTotalLength();
    } catch (_error) {
      return;
    }

    if (!Number.isFinite(length) || length <= 0) {
      return;
    }

    var steps = Math.max(12, Math.ceil(length / 10));
    for (var i = 0; i <= steps; i += 1) {
      var atLength = (length * i) / steps;
      var point;
      try {
        point = pathNode.getPointAtLength(atLength);
      } catch (_error) {
        continue;
      }

      var svgPoint = svg.createSVGPoint();
      svgPoint.x = point.x;
      svgPoint.y = point.y;
      var screenPoint = svgPoint.matrixTransform(pathMatrix);
      var localPoint = screenPoint.matrixTransform(inverseGroupMatrix);
      if (Number.isFinite(localPoint.x) && Number.isFinite(localPoint.y)) {
        points.push({ x: localPoint.x, y: localPoint.y });
      }
    }
  });

  return points;
}

function ensureRadicalHitbox(group) {
  if (!group || group.dataset.hitboxBound === "1") {
    return;
  }

  var points = collectGroupPathPoints(group);
  var hull = buildConvexHull(points);
  if (hull.length >= 3) {
    var hullPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    hullPolygon.setAttribute("class", "kanji-radical-hull");
    hullPolygon.setAttribute(
      "points",
      hull
        .map(function (point) {
          return String(Math.round(point.x * 100) / 100) + "," + String(Math.round(point.y * 100) / 100);
        })
        .join(" "),
    );
    hullPolygon.setAttribute("fill", "rgba(0,0,0,0.001)");
    hullPolygon.setAttribute("stroke", "none");
    hullPolygon.setAttribute("aria-hidden", "true");
    group.appendChild(hullPolygon);
    group.dataset.hitboxBound = "1";
    return;
  }

  var bbox;
  try {
    bbox = group.getBBox();
  } catch (_error) {
    return;
  }

  if (
    !bbox
    || !Number.isFinite(bbox.x)
    || !Number.isFinite(bbox.y)
    || !Number.isFinite(bbox.width)
    || !Number.isFinite(bbox.height)
    || bbox.width <= 0
    || bbox.height <= 0
  ) {
    return;
  }

  var pad = 3;
  var hitbox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  hitbox.setAttribute("class", "kanji-radical-hitbox");
  hitbox.setAttribute("x", String(bbox.x - pad));
  hitbox.setAttribute("y", String(bbox.y - pad));
  hitbox.setAttribute("width", String(bbox.width + (pad * 2)));
  hitbox.setAttribute("height", String(bbox.height + (pad * 2)));
  hitbox.setAttribute("fill", "rgba(0,0,0,0.001)");
  hitbox.setAttribute("stroke", "none");
  hitbox.setAttribute("aria-hidden", "true");
  group.appendChild(hitbox);
  group.dataset.hitboxBound = "1";
}

function ensureRadicalTooltipHost() {
  if (window.__kanjiRadicalTooltipEl && document.body.contains(window.__kanjiRadicalTooltipEl)) {
    return window.__kanjiRadicalTooltipEl;
  }

  var tooltip = document.createElement("div");
  tooltip.className = "kanji-radical-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  window.__kanjiRadicalTooltipEl = tooltip;

  if (!window.__kanjiRadicalTooltipEventsBound) {
    window.__kanjiRadicalTooltipEventsBound = true;
    window.addEventListener(
      "scroll",
      function () {
        if (window.__kanjiRadicalTooltipEl) {
          window.__kanjiRadicalTooltipEl.hidden = true;
        }
      },
      true,
    );
    window.addEventListener("resize", function () {
      if (window.__kanjiRadicalTooltipEl) {
        window.__kanjiRadicalTooltipEl.hidden = true;
      }
    });
  }

  return tooltip;
}

function placeRadicalTooltip(tooltip, x, y) {
  if (!tooltip) {
    return;
  }

  var pad = 10;
  var gap = 12;
  var rect = tooltip.getBoundingClientRect();
  var left = x - (rect.width / 2);
  var top = y - rect.height - gap;

  if (left < pad) {
    left = pad;
  }
  if (left + rect.width > window.innerWidth - pad) {
    left = window.innerWidth - rect.width - pad;
  }
  if (top < pad) {
    top = y + gap;
  }
  if (top + rect.height > window.innerHeight - pad) {
    top = window.innerHeight - rect.height - pad;
  }

  tooltip.style.left = String(Math.round(left)) + "px";
  tooltip.style.top = String(Math.round(top)) + "px";
}

function showRadicalTooltip(payload, originRect, pointerPoint) {
  var tooltip = ensureRadicalTooltipHost();
  var kanji = String((payload && payload.kanji) || "").trim();
  var meaning = String((payload && payload.meaning) || "").trim();
  if (!kanji && !meaning) {
    tooltip.hidden = true;
    return;
  }

  tooltip.innerHTML = ""
    + (kanji ? '<div class="kanji-radical-tooltip-kanji">' + escapeHtml(kanji) + "</div>" : "")
    + (meaning ? '<div class="kanji-radical-tooltip-meaning">' + escapeHtml(meaning) + "</div>" : "");
  tooltip.hidden = false;

  var x = pointerPoint && Number.isFinite(pointerPoint.x)
    ? pointerPoint.x
    : (originRect.left + (originRect.width / 2));
  var y = pointerPoint && Number.isFinite(pointerPoint.y)
    ? pointerPoint.y
    : originRect.top;

  placeRadicalTooltip(tooltip, x, y);
}

function hideRadicalTooltip() {
  if (window.__kanjiRadicalTooltipEl) {
    window.__kanjiRadicalTooltipEl.hidden = true;
  }
}

function getTooltipGroupsAtPointer(svgRoot, clientX, clientY) {
  if (!svgRoot || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return [];
  }

  var stack = document.elementsFromPoint(clientX, clientY) || [];
  var groups = [];

  stack.forEach(function (element) {
    if (!element || typeof element.closest !== "function") {
      return;
    }

    var group = element.closest("[data-radical-id]");
    if (!group || !svgRoot.contains(group) || group.dataset.tooltipBound !== "1") {
      return;
    }

    var hasKanji = String(group.getAttribute("data-radical-tooltip-kanji") || "").trim();
    var hasMeaning = String(group.getAttribute("data-radical-tooltip-meaning") || "").trim();
    if (!hasKanji && !hasMeaning) {
      return;
    }

    if (groups.indexOf(group) === -1) {
      groups.push(group);
    }
  });

  return groups;
}

function ensureRadicalTooltip(group, kanji, meaning) {
  var kanjiText = String(kanji || "").trim();
  var meaningText = String(meaning || "").trim();
  if (!kanjiText && !meaningText) {
    return;
  }

  if (kanjiText) {
    group.setAttribute("data-radical-tooltip-kanji", kanjiText);
  } else {
    group.removeAttribute("data-radical-tooltip-kanji");
  }
  if (meaningText) {
    group.setAttribute("data-radical-tooltip-meaning", meaningText);
  } else {
    group.removeAttribute("data-radical-tooltip-meaning");
  }
  group.setAttribute("tabindex", "0");
  group.style.cursor = "help";
  ensureRadicalHitbox(group);

  if (group.dataset.tooltipBound === "1") {
    return;
  }
  group.dataset.tooltipBound = "1";

  var readPayload = function () {
    return {
      kanji: group.getAttribute("data-radical-tooltip-kanji") || "",
      meaning: group.getAttribute("data-radical-tooltip-meaning") || "",
    };
  };

  var handlePointerTooltip = function (event) {
    if (!group.ownerSVGElement) {
      return;
    }

    var hoveredGroups = getTooltipGroupsAtPointer(group.ownerSVGElement, event.clientX, event.clientY);
    if (hoveredGroups.length !== 1 || hoveredGroups[0] !== group) {
      hideRadicalTooltip();
      return;
    }

    var payload = readPayload();
    if (!payload.kanji && !payload.meaning) {
      hideRadicalTooltip();
      return;
    }

    var rect = group.getBoundingClientRect();
    showRadicalTooltip(payload, rect, { x: event.clientX, y: event.clientY });
  };

  group.addEventListener("mouseenter", handlePointerTooltip);
  group.addEventListener("mousemove", handlePointerTooltip);

  group.addEventListener("mouseleave", hideRadicalTooltip);

  group.addEventListener("focus", function () {
    var payload = readPayload();
    if (!payload.kanji && !payload.meaning) {
      return;
    }
    showRadicalTooltip(payload, group.getBoundingClientRect(), null);
  });

  group.addEventListener("blur", hideRadicalTooltip);
}

function applyRadicalConfig(svgRoot, radicals) {
  if (!svgRoot || !radicals || typeof radicals !== "object" || Array.isArray(radicals)) {
    return;
  }

  Object.keys(radicals).forEach(function (radicalId) {
    var cfg = radicals[radicalId] || {};
    var colorToken = String(cfg.colorCode || "").trim();
    var meaning = String(cfg.significado || "").trim();
    var kanjiLabel = String(cfg.kanji || radicalId || "").trim();
    var color = resolveKanjiColor(colorToken);
    var groups = findRadicalGroups(svgRoot, radicalId);

    groups.forEach(function (group) {
      if (color) {
        group.classList.add("kanji-radical-colored");
        group.style.setProperty("--radical-color", color);
        if (colorToken) {
          group.setAttribute("data-color-token", colorToken);
        }
      }
      if (meaning) {
        ensureRadicalTooltip(group, kanjiLabel, meaning);
      }
    });
  });
}

function renderKanjiFallback(root, message) {
  root.innerHTML = '<div class="kanji-widget-fallback"><em>' + escapeHtml(message) + "</em></div>";
}

export function hydrateKanjiVerbete(root, verbetes) {
  if (root.dataset.initialized === "1") {
    return;
  }
  root.dataset.initialized = "1";

  var slotId = root.getAttribute("data-verbete-slot") || "";
  var slot = verbetes[slotId];
  if (!slot) {
    return;
  }

  root.classList.add("kanji-verbete-widget");
  if (!slot.valid || !slot.svg || !slot.kanjiId) {
    renderKanjiFallback(root, slot.reason || "Verbete de kanji indisponível.");
    return;
  }

  var svgHtml = buildKanjiSvgMarkup(slot.svg);
  if (!svgHtml) {
    renderKanjiFallback(root, "SVG inválido no verbete.");
    return;
  }

  root.innerHTML = '<div class="kanji-svg-wrap">' + svgHtml + "</div>";
  if (slot.meaning) {
    root.innerHTML += '<div class="kanji-meaning-text">' + escapeHtml(slot.meaning) + "</div>";
  }

  var svgRoot = root.querySelector("svg.kanji-svg");
  applyRadicalConfig(svgRoot, slot.radicals || {});
}

export function hydrateKanjiComparacao(root, comparacoes) {
  if (root.dataset.initialized === "1") {
    return;
  }
  root.dataset.initialized = "1";

  var slotId = root.getAttribute("data-comparacao-slot") || "";
  var slot = comparacoes[slotId];
  if (!slot) {
    return;
  }

  root.classList.add("kanji-comparacao-widget");
  if (!slot.valid || !slot.leftSvg || !slot.rightSvg || !slot.leftKanji || !slot.rightKanji) {
    renderKanjiFallback(root, slot.reason || "Comparação de kanji indisponível.");
    return;
  }

  var leftSvgHtml = buildKanjiSvgMarkup(slot.leftSvg);
  var rightSvgHtml = buildKanjiSvgMarkup(slot.rightSvg);
  if (!leftSvgHtml || !rightSvgHtml) {
    renderKanjiFallback(root, "SVG inválido na comparação.");
    return;
  }

  root.innerHTML = ""
    + '<h4 class="kanji-comparacao-title">Saiba seu kanji</h4>'
    + '<div class="kanji-comparacao-grid">'
    + '  <div class="kanji-comparacao-side">'
    + '    <div class="kanji-svg-wrap">' + leftSvgHtml + "</div>"
    + (slot.leftMeaning ? ('    <div class="kanji-meaning-text">' + escapeHtml(slot.leftMeaning) + "</div>") : "")
    + "  </div>"
    + '  <div class="kanji-comparacao-side">'
    + '    <div class="kanji-svg-wrap">' + rightSvgHtml + "</div>"
    + (slot.rightMeaning ? ('    <div class="kanji-meaning-text">' + escapeHtml(slot.rightMeaning) + "</div>") : "")
    + "  </div>"
    + "</div>";

  var leftSvg = root.querySelector(".kanji-comparacao-side:nth-child(1) svg.kanji-svg");
  var rightSvg = root.querySelector(".kanji-comparacao-side:nth-child(2) svg.kanji-svg");
  applyRadicalConfig(leftSvg, slot.radicals || {});
  applyRadicalConfig(rightSvg, slot.radicals || {});
}
