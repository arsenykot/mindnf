const VAR_NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function varLabel(index) {
  return VAR_NAMES[index] ?? `x${index + 1}`;
}

function clampN(n) {
  return Math.min(8, Math.max(1, Math.floor(Number(n)) || 1));
}

/** Бит переменной: слева — младший разряд (A = bit 0). */
function bitAt(row, varIndex) {
  return (row >> varIndex) & 1;
}

function bitString(row, indices) {
  return indices.map((i) => bitAt(row, i)).join("");
}

function combinations(indices, size, start = 0, prefix = []) {
  if (prefix.length === size) {
    return [prefix.slice()];
  }
  const out = [];
  for (let i = start; i <= indices.length - (size - prefix.length); i += 1) {
    out.push(...combinations(indices, size, i + 1, [...prefix, indices[i]]));
  }
  return out;
}

function groupColumns(n) {
  const indices = Array.from({ length: n }, (_, i) => i);
  const singles = indices.map((i) => ({
    key: `v${i}`,
    label: varLabel(i),
    indices: [i],
    kind: "single",
  }));

  const combos = [];
  for (let size = 2; size <= n; size += 1) {
    for (const combo of combinations(indices, size)) {
      const label = combo.map(varLabel).join("");
      combos.push({
        key: `c${combo.join("")}`,
        label,
        indices: combo,
        kind: "combo",
      });
    }
  }

  return { singles, combos };
}

function randomFValues(rows) {
  return Array.from({ length: rows }, () => (Math.random() < 0.5 ? "0" : "1"));
}

function buildTruthTable(n, tableHead, tableBody, options = {}) {
  const rows = 2 ** n;
  const { singles, combos } = groupColumns(n);
  const fValues = options.fValues ?? Array(rows).fill("0");
  const lockF = options.lockF ?? false;

  const headRow = document.createElement("tr");
  headRow.appendChild(th("#"));

  singles.forEach((col, i) => {
    const cell = th(col.label);
    if (i === singles.length - 1) {
      cell.classList.add("truth-table__sep");
    }
    headRow.appendChild(cell);
  });
  headRow.appendChild(th("f", "truth-table__sep"));
  singles.forEach((col, i) => {
    const cell = th(col.label);
    cell.dataset.algoCol = String(i);
    if (i === singles.length - 1) {
      cell.classList.add("truth-table__sep");
    }
    headRow.appendChild(cell);
  });
  combos.forEach((col, colIdx) => {
    const cell = th(col.label);
    cell.dataset.algoCol = String(singles.length + colIdx);
    headRow.appendChild(cell);
  });
  tableHead.replaceChildren(headRow);

  const fragment = document.createDocumentFragment();

  for (let row = 0; row < rows; row += 1) {
    const tr = document.createElement("tr");

    const num = document.createElement("td");
    num.className = "truth-table__num";
    num.textContent = String(row + 1);
    tr.appendChild(num);

    singles.forEach((col, i) => {
      const cell = tdBit(bitAt(row, col.indices[0]));
      cell.classList.add("truth-table__bit--before");
      if (i === singles.length - 1) {
        cell.classList.add("truth-table__sep");
      }
      tr.appendChild(cell);
    });

    const fCell = lockF ? tdFunctionLocked(row, fValues[row]) : tdFunction(row, fValues[row]);
    fCell.classList.add("truth-table__sep");
    tr.appendChild(fCell);

    singles.forEach((col, i) => {
      const cell = tdAlgoCol(bitAt(row, col.indices[0]), i);
      cell.dataset.algoLabel = col.label;
      if (i === singles.length - 1) {
        cell.classList.add("truth-table__sep");
      }
      tr.appendChild(cell);
    });

    combos.forEach((col, colIdx) => {
      const cell = tdAlgoCol(bitString(row, col.indices), singles.length + colIdx);
      cell.dataset.algoLabel = col.label;
      tr.appendChild(cell);
    });

    fragment.appendChild(tr);
  }

  tableBody.replaceChildren(fragment);
}

function th(text, className) {
  const el = document.createElement("th");
  el.textContent = text;
  if (className) {
    el.classList.add(className);
  }
  return el;
}

function tdBit(value) {
  const cell = document.createElement("td");
  cell.className = "truth-table__bit";
  cell.textContent = String(value);
  return cell;
}

/** Столбцы после f: участвуют в шагах 2–3 алгоритма. */
function tdAlgoCol(value, algoCol) {
  const cell = document.createElement("td");
  cell.className = "truth-table__algo-col";
  cell.dataset.algoCol = String(algoCol);
  cell.textContent = String(value);
  return cell;
}

