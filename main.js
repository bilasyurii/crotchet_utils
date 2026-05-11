const rowsContainer = document.getElementById("rowsContainer");
const countInput = document.getElementById("countInput");
const generateMoreBtn = document.getElementById("generateMoreBtn");
const completeBtn = document.getElementById("completeBtn");
const undoBtn = document.getElementById("undoBtn");
const clearProgressBtn = document.getElementById("clearProgressBtn");
const STORAGE_KEY = "crotchet_sequences_v1";

document.addEventListener(
  "dblclick",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

const state = {
  rows: [],
  active: null,
};

function normalizeActive(active, rows) {
  if (!active || !Number.isInteger(active.row) || !Number.isInteger(active.item)) {
    return null;
  }
  if (active.row < 0 || active.row >= rows.length) {
    return null;
  }
  const rowLength = rows[active.row].tokens.length;
  if (active.item < 0 || active.item >= rowLength) {
    return null;
  }
  return { row: active.row, item: active.item };
}

function persistState() {
  try {
    const payload = {
      rows: state.rows,
      active: state.active,
      countInputValue: countInput.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore persistence errors to keep UI usable.
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.rows)) {
      return false;
    }

    const hasValidRows = parsed.rows.every((row) => {
      return (
        row &&
        typeof row.rowNumber === "number" &&
        Array.isArray(row.tokens) &&
        row.tokens.every((token) => token === "I" || token === "II")
      );
    });

    if (!hasValidRows) {
      return false;
    }

    state.rows = parsed.rows;
    state.active = normalizeActive(parsed.active, state.rows);

    const inputValue = Number.parseInt(parsed.countInputValue, 10);
    if (!Number.isNaN(inputValue) && inputValue > 0) {
      countInput.value = String(inputValue);
    }

    return state.rows.length > 0;
  } catch (_error) {
    return false;
  }
}

function parseRequestedCount() {
  const value = Number.parseInt(countInput.value, 10);
  if (Number.isNaN(value) || value < 1) {
    return 1;
  }
  return value;
}

function buildRowTokens(rowIndex) {
  const m = rowIndex;
  const tokens = [];

  if (m % 2 === 1) {
    for (let pair = 0; pair < 6; pair += 1) {
      for (let i = 0; i < m; i += 1) {
        tokens.push("I");
      }
      tokens.push("II");
    }
    return tokens;
  }

  const half = m / 2;
  for (let i = 0; i < half; i += 1) {
    tokens.push("I");
  }

  for (let pair = 0; pair < 6; pair += 1) {
    tokens.push("II");
    if (pair < 5) {
      for (let i = 0; i < m; i += 1) {
        tokens.push("I");
      }
    }
  }

  for (let i = 0; i < half; i += 1) {
    tokens.push("I");
  }

  return tokens;
}

function createRows(count, startAtRowNumber) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const rowNumber = startAtRowNumber + i;
    created.push({
      rowNumber,
      tokens: buildRowTokens(rowNumber - 1),
    });
  }
  return created;
}

function isBeforeActive(rowIndex, itemIndex) {
  if (!state.active) {
    return false;
  }
  if (rowIndex < state.active.row) {
    return true;
  }
  if (rowIndex === state.active.row && itemIndex < state.active.item) {
    return true;
  }
  return false;
}

function getCompletedItemsInRow(rowIndex) {
  if (!state.active) {
    return 0;
  }

  if (rowIndex < state.active.row) {
    return state.rows[rowIndex].tokens.length;
  }

  if (rowIndex === state.active.row) {
    return state.active.item;
  }

  return 0;
}

function isRowComplete(rowIndex) {
  if (!state.active) {
    return state.rows.length > 0;
  }
  return getCompletedItemsInRow(rowIndex) === state.rows[rowIndex].tokens.length;
}

function shouldHideRemoveButton(rowIndex) {
  const lastRowIndex = state.rows.length - 1;
  if (rowIndex !== lastRowIndex) {
    return true;
  }

  if (!state.active) {
    return true;
  }

  if (state.active.row === rowIndex) {
    return true;
  }

  if (isRowComplete(rowIndex)) {
    return true;
  }

  return false;
}

