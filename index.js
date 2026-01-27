import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './socket.js'; // Assume-se que socket.js está na pasta servidor
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Importa a DB (certifica-te que db.js está na pasta servidor)
import './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

/**
 * CORREÇÃO DO CAMINHO:
 * Se o index.js está em 'servidor/' e os ficheiros em 'cliente/'
 * precisamos de sair da pasta servidor (../) e entrar na pasta cliente
 */
const clientePath = path.join(__dirname, '../cliente'); 
app.use(express.static(clientePath));

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

async function startServer() {
    console.log("\x1b[36m%s\x1b[0m", "=== SERVIDOR SUECADA PRO ===");
    
    try {
        setupSockets(io);
        console.log(`Lógica do Jogo: \x1b[32m✅ OK\x1b[0m`);
    } catch (e) {
        console.log(`Erro Lógica: \x1b[31m${e.message}\x1b[0m`);
    }

    const PORT = 3000;
    httpServer.listen(PORT, '0.0.0.0', () => {
        const ip = getLocalIP();
        console.log(`\n📂 A servir ficheiros de: ${clientePath}`);
        console.log(`▶ Local: http://localhost:${PORT}`);
        console.log(`▶ Rede:  http://${ip}:${PORT}\n`);
    });
}

startServer();