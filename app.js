const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/public"));

let history = [];

io.on("connection", (socket) => {
  console.log("Користувач відключився");

  history.forEach(event => {
    socket.emit(event.type, event.data);
  });

  socket.on("drawing", (data) => {
    history.push({ type: "drawing", data });
    socket.broadcast.emit("drawing", data);
  });

  socket.on("text", (data) => {
    history.push({ type: "text", data });
    socket.broadcast.emit("text", data);
  });

  socket.on("clear", () => {
    history = [];
    socket.broadcast.emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("Користувач віключився");
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
