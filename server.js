const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = "mongodb://localhost:27017/realtime-editor";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Document Schema
const documentSchema = new mongoose.Schema({
  content: String,
});
const Document = mongoose.model("Document", documentSchema);

// Create or Fetch a Document
const DEFAULT_CONTENT = "Start writing...";
app.get("/documents/:id", async (req, res) => {
  const { id } = req.params;
  let document = await Document.findById(id);
  if (!document) {
    document = new Document({ _id: id, content: DEFAULT_CONTENT });
    await document.save();
  }
  res.json(document);
});

// Socket.IO for Real-Time Collaboration
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("get-document", async (documentId) => {
    const document = await Document.findById(documentId);
    socket.join(documentId);
    socket.emit("load-document", document?.content);

    socket.on("send-changes", (delta) => {
      socket.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (content) => {
      await Document.findByIdAndUpdate(documentId, { content });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start Server
const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
