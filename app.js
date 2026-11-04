const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Public klasöründeki statik dosyaları (index.html vb.) sun
app.use(express.static(path.join(__dirname, 'public')));

// Bağlı kullanıcılar listesi
const users = {}; 

io.on('connection', (socket) => {
    console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

    // Giriş yapma / Kullanıcı adı belirleme
    socket.on('set_username', (username) => {
        users[socket.id] = { id: socket.id, username: username };
        updateUserList();
    });

    // Arkadaşlık isteği gönderme
    socket.on('send_friend_request', (targetUsername) => {
        const sender = users[socket.id];
        let targetSocketId = null;

        for (let id in users) {
            if (users[id].username === targetUsername) {
                targetSocketId = id;
                break;
            }
        }

        if (targetSocketId && targetSocketId !== socket.id) {
            io.to(targetSocketId).emit('friend_request_received', {
                from: sender.username
            });
            socket.emit('notification', `${targetUsername} kullanıcısına arkadaşlık isteği gönderildi!`);
        } else {
            socket.emit('notification', 'Kullanıcı bulunamadı veya kendine istek atamazsın!');
        }
    });

    // Mesaj gönderme (Canlı Sohbet)
    socket.on('send_message', (data) => {
        const sender = users[socket.id];
        if (sender) {
            io.emit('receive_message', {
                user: sender.username,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', () => {
        delete users[socket.id];
        updateUserList();
    });

    function updateUserList() {
        const userList = Object.values(users).map(u => u.username);
        io.emit('update_users', userList);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`webdiscr sunucusu ${PORT} portunda başarıyla çalışıyor!`);
});