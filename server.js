const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Group = require('./models/Group');

const JWT_SECRET = 'secretkey123';

// Connect MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/chat-app', { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const user = new User({ username, password: hash });
        await user.save();
        res.json({ status: 'ok' });
    } catch {
        res.json({ status: 'error', error: 'Username already exists' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ status: 'error', error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.json({ status: 'error', error: 'Invalid password' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ status: 'ok', token });
});

// Create Group
app.post('/group', async (req, res) => {
    const { name, token } = req.body;
    const payload = jwt.verify(token, JWT_SECRET);
    const link = Math.random().toString(36).substr(2, 8);
    const group = new Group({ name, link, members: [payload.id] });
    await group.save();
    res.json({ status: 'ok', link: `/chat.html?group=${link}&token=${token}` });
});

// Join group by link
app.post('/join', async (req, res) => {
    const { link, token } = req.body;
    const payload = jwt.verify(token, JWT_SECRET);
    const group = await Group.findOne({ link });
    if (!group) return res.json({ status: 'error', error: 'Group not found' });
    if (!group.members.includes(payload.id)) group.members.push(payload.id);
    await group.save();
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
        socket.to(groupLink).emit('chat message', `${username} joined the group`);
    });

    socket.on('chat message', ({ groupLink, username, message }) => {
        io.to(groupLink).emit('chat message', `${username}: ${message}`);
    });
});

http.listen(3000, () => console.log('Server running on http://localhost:3000'));
