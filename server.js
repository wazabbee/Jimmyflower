const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 託管靜態前端檔案
app.use(express.static(path.join(__dirname, 'public')));

// 留言檔案路徑
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// 讀取留言的輔助函式
function loadMessages() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('讀取留言失敗:', err);
    }
    return [];
}

// 儲存留言的輔助函式
function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    } catch (err) {
        console.error('儲存留言失敗:', err);
    }
}

io.on('connection', (socket) => {
    console.log('有使用者連線:', socket.id);

    // 當使用者連線時，直接發送所有歷史留言
    socket.emit('load-messages', loadMessages());

    // 接收新留言
    socket.on('new-message', ({ sender, text }) => {
        const messageData = {
            id: Date.now(),
            sender,
            text,
            timestamp: new Date().toLocaleString('zh-TW', { hour12: false })
        };

        // 讀取現有留言並追加新留言
        const messages = loadMessages();
        messages.push(messageData);
        saveMessages(messages);

        // 廣播給所有在線的人（即時顯示）
        io.emit('chat-message', messageData);
    });

    socket.on('disconnect', () => {
        console.log('使用者斷線:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`留言板伺服器運行中：http://localhost:${PORT}`);
});
