var socket = io();
var canvas = document.querySelector(".whiteboard");
var context = canvas.getContext("2d");

var drawing = false;
var current = {
  color: "#000000",
  mode: "draw" // draw, erase, text
};
var lastPos = { x: 0, y: 0 };
var textInput = document.getElementById("textInput");

// Настройка размера холста с учётом панели управления
function onResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById("controls").offsetHeight;
}
window.addEventListener("resize", onResize);
onResize();

// Выбор цвета
document.getElementById("colorPicker").addEventListener("change", (e) => {
  current.color = e.target.value;
});

// Кнопки режимов
document.getElementById("eraserBtn").addEventListener("click", () => {
  current.mode = "erase";
  textInput.style.display = "none";
});
document.getElementById("drawBtn").addEventListener("click", () => {
  current.mode = "draw";
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

// Очистка холста и рассылка другим клиентам
function clearCanvas(emit) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (emit) {
    socket.emit("clear");
  }
}

// Отрисовка линии
function drawLine(x0, y0, x1, y1, color, emit) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = current.mode === "erase" ? 20 : 2; // Толще для ластика
  context.lineCap = "round";
  context.stroke();
  context.closePath();

  if (!emit) return;

  var w = canvas.width;
  var h = canvas.height;
  socket.emit("drawing", {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color
  });
}

// Отрисовка текста с корректировкой позиции (смещение вниз на 20px)
function drawText(x, y, text, color, emit) {
  context.fillStyle = color;
  context.font = "20px Arial";
  context.fillText(text, x, y + 20);

  if (!emit) return;

  var w = canvas.width;
  var h = canvas.height;
  socket.emit("text", {
    x: x / w,
    y: (y + 20) / h,
    text,
    color
  });
}

// Обработчики указателя с правильными координатами относительно канваса
function onPointerDown(e) {
  e.preventDefault();
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;

  if (current.mode === "text") {
    if (textInput.value.trim() !== "") {
      drawText(x, y, textInput.value, current.color, true);
      textInput.value = "";
    }
  } else {
    drawing = true;
    lastPos.x = x;
    lastPos.y = y;
  }
}

function onPointerMove(e) {
  e.preventDefault();
  if (!drawing) return;

  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;

  if (current.mode === "draw") {
    drawLine(lastPos.x, lastPos.y, x, y, current.color, true);
  } else if (current.mode === "erase") {
    drawLine(lastPos.x, lastPos.y, x, y, "white", true);
  }

  lastPos.x = x;
  lastPos.y = y;
}

function onPointerUp(e) {
  e.preventDefault();
  drawing = false;
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointerout", onPointerUp);

// Обработка входящих событий от сервера
socket.on("drawing", function(data) {
  var w = canvas.width;
  var h = canvas.height;
  drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
});

socket.on("text", function(data) {
  var w = canvas.width;
  var h = canvas.height;
  drawText(data.x * w, data.y * h - 20, data.text, data.color);
});

socket.on("clear", function() {
  clearCanvas(false);
});