function getAlgoColCount(rows) {
  return rows[0]?.querySelectorAll(".truth-table__algo-col").length ?? 0;
}

function getAlgoCell(tr, colIdx) {
  return tr.querySelector(`.truth-table__algo-col[data-algo-col="${colIdx}"]`);
}

function tdFunction(rowIndex, initial = "0") {
  const cell = document.createElement("td");
  cell.className = "truth-table__f";
  cell.dataset.row = String(rowIndex);
  cell.textContent = initial;
  cell.classList.toggle("truth-table__f--one", initial === "1");
  cell.setAttribute("role", "button");
  cell.setAttribute("tabindex", "0");
  cell.setAttribute("aria-label", `f, строка ${rowIndex + 1}, значение ${initial}`);

  const toggle = () => {
    const next = cell.textContent === "0" ? "1" : "0";
    cell.textContent = next;
    cell.classList.toggle("truth-table__f--one", next === "1");
    cell.setAttribute("aria-label", `f, строка ${rowIndex + 1}, значение ${next}`);
  };

  cell.addEventListener("click", toggle);
  cell.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  return cell;
}

function tdFunctionLocked(rowIndex, value) {
  const cell = document.createElement("td");
  cell.className = "truth-table__f truth-table__f--locked";
  cell.dataset.row = String(rowIndex);
  cell.textContent = value;
  cell.classList.toggle("truth-table__f--one", value === "1");
  return cell;
}

function rowAlgoValues(n, row) {
  const { singles, combos } = groupColumns(n);
  const values = singles.map((col) => String(bitAt(row, col.indices[0])));
  combos.forEach((col) => {
    values.push(bitString(row, col.indices));
  });
  return values;
}

function implicantFromAlgoCol(n, algoCol, value) {
  const { singles, combos } = groupColumns(n);
  if (algoCol < singles.length) {
    return literalFromBit(varLabel(algoCol), value);
  }
  const combo = combos[algoCol - singles.length];
  const parts = [];
  for (let i = 0; i < combo.label.length; i += 1) {
    parts.push(literalFromBit(combo.label[i], value[i]));
  }
  return parts.join("·");
}

/** Ожидаемое решение гарвардского алгоритма для игры. */
function computeGameSolution(n, fValues) {
  const rows = 2 ** n;
  const colCount = groupColumns(n).singles.length + groupColumns(n).combos.length;
  const zeroRows = new Set();
  fValues.forEach((f, i) => {
    if (f === "0") {
      zeroRows.add(i);
    }
  });

  const step1Rows = [...zeroRows];

  const step2Keys = new Set();
  for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
    const excluded = new Set();
    zeroRows.forEach((row) => {
      excluded.add(rowAlgoValues(n, row)[colIdx]);
    });
    for (let row = 0; row < rows; row += 1) {
      if (excluded.has(rowAlgoValues(n, row)[colIdx])) {
        step2Keys.add(`${row}:${colIdx}`);
      }
    }
  }

  const step3Keys = new Set();
  const minKeys = new Set();
  for (let row = 0; row < rows; row += 1) {
    if (zeroRows.has(row)) {
      continue;
    }
    const active = [];
    for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
      const key = `${row}:${colIdx}`;
      if (!step2Keys.has(key)) {
        active.push({ colIdx, value: rowAlgoValues(n, row)[colIdx], key });
      }
    }
    if (active.length === 0) {
      continue;
    }
    const minimum = active.map((a) => a.value).sort()[0];
    active.forEach((item) => {
      if (item.value !== minimum) {
        step3Keys.add(item.key);
      } else {
        minKeys.add(item.key);
      }
    });
  }

  const terms = new Set();
  minKeys.forEach((key) => {
    const [row, colIdx] = key.split(":").map(Number);
    terms.add(implicantFromAlgoCol(n, colIdx, rowAlgoValues(n, row)[colIdx]));
  });

  let mdnf = "0";
  if (zeroRows.size < rows) {
    mdnf = terms.size === 0 ? "—" : [...terms].sort(compareImplicants).join(" ∨ ");
  }

  return { step1Rows, step2Keys, step3Keys, minKeys, mdnf, zeroRows };
}

function cellKey(row, colIdx) {
  return `${row}:${colIdx}`;
}

function readFunctionValues(tableBody) {
  return [...tableBody.querySelectorAll(".truth-table__f")].map((cell) => cell.textContent);
}

