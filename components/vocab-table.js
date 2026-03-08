import { escapeHtml } from "./utils.js";

export function hydrateVocabTable(root, tables) {
  if (root.dataset.initialized === "1") {
    return;
  }
  var slotId = root.getAttribute("data-vocab-slot") || "";
  var slot = tables[slotId];
  if (!slot || !Array.isArray(slot.rows)) {
    return;
  }
  root.dataset.initialized = "1";
  root.classList.add("vocab-table-widget");

  var rowsHtml = slot.rows
    .map(function (row) {
      return "<tr>"
        + "<td>" + String(row.japanese || "") + "</td>"
        + "<td><em>" + escapeHtml(row.romaji) + "</em></td>"
        + "<td>" + escapeHtml(row.portuguese) + "</td>"
        + "</tr>";
    })
    .join("");

  root.innerHTML = ""
    + '<table class="vocab-table">'
    + "  <thead>"
    + "    <tr>"
    + "      <th>Japones</th>"
    + "      <th>Romaji</th>"
    + "      <th>Portugues</th>"
    + "    </tr>"
    + "  </thead>"
    + "  <tbody>" + rowsHtml + "</tbody>"
    + "</table>";
}
