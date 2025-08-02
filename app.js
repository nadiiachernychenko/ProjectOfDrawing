const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/public"));

// Массив для хранения всех событий рисования и текста
let history = [];

io.on("connection", (socket) => {
  console.log("Пользователь подключился");

  // При подключении отправляем всю историю
  history.forEach(event => {
    socket.emit(event.type, event.data);
  });

  socket.on("drawing", (data) => {
    // Сохраняем событие в истории
    history.push({ type: "drawing", data });
    // Рассылаем другим
    socket.broadcast.emit("drawing", data);
  });

  socket.on("text", (data) => {
    history.push({ type: "text", data });
    socket.broadcast.emit("text", data);
  });

  socket.on("clear", () => {
    // Очищаем историю, т.к. доска очищена
    history = [];
    socket.broadcast.emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился");
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
