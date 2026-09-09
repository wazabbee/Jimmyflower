const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 託管靜態前端檔案
app.use(express.static(path.join(__dirname, 'public')));

// 儲存線上使用者與離線訊息
const users = {}; // { socketId: username }
const offlineMessages = {
    // username: [ { sender, text, timestamp }, ... ]
};

io.on('connection', (socket) => {
    console.log('有使用者連線:', socket.id);

    // 使用者登入並註冊身分
    socket.on('register', (username) => {
        users[socket.id] = username;
        console.log(`${username} 已註冊身分`);

        // 檢查是否有離線留言，若有則推送並清空
        if (offlineMessages[username] && offlineMessages[username].length > 0) {
            socket.emit('offline-messages', offlineMessages[username]);
            offlineMessages[username] = [];
        }
    });

    // 處理聊天訊息
    socket.on('private-message', ({ recipient, text }) => {
        const sender = users[socket.id];
        const messageData = {
            sender,
            text,
            timestamp: new Date().toLocaleTimeString()
        };

        // 尋找接收方是否在線上
        const recipientSocketId = Object.keys(users).find(
            (id) => users[id] === recipient
        );

        if (recipientSocketId) {
            // 接收方線上，直接即時發送
            io.to(recipientSocketId).emit('chat-message', messageData);
            console.log(`即時訊息從 ${sender} 傳給 ${recipient}`);
        } else {
            // 接收方離線，存入離線留言
            if (!offlineMessages[recipient]) {
                offlineMessages[recipient] = [];
            }
            offlineMessages[recipient].push(messageData);
            console.log(`使用者 ${recipient} 離線，訊息已暫存。`);
            
            // 通知發送方訊息已轉為離線留言
            socket.emit('message-stored', { recipient, text });
        }
    });

    // 斷線處理
    socket.on('disconnect', () => {
        console.log('使用者斷線:', socket.id);
        delete users[socket.id];
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行中：http://localhost:${PORT}`);
});
