import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // A tua password do MySQL aqui
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Criamos o pool (o 'database: suecada' é adicionado após a verificação)
export const db = mysql.createPool({
    ...dbConfig,
    database: 'suecada'
});

async function inicializarBancoDeDados() {
  try {
    console.log('⏳ A verificar servidor MySQL e base de dados...');
    
    // 1. Ligação temporária para garantir que a DB existe
    const tempConn = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS suecada`);
    await tempConn.end();

    // 2. Executar o ficheiro SQL para garantir as tabelas
    const connection = await db.getConnection();
    const sqlPath = path.join(__dirname, 'suecada.sql');
    
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    const queries = sqlContent.split(';').filter(q => q.trim() !== '');
    
    for (let query of queries) {
      await connection.query(query);
    }
    
    connection.release();
    console.log('✅ Base de dados e tabelas verificadas/criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar base de dados:', error.message);
  }
}

// Inicia a verificação automaticamente
inicializarBancoDeDados();