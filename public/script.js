const socket = io();
const canvas = document.querySelector(".whiteboard");
const context = canvas.getContext("2d");

let drawing = false;
let current = {
  color: "#000000",
  mode: "draw",
  penWidth: 2,
  eraserWidth: 20
};
let lastPos = { x: 0, y: 0 };
const textInput = document.getElementById("textInput");

function resizeCanvas() {
  const image = canvas.toDataURL();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById("controls").offsetHeight;
  const img = new Image();
  img.onload = () => context.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = image;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// UI handlers
document.getElementById("colorPicker").addEventListener("change", e => current.color = e.target.value);
document.getElementById("penWidth").addEventListener("input", e => current.penWidth = +e.target.value);
document.getElementById("eraserWidth").addEventListener("input", e => current.eraserWidth = +e.target.value);
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
document.getElementById("clearBtn").addEventListener("click", () => clearCanvas(true));

function clearCanvas(emit) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (emit) socket.emit("clear");
}

function drawLine(x0, y0, x1, y1, color, width, emit) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.stroke();
  context.closePath();

  if (emit) {
    socket.emit("drawing", {
      x0: x0 / canvas.width,
      y0: y0 / canvas.height,
      x1: x1 / canvas.width,
      y1: y1 / canvas.height,
      color,
      width
    });
  }
}

function drawText(x, y, text, color, emit) {
  context.fillStyle = color;
  context.font = "20px Arial";
  context.fillText(text, x, y + 20);
  if (emit) {
    socket.emit("text", {
      x: x / canvas.width,
      y: (y + 20) / canvas.height,
      text,
      color
    });
  }
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX || e.touches?.[0].clientX) - rect.left,
    y: (e.clientY || e.touches?.[0].clientY) - rect.top
  };
}

canvas.addEventListener("pointerdown", e => {
  const pos = getPos(e);
  if (current.mode === "text") {
    if (textInput.value.trim()) {
      drawText(pos.x, pos.y, textInput.value, current.color, true);
      textInput.value = "";
    }
  } else {
    drawing = true;
    lastPos = pos;
  }
});

canvas.addEventListener("pointermove", e => {
  if (!drawing) return;
  const pos = getPos(e);
  if (current.mode === "draw") {
    drawLine(lastPos.x, lastPos.y, pos.x, pos.y, current.color, current.penWidth, true);
  } else if (current.mode === "erase") {
    drawLine(lastPos.x, lastPos.y, pos.x, pos.y, "white", current.eraserWidth, true);
  }
  lastPos = pos;
});

canvas.addEventListener("pointerup", () => drawing = false);
canvas.addEventListener("pointerout", () => drawing = false);

socket.on("drawing", data => {
  drawLine(
    data.x0 * canvas.width,
    data.y0 * canvas.height,
    data.x1 * canvas.width,
    data.y1 * canvas.height,
    data.color,
    data.width
  );
});
socket.on("text", data => {
  drawText(data.x * canvas.width, data.y * canvas.height - 20, data.text, data.color);
});
socket.on("clear", () => clearCanvas(false));
