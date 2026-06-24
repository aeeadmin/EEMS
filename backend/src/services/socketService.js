let ioInstance = null;
const userSocketsMap = new Map(); // Maps user_id -> set of socket ids

function init(server, corsOptions) {
  const socketIo = require('socket.io');
  ioInstance = socketIo(server, {
    cors: corsOptions
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const role = socket.handshake.query.role;

    if (userId) {
      if (!userSocketsMap.has(userId)) {
        userSocketsMap.set(userId, new Set());
      }
      userSocketsMap.get(userId).add(socket.id);
      
      // Join a role-specific room if available
      if (role) {
        socket.join(role);
      }
      
      console.log(`Socket connected: ID=${socket.id}, UserID=${userId}, Role=${role}`);
    }

    socket.on('disconnect', () => {
      if (userId && userSocketsMap.has(userId)) {
        const socketsSet = userSocketsMap.get(userId);
        socketsSet.delete(socket.id);
        if (socketsSet.size === 0) {
          userSocketsMap.delete(userId);
        }
      }
      console.log(`Socket disconnected: ID=${socket.id}`);
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized!');
  }
  return ioInstance;
}

function emitToUser(userId, event, data) {
  if (userSocketsMap.has(userId)) {
    const sockets = userSocketsMap.get(userId);
    const io = getIO();
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

function emitToRole(role, event, data) {
  const io = getIO();
  io.to(role).emit(event, data);
}

function broadcast(event, data) {
  const io = getIO();
  io.emit(event, data);
}

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToRole,
  broadcast
};