function lockFunctionColumn(tableBody) {
  tableBody.querySelectorAll("tr").forEach((tr) => {
    const fCell = tr.querySelector(".truth-table__f");
    if (!fCell) {
      return;
    }

    const clone = fCell.cloneNode(true);
    clone.classList.add("truth-table__f--locked");
    clone.removeAttribute("role");
    clone.removeAttribute("tabindex");

    if (fCell.textContent === "0") {
      tr.classList.add("truth-table__row--zero");
    }

    fCell.replaceWith(clone);
  });

  tableBody.dataset.locked = "true";
}

function isFunctionLocked(tableBody) {
  return tableBody.dataset.locked === "true";
}

/** Шаг 2: в каждом столбце после f зачеркнуть значения из строк с f=0. */
function strikeAlgoColumns(tableBody) {
  const rows = [...tableBody.querySelectorAll("tr")];
  const zeroRows = rows.filter((tr) => tr.classList.contains("truth-table__row--zero"));
  const colCount = getAlgoColCount(rows);

  for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
    const excluded = new Set();

    zeroRows.forEach((tr) => {
      const cell = getAlgoCell(tr, colIdx);
      if (cell) {
        excluded.add(cell.textContent.trim());
      }
    });

    rows.forEach((tr) => {
      const cell = getAlgoCell(tr, colIdx);
      if (cell && excluded.has(cell.textContent.trim())) {
        cell.classList.add("truth-table__algo-col--struck");
      }
    });
  }

  tableBody.dataset.step = "2";
}

/** Шаг 3: в каждой строке после f оставить только минимальное незачёркнутое значение. */
function strikeAlgoExceptMinimum(tableBody) {
  const rows = [...tableBody.querySelectorAll("tr")];

  rows.forEach((tr) => {
    const activeCells = [...tr.querySelectorAll(".truth-table__algo-col")].filter(
      (cell) => !cell.classList.contains("truth-table__algo-col--struck"),
    );

    if (activeCells.length === 0) {
      return;
    }

    const minimum = activeCells
      .map((cell) => cell.textContent.trim())
      .sort()[0];

    tr.querySelectorAll(".truth-table__algo-col").forEach((cell) => {
      cell.classList.remove("truth-table__algo-col--min");

      if (cell.classList.contains("truth-table__algo-col--struck")) {
        return;
      }

      if (cell.textContent.trim() !== minimum) {
        cell.classList.add("truth-table__algo-col--struck");
      } else {
        cell.classList.add("truth-table__algo-col--min");
      }
    });
  });

  tableBody.dataset.step = "3";
}

function getAlgorithmStep(tableBody) {
  return Number(tableBody.dataset.step || "0");
}

function literalFromBit(varName, bit) {
  return bit === "1" ? varName : `¬${varName}`;
}

/** Импликанта из ячейки таблицы (столбец после f). */
function implicantFromCell(cell) {
  const value = cell.textContent.trim();
  const label = cell.dataset.algoLabel || "";

  if (label.length === 1) {
    return literalFromBit(label, value);
  }

  const parts = [];
  for (let i = 0; i < label.length; i += 1) {
    parts.push(literalFromBit(label[i], value[i]));
  }
  return parts.join("·");
}

function compareImplicants(a, b) {
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  return a.localeCompare(b);
}

/**
 * МДНФ: дизъюнкция уникальных импликант из ячеек с минимумом (шаг 3)
 * в строках, где f = 1.
 */
function buildMdnf(tableBody) {
  if (getAlgorithmStep(tableBody) < 3) {
    return null;
  }

  const activeRows = tableBody.querySelectorAll("tr:not(.truth-table__row--zero)");
  if (activeRows.length === 0) {
    return "0";
  }

  const terms = new Set();
  activeRows.forEach((tr) => {
    tr.querySelectorAll(".truth-table__algo-col--min").forEach((cell) => {
      terms.add(implicantFromCell(cell));
    });
  });

  if (terms.size === 0) {
    return "—";
  }

  return [...terms].sort(compareImplicants).join(" ∨ ");
}

window.TruthTable = {
  clampN,
  buildTruthTable,
  randomFValues,
  readFunctionValues,
  lockFunctionColumn,
  strikeAlgoColumns,
  strikeAlgoExceptMinimum,
  buildMdnf,
  implicantFromCell,
  computeGameSolution,
  cellKey,
  getAlgoCell,
  getAlgoColCount,
  strikeComboColumns: strikeAlgoColumns,
  strikeComboExceptMinimum: strikeAlgoExceptMinimum,
  isFunctionLocked,
  getAlgorithmStep,
  varLabel,
};
