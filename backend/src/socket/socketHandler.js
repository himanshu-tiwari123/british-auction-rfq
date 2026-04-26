const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Client joins a room specific to an RFQ to get live updates for it
    socket.on("join_rfq", (rfqId) => {
      const room = `rfq-${rfqId}`;
      socket.join(room);
      console.log(`[SOCKET] ${socket.id} joined room ${room}`);
    });

    // Client leaves the room when they navigate away
    socket.on("leave_rfq", (rfqId) => {
      const room = `rfq-${rfqId}`;
      socket.leave(room);
      console.log(`[SOCKET] ${socket.id} left room ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSocket };