const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secretkey123';

// In-memory storage
const users = {};    // { username: { passwordHash } }
const groups = {};   // { groupLink: { name, members: [username] } }

app.use(express.json());
app.use(express.static('public'));

// Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if(users[username]) return res.json({ status: 'error', error: 'Username exists' });
    const hash = await bcrypt.hash(password, 10);
    users[username] = { password: hash };
    res.json({ status: 'ok' });
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if(!user) return res.json({ status: 'error', error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if(!valid) return res.json({ status: 'error', error: 'Invalid password' });
    const token = jwt.sign({ username }, JWT_SECRET);
    res.json({ status: 'ok', token });
});

// Create group
app.post('/group', (req, res) => {
    const { name, token } = req.body;
    const payload = jwt.verify(token, JWT_SECRET);
    const link = Math.random().toString(36).substring(2, 8);
    groups[link] = { name, members: [payload.username] };
    res.json({ status: 'ok', link: `/chat.html?group=${link}&token=${token}` });
});

// Join group
app.post('/join', (req, res) => {
    const { link, token } = req.body;
    const payload = jwt.verify(token, JWT_SECRET);
    if(!groups[link]) return res.json({ status: 'error', error: 'Group not found' });
    if(!groups[link].members.includes(payload.username)) groups[link].members.push(payload.username);
    res.json({ status: 'ok' });
});

// Serve chat page
app.get('/chat.html', (req, res) => {
    res.sendFile(__dirname + '/public/chat.html');
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('join', ({ groupLink, username }) => {
        socket.join(groupLink);
        socket.to(groupLink).emit('chat message', `✨ ${username} joined the group ✨`);
    });

    socket.on('chat message', ({ groupLink, username, message }) => {
        io.to(groupLink).emit('chat message', `${username}: ${message}`);
    });
});

http.listen(3000, () => console.log('Server running on http://localhost:3000'));
