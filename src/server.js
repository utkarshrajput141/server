const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    socket.to(roomId).emit("user-joined", socket.id);

    socket.on("offer", (data) => {
      socket.to(data.to).emit("offer", {
        from: socket.id,
        offer: data.offer
      });
    });

    socket.on("answer", (data) => {
      socket.to(data.to).emit("answer", {
        from: socket.id,
        answer: data.answer
      });
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.to).emit("ice-candidate", {
        from: socket.id,
        candidate: data.candidate
      });
    });

    socket.on("disconnect", () => {
      for (const room in rooms) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
        socket.to(room).emit("user-left", socket.id);
      }
    });
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
