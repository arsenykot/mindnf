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

function buildTruthTable(n, tableHead, tableBody) {
  const rows = 2 ** n;
  const { singles, combos } = groupColumns(n);

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
    if (i === singles.length - 1) {
      cell.classList.add("truth-table__sep");
    }
    headRow.appendChild(cell);
  });
  combos.forEach((col) => {
    headRow.appendChild(th(col.label));
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

    const fCell = tdFunction(row);
    fCell.classList.add("truth-table__sep");
    tr.appendChild(fCell);

    singles.forEach((col, i) => {
      const cell = tdAlgoCol(bitAt(row, col.indices[0]), i);
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

function tdFunction(rowIndex) {
  const cell = document.createElement("td");
  cell.className = "truth-table__f";
  cell.dataset.row = String(rowIndex);
  cell.textContent = "0";
  cell.setAttribute("role", "button");
  cell.setAttribute("tabindex", "0");
  cell.setAttribute("aria-label", `f, строка ${rowIndex + 1}, значение 0`);

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

window.TruthTable = {
  clampN,
  buildTruthTable,
  readFunctionValues,
  lockFunctionColumn,
  strikeAlgoColumns,
  strikeAlgoExceptMinimum,
  strikeComboColumns: strikeAlgoColumns,
  strikeComboExceptMinimum: strikeAlgoExceptMinimum,
  isFunctionLocked,
  getAlgorithmStep,
  varLabel,
};
