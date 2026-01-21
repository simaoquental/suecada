
import mysql from 'mysql2/promise';

// Pool de ligações
export const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',        
  database: 'suecada',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