function buildInstructionForRow(rowIndex) {
  if (!state.active || state.active.row !== rowIndex) {
    return null;
  }

  const row = state.rows[rowIndex];
  const startIndex = state.active.item;
  const activeToken = row.tokens[startIndex];
  let amount = 1;

  for (let i = startIndex + 1; i < row.tokens.length; i += 1) {
    if (row.tokens[i] !== activeToken) {
      break;
    }
    amount += 1;
  }

  const tokenLabel =
    activeToken === "I"
      ? amount === 1
        ? "стовпчик"
        : "стовпчики"
      : amount === 1
        ? "прибавка"
        : "прибавки";
  return `додати ${amount} ${tokenLabel}`;
}

function render() {
  if (state.rows.length === 0) {
    rowsContainer.innerHTML = '<div class="empty">Згенеруйте ряди, щоб почати.</div>';
    return;
  }

  rowsContainer.innerHTML = "";

  state.rows.forEach((row, rowIndex) => {
    const rowCard = document.createElement("section");
    rowCard.className = "row-card";

    const head = document.createElement("div");
    head.className = "row-head";

    const title = document.createElement("div");
    title.className = "row-title";
    title.textContent = `Ряд ${row.rowNumber}`;

    const actions = document.createElement("div");
    actions.className = "row-head-actions";

    if (!isRowComplete(rowIndex)) {
      const completeRowBtn = document.createElement("button");
      completeRowBtn.className = "row-complete";
      completeRowBtn.type = "button";
      completeRowBtn.textContent = "✅ Завершити ряд";
      completeRowBtn.addEventListener("click", () => completeRow(rowIndex));
      actions.appendChild(completeRowBtn);
    }

    if (!shouldHideRemoveButton(rowIndex)) {
      const removeRowBtn = document.createElement("button");
      removeRowBtn.className = "row-remove";
      removeRowBtn.type = "button";
      removeRowBtn.textContent = "🗑️ Видалити ряд";
      removeRowBtn.addEventListener("click", () => removeRow(rowIndex));
      actions.appendChild(removeRowBtn);
    }

    head.append(title, actions);

    const track = document.createElement("div");
    track.className = "row-track";

    row.tokens.forEach((token, tokenIndex) => {
      const tokenEl = document.createElement("button");
      tokenEl.className = "token";
      tokenEl.type = "button";
      tokenEl.textContent = token;
      tokenEl.dataset.row = String(rowIndex);
      tokenEl.dataset.item = String(tokenIndex);

      const isActive =
        state.active &&
        state.active.row === rowIndex &&
        state.active.item === tokenIndex;

      if (isBeforeActive(rowIndex, tokenIndex)) {
        tokenEl.classList.add("done");
      }
      if (isActive) {
        tokenEl.classList.add("active");
      }

      tokenEl.addEventListener("click", () => {
        state.active = { row: rowIndex, item: tokenIndex };
        updateUI();
      });

      track.appendChild(tokenEl);

      if (tokenIndex < row.tokens.length - 1) {
        const separator = document.createElement("span");
        separator.className = "separator";
        separator.textContent = "-";
        if (isBeforeActive(rowIndex, tokenIndex + 1)) {
          separator.classList.add("done");
        }
        track.appendChild(separator);
      }
    });

    rowCard.append(head, track);
    const instruction = buildInstructionForRow(rowIndex);
    if (instruction) {
      const instructionEl = document.createElement("div");
      instructionEl.className = "row-instruction";
      instructionEl.textContent = instruction;
      rowCard.appendChild(instructionEl);
    }
    rowsContainer.appendChild(rowCard);
  });
}

function updateUI() {
  render();
  scrollToActive();
  persistState();
}

function moveForward() {
  if (state.rows.length === 0) {
    return;
  }

  if (!state.active) {
    state.active = { row: 0, item: 0 };
    updateUI();
    return;
  }

  const { row, item } = state.active;
  const rowLength = state.rows[row].tokens.length;

  if (item < rowLength - 1) {
    state.active = { row, item: item + 1 };
    updateUI();
    return;
  }

  if (row < state.rows.length - 1) {
    state.active = { row: row + 1, item: 0 };
    updateUI();
    return;
  }

  state.active = null;
  updateUI();
}

function moveBackward() {
  if (state.rows.length === 0) {
    return;
  }

  if (!state.active) {
    const lastRow = state.rows.length - 1;
    const lastItem = state.rows[lastRow].tokens.length - 1;
    state.active = { row: lastRow, item: lastItem };
    updateUI();
    return;
  }

  const { row, item } = state.active;
  if (item > 0) {
    state.active = { row, item: item - 1 };
    updateUI();
    return;
  }

  if (row > 0) {
    const prevRow = row - 1;
    const prevItem = state.rows[prevRow].tokens.length - 1;
    state.active = { row: prevRow, item: prevItem };
    updateUI();
  }
}

function completeRow(rowIndex) {
  if (state.rows.length === 0) {
    return;
  }

  if (rowIndex < state.rows.length - 1) {
    state.active = { row: rowIndex + 1, item: 0 };
  } else {
    state.active = null;
  }

  updateUI();
}

function scrollToActive() {
  if (!state.active) {
    return;
  }

  const selector = `.token[data-row="${state.active.row}"][data-item="${state.active.item}"]`;
  const activeEl = rowsContainer.querySelector(selector);
  if (!activeEl) {
    return;
  }

  activeEl.scrollIntoView({
    block: "center",
    inline: "center",
    behavior: "smooth",
  });
}

function resetRows() {
  const count = parseRequestedCount();
  state.rows = createRows(count, 1);
  state.active = state.rows.length > 0 ? { row: 0, item: 0 } : null;
  updateUI();
}

function addMoreRows() {
  const count = parseRequestedCount();
  const nextRowNumber =
    state.rows.length > 0 ? state.rows[state.rows.length - 1].rowNumber + 1 : 1;
  const newRows = createRows(count, nextRowNumber);
  state.rows.push(...newRows);
  if (!state.active && state.rows.length > 0) {
    state.active = { row: 0, item: 0 };
  }
  updateUI();
}

function removeRow(rowIndex) {
  if (rowIndex < 0 || rowIndex >= state.rows.length) {
    return;
  }

  const completedItems = getCompletedItemsInRow(rowIndex);
  if (completedItems > 0) {
    const isConfirmed = window.confirm(
      "У цьому ряді вже є виконані елементи. Видалити ряд?",
    );
    if (!isConfirmed) {
      return;
    }
  }

  state.rows.splice(rowIndex, 1);

  if (state.rows.length === 0) {
    state.active = null;
    updateUI();
    return;
  }

  if (state.active) {
    if (rowIndex < state.active.row) {
      state.active = { row: state.active.row - 1, item: state.active.item };
    } else if (rowIndex === state.active.row) {
      const newRowIndex = Math.min(rowIndex, state.rows.length - 1);
      state.active = { row: newRowIndex, item: 0 };
    }
    state.active = normalizeActive(state.active, state.rows);
  }

  updateUI();
}

function clearProgress() {
  const isConfirmed = window.confirm(
    "Очистити збережений прогрес і скинути послідовності? Це неможливо скасувати.",
  );
  if (!isConfirmed) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Ignore storage clear errors and still reset UI.
  }

  countInput.value = "5";
  state.rows = [];
  state.active = null;
  resetRows();
}

generateMoreBtn.addEventListener("click", addMoreRows);
completeBtn.addEventListener("click", moveForward);
undoBtn.addEventListener("click", moveBackward);
clearProgressBtn.addEventListener("click", clearProgress);
countInput.addEventListener("input", persistState);

if (restoreState()) {
  render();
  scrollToActive();
} else {
  resetRows();
}
