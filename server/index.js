const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
let dotenv = require("dotenv");
dotenv.config();

const server = http.createServer(app);
const { Server } = require("socket.io");

// ✅ Socket.IO with CORS support for frontend at localhost:3000
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",  // Frontend URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("hello");
});

let rooms = [];
const Port = process.env.PORT || 4000;

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  // Join Room
  socket.on("joinRoom", (data) => {
    console.log("🟢 Joined room:", data.roomId);
    socket.join(data.roomId);

    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      // Send existing canvas to the new user
      io.to(socket.id).emit("updateCanvas", elements);
      elements.user = [...elements.user, socket.id];
    } else {
      rooms.push({
        roomId: data.roomId,
        updatedElements: [],
        user: [socket.id],
        canvasColor: "#121212",
      });
    }
  });

  // Update Canvas
  socket.on("updateCanvas", (data) => {
    socket.to(data.roomId).emit("updateCanvas", data);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      elements.updatedElements = data.updatedElements;
      elements.canvasColor = data.canvasColor;
    }
  });

  // Send Message
  socket.on("sendMessage", (data) => {
    socket.to(data.roomId).emit("getMessage", data);
   
  });

  // Keep Render server awake
  socket.on("pong", () => {
    setTimeout(() => {
      socket.emit("ping");
    }, 120000);
  });

  // Disconnect
  socket.on("disconnect", () => {
    rooms.forEach((element) => {
      element.user = element.user.filter((user) => user !== socket.id);
      if (element.user.length === 0) {
        rooms = rooms.filter((room) => room.roomId !== element.roomId);
      }
    });
  });
});

server.listen(Port, () => {
  console.log(`🚀 Server listening on *:${Port}`);
});
