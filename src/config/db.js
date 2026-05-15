/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  db.js — CONFIGURACIÓN Y POOL DE CONEXIONES A MYSQL                 ║
 * ║                                                                      ║
 * ║  Este módulo crea un pool de conexiones reutilizables a la base     ║
 * ║  de datos MySQL. Exporta el pool para que cualquier controlador     ║
 * ║  pueda ejecutar consultas sin abrir/cerrar conexiones manualmente.  ║
 * ║                                                                      ║
 * ║  ¿QUÉ ES UN POOL DE CONEXIONES?                                     ║
 * ║  En lugar de abrir una conexión nueva por cada query (lento y       ║
 * ║  costoso), el pool mantiene un grupo de conexiones abiertas y       ║
 * ║  las reutiliza. Cuando un controlador necesita hacer una query,     ║
 * ║  pide prestada una conexión del pool y la devuelve al terminar.     ║
 * ║                                                                      ║
 * ║  CONFIGURACIÓN (leída desde .env):                                  ║
 * ║    DB_HOST     → Dirección del servidor MySQL (ej: localhost)       ║
 * ║    DB_USER     → Usuario de la base de datos                        ║
 * ║    DB_PASSWORD → Contraseña del usuario                             ║
 * ║    DB_NAME     → Nombre de la base de datos                         ║
 * ║    DB_PORT     → Puerto MySQL (por defecto 3306)                    ║
 * ║                                                                      ║
 * ║  PARÁMETROS DEL POOL:                                               ║
 * ║    waitForConnections: true  → Encola la petición si el pool está   ║
 * ║                                lleno, en vez de fallar de inmediato ║
 * ║    connectionLimit: 10       → Máximo de conexiones simultáneas     ║
 * ║    queueLimit: 0             → Cola ilimitada de peticiones en espera║
 * ║                                                                      ║
 * ║  VERIFICACIÓN AL ARRANCAR:                                          ║
 * ║  Al importar este módulo, se intenta obtener una conexión de prueba ║
 * ║  para verificar que la BD es accesible. Si falla, se imprime el     ║
 * ║  error en consola (el servidor sigue arrancando).                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import mysql from 'mysql2/promise';
import 'dotenv/config';

// =============================================================================
// CREACIÓN DEL POOL
// mysql2/promise nos permite usar async/await en todas las queries.
// Todas las credenciales se leen desde variables de entorno (.env).
// =============================================================================
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT,

    // Si el pool está lleno, las nuevas peticiones esperan en cola
    waitForConnections: true,

    // Número máximo de conexiones abiertas al mismo tiempo
    connectionLimit: 10,

    // 0 = sin límite en la cola de peticiones en espera
    queueLimit: 0
});

// =============================================================================
// PRUEBA DE CONEXIÓN AL ARRANCAR
// Solicitamos una conexión del pool únicamente para verificar que la BD
// responde. connection.release() la devuelve al pool inmediatamente.
// Si falla (credenciales incorrectas, servidor caído, etc.), el error
// se muestra en consola pero NO detiene el servidor.
// =============================================================================
pool.getConnection()
    .then(connection => {
        console.log(`Conexión exitosa a la base de datos MySQL (${process.env.DB_NAME})`);
        connection.release(); // Devolvemos la conexión al pool
    })
    .catch(error => {
        console.error('Error conectando a la base de datos:', error.message);
    });

// Exportamos el pool para que los controladores hagan: pool.query(...)
export default pool;