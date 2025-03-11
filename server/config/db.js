import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar al pool de la base de datos:', err);
    } else {
        console.log('Conexión exitosa al pool de la base de datos');
        connection.release();
    }
});

export default pool.promise();
