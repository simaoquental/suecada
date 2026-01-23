import mysql from 'mysql2/promise';

// 1. Criar o Pool (chamado db)
export const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',        
  database: 'suecada',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Testar a ligação (Para Promises, usamos uma função imediata ou apenas tentamos um query)
db.getConnection()
  .then(conn => {
    console.log('✅ Ligado ao MySQL via Pool (Laragon)!');
    conn.release(); // Importante: libertar a ligação de volta para o pool
  })
  .catch(err => {
    console.error('❌ Erro ao ligar ao MySQL:', err.message);
  });

export default db;