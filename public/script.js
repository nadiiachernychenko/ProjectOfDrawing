const socket = io();
const canvas = document.querySelector(".whiteboard");
const context = canvas.getContext("2d");

const textInput = document.getElementById("textInput");
let drawing = false;
let current = {
  color: "#000000",
  mode: "draw"
};
let lastPos = { x: 0, y: 0 };

// Збереження історії локально
let history = [];

// Визначаємо координати
function getPointerCoords(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else {
    return { x: e.clientX, y: e.clientY };
  }
}

// Малювання лінії
function drawLine(x0, y0, x1, y1, color, width = 2, save = true, emit = false) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.stroke();
  context.closePath();

  if (emit) {
    const w = canvas.width;
    const h = canvas.height;
    socket.emit("drawing", {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
      width
    });
  }

  if (save) {
    history.push({ type: "drawing", data: { x0, y0, x1, y1, color, width } });
  }
}

// Малювання тексту
function drawText(x, y, text, color, emit = false, save = true) {
  context.fillStyle = color;
  context.font = "20px Arial";
  context.fillText(text, x, y + 20);

  if (emit) {
    const w = canvas.width;
    const h = canvas.height;
    socket.emit("text", {
      x: x / w,
      y: (y + 20) / h,
      text,
      color
    });
  }

  if (save) {
    history.push({ type: "text", data: { x, y: y + 20, text, color } });
  }
}

// Очистка
function clearCanvas(emit = false) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  history = [];

  if (emit) socket.emit("clear");
}

// Перерисовка історії
function redrawHistory() {
  for (const item of history) {
    if (item.type === "drawing") {
      drawLine(
        item.data.x0,
        item.data.y0,
        item.data.x1,
        item.data.y1,
        item.data.color,
        item.data.width,
        false,
        false
      );
    } else if (item.type === "text") {
      drawText(item.data.x, item.data.y - 20, item.data.text, item.data.color, false, false);
    }
  }
}

// Події керування
document.getElementById("colorPicker").addEventListener("change", e => {
  current.color = e.target.value;
});
document.getElementById("drawBtn").addEventListener("click", () => {
  current.mode = "draw";
  textInput.style.display = "none";
});
document.getElementById("eraserBtn").addEventListener("click", () => {
  current.mode = "erase";
  textInput.style.display = "none";
});
document.getElementById("textBtn").addEventListener("click", () => {
  current.mode = "text";
  textInput.style.display = "inline-block";
  textInput.focus();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  clearCanvas(true);
});

// Вказівник
function onPointerDown(e) {
  e.preventDefault();
  const pos = getPointerCoords(e);
  const rect = canvas.getBoundingClientRect();
  const x = pos.x - rect.left;
  const y = pos.y - rect.top;

  if (current.mode === "text") {
    if (textInput.value.trim() !== "") {
      drawText(x, y, textInput.value, current.color, true);
      textInput.value = "";
    }
  } else {
    drawing = true;
    lastPos = { x, y };
  }
}

function onPointerMove(e) {
  e.preventDefault();
  if (!drawing) return;

  const pos = getPointerCoords(e);
  const rect = canvas.getBoundingClientRect();
  const x = pos.x - rect.left;
  const y = pos.y - rect.top;

  if (current.mode === "draw") {
    drawLine(lastPos.x, lastPos.y, x, y, current.color, 2, true, true);
  } else if (current.mode === "erase") {
    drawLine(lastPos.x, lastPos.y, x, y, "white", 20, true, true);
  }

  lastPos = { x, y };
}

function onPointerUp(e) {
  drawing = false;
}

// Події
canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
canvas.addEventListener("pointermove", onPointerMove, { passive: false });
canvas.addEventListener("pointerup", onPointerUp, { passive: false });
canvas.addEventListener("pointerout", onPointerUp, { passive: false });

// Розмір
function resizeCanvas() {
  const savedHistory = [...history];
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById("controls").offsetHeight;
  history = savedHistory;
  redrawHistory();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Socket події
socket.on("drawing", data => {
  const w = canvas.width;
  const h = canvas.height;
  drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.width, true, false);
});
socket.on("text", data => {
  const w = canvas.width;
  const h = canvas.height;
  drawText(data.x * w, data.y * h - 20, data.text, data.color, false);
});
socket.on("clear", () => {
  clearCanvas(false);
});
