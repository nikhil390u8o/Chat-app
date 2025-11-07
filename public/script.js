const socket = io();
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const params = new URLSearchParams(window.location.search);
const groupLink = params.get('group');

// Join group if link exists
async function joinGroup() {
    if (groupLink) {
        await fetch('/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: groupLink, token })
        });
        socket.emit('join', { groupLink, username });
    }
}

joinGroup();

// Send message
function sendMessage() {
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    if (!message) return;
    socket.emit('chat message', { groupLink, username, message });
    messageInput.value = '';
}

// Create group
async function createGroup() {
    const name = document.getElementById('groupName').value;
    if (!name) return alert("Enter group name");
    const res = await fetch('/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, token })
    });
    const data = await res.json();
    if (data.status === 'ok') {
        alert("Share this link: " + window.location.origin + data.link);
    }
}

// Receive messages
socket.on('chat message', msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    document.getElementById('messages').appendChild(li);
});
