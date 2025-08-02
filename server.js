const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let rooms = {};
let clients = [];

wss.on('connection', ws => {
  clients.push(ws);

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      // Validate username and room
      if (typeof data.username !== 'string' || typeof data.room !== 'string') {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid data format.' }));
        return;
      }

      // Basic sanitization (alphanumeric, spaces, underscores, dashes)
      const isValid = str => /^[a-zA-Z0-9 _-]+$/.test(str);
      if (!isValid(data.username) || !isValid(data.room)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only letters, numbers, spaces, _ and - allowed.' }));
        return;
      }

      // JOIN ROOM
      if (data.type === 'join') {
        const room = data.room.trim();
        const username = data.username.trim();

        rooms[room] = rooms[room] || [];

        const exists = rooms[room].some(client => client.username === username);
        if (exists) {
          ws.send(JSON.stringify({ type: 'error', message: 'Username already taken in this room.' }));
          return;
        }

        ws.username = username;
        ws.room = room;
        rooms[room].push(ws);
        broadcastRooms();
      }

      // MESSAGE
      if (data.type === 'message') {
        if (ws.username && ws.room && rooms[ws.room]) {
          console.log(`[${ws.room}] ${ws.username}: ${data.content}`);
          broadcastMessage(ws.room, {
            type: 'message',
            username: ws.username,
            content: data.content,
            timestamp: data.timestamp
  });
} else {
  ws.send(JSON.stringify({ type: 'error', message: 'You must join a room first.' }));
}

      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Malformed message received.' }));
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter(c => c !== ws);
      if (rooms[ws.room].length === 0) delete rooms[ws.room];
    }
    broadcastRooms();
  });
});

function broadcastRooms() {
  const roomNames = Object.keys(rooms);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'rooms', rooms: roomNames }));
    }
  });
}

function broadcastMessage(room, message) {
  if (!rooms[room]) return;
  rooms[room].forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

server.listen(3000, () => {
  console.log('WebSocket server running on ws://localhost:3000');
});
