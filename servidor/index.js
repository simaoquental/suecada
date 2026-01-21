import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './socket.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const clientePath = path.join(__dirname, '../cliente');
app.use(express.static(clientePath));

setupSockets(io);

app.use((req, res) => {
    res.sendFile(path.join(clientePath, 'index.html'));
});

httpServer.listen(3000, () => {
    console.log('Servidor ligado: http://localhost:3000');
});