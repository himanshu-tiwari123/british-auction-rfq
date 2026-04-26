require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const rfqRoutes = require("./routes/rfqRoutes");
const bidRoutes = require("./routes/bidRoutes");
const authRoutes = require("./routes/authRoutes");
const { initSocket } = require("./socket/socketHandler");
const { startAuctionCron } = require("./jobs/auctionCron");

const app = express();
const server = http.createServer(app);

// Socket.io setup — allow frontend origin
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"],
  },
});

// Make io accessible in controllers via app
app.set("io", io);

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rfq", rfqRoutes);
app.use("/api/bid", bidRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "British Auction RFQ API is running" });
});

// Initialize socket listeners
initSocket(io);

// Start cron job that checks auction extensions every 30 seconds
startAuctionCron(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});