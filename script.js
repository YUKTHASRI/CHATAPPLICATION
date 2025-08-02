let socket;
let currentRoom = '';
let username = '';

function joinChat() {
  username = document.getElementById('username').value.trim();

  // Validate username
  if (!username || username.length < 2 || /[^a-zA-Z0-9]/.test(username)) {
    return alert('Enter a valid username (only letters/numbers, min 2 characters)');
  }

  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('chat-container').classList.remove('hidden');

  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => console.log('✅ WebSocket Connected');

  socket.onmessage = event => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'message':
        addMessage(data);
        break;
      case 'rooms':
        updateRoomList(data.rooms);
        break;
      case 'error':
        alert(data.message);
        break;
    }
  };

  socket.onerror = error => {
    console.error('WebSocket error:', error);
  };
}

function createRoom() {
  const room = document.getElementById('new-room').value.trim();
  if (!room || /[^a-zA-Z0-9 _-]/.test(room)) {
    return alert('Enter a valid room name (letters/numbers/spaces)');
  }
  joinRoom(room);
}

function joinRoom(room) {
  currentRoom = room;

  // Send join message to server
  socket.send(JSON.stringify({ type: 'join', username, room }));

  // Delay showing chat input to ensure join message registers
  setTimeout(() => {
    document.getElementById('room-name').textContent = room;
    document.getElementById('chat-room').classList.remove('hidden');
  }, 100);
}

function sendMessage() {
  const msg = document.getElementById('message-input').value.trim();
  if (!msg) return;

  if (!currentRoom) {
    alert('Please join a room first.');
    return;
  }

  socket.send(JSON.stringify({
    type: 'message',
    username,
    room: currentRoom,
    content: msg,
    timestamp: new Date().toLocaleTimeString()
  }));

  document.getElementById('message-input').value = '';
}

function handleKey(e) {
  if (e.key === 'Enter') sendMessage();
}

function sanitize(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMessage(text) {
  // Markdown-style formatting
  text = text.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');
  text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  return text;
}

function addMessage({ username, content, timestamp }) {
  const messages = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message';

  const safeContent = sanitize(content);
  div.innerHTML = `<strong>${username}</strong> <em>${timestamp}</em>: ${formatMessage(safeContent)}`;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function updateRoomList(rooms) {
  const list = document.getElementById('rooms-list');
  const roomCount = document.getElementById('room-count');

  list.innerHTML = '';
  roomCount.textContent = rooms.length;

  if (rooms.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No rooms available';
    li.style.color = '#777';
    li.style.fontStyle = 'italic';
    list.appendChild(li);
  } else {
    rooms.forEach(room => {
      const li = document.createElement('li');
      li.textContent = room;
      li.onclick = () => joinRoom(room);
      list.appendChild(li);
    });
  }
}
