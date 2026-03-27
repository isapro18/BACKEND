import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar la conexión al arrancar el servidor
pool.getConnection()
    .then(connection => {
        console.log(`Conexión exitosa a la base de datos MySQL (${process.env.DB_NAME})`);
        connection.release(); 
    })
    .catch(error => {
        console.error('Error conectando a la base de datos:', error.message);
    });

export default pool;