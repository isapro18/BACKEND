/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  app.js — PUNTO DE ENTRADA Y ORQUESTADOR DEL SERVIDOR               ║
 * ║                                                                      ║
 * ║  Este archivo es el núcleo de arranque de la API REST. Su trabajo   ║
 * ║  es montar middlewares globales, registrar rutas y levantar el       ║
 * ║  servidor HTTP. No contiene lógica de negocio.                      ║
 * ║                                                                      ║
 * ║  FLUJO DE UNA PETICIÓN HTTP:                                         ║
 * ║                                                                      ║
 * ║  Cliente HTTP                                                        ║
 * ║    │                                                                 ║
 * ║    ▼                                                                 ║
 * ║  cors()          → Permite peticiones desde el frontend (CORS)      ║
 * ║    │                                                                 ║
 * ║    ▼                                                                 ║
 * ║  express.json()  → Parsea el body JSON a req.body                   ║
 * ║    │                                                                 ║
 * ║    ▼                                                                 ║
 * ║  express.urlencoded() → Parsea formularios HTML a req.body          ║
 * ║    │                                                                 ║
 * ║    ▼                                                                 ║
 * ║  RUTAS ──────────────────────────────────────────────────────────── ║
 * ║    ├── /api/auth   → Registro, login, recuperación de contraseña    ║
 * ║    ├── /api/users  → CRUD de usuarios + auditoría                   ║
 * ║    └── /api/tasks  → CRUD de tareas + asignación + dashboard        ║
 * ║    │                                                                 ║
 * ║    ▼ (si ninguna ruta coincidió)                                    ║
 * ║  404 Handler     → Responde con la ruta que no fue encontrada       ║
 * ║    │                                                                 ║
 * ║    ▼ (si un controlador hizo throw new Error)                       ║
 * ║  globalErrorHandler → Centraliza y estandariza todos los errores    ║
 * ║                                                                      ║
 * ║  ÁRBOL DE RUTAS:                                                     ║
 * ║                                                                      ║
 * ║  POST   /api/auth/register          → Crear cuenta                  ║
 * ║  POST   /api/auth/login             → Iniciar sesión                ║
 * ║  POST   /api/auth/refresh           → Renovar access token          ║
 * ║  POST   /api/auth/forgot-password   → Solicitar código OTP          ║
 * ║  POST   /api/auth/verify-otp        → Validar código OTP            ║
 * ║  POST   /api/auth/reset-password    → Establecer nueva contraseña   ║
 * ║                                                                      ║
 * ║  GET    /api/users                  → Listar todos los usuarios     ║
 * ║  GET    /api/users/:id              → Obtener usuario por ID        ║
 * ║  POST   /api/users                  → Crear usuario (admin)         ║
 * ║  PUT    /api/users/:id              → Actualizar usuario completo   ║
 * ║  PATCH  /api/users/:id/status       → Cambiar estado (activo/...)   ║
 * ║  DELETE /api/users/:id              → Eliminar con auditoría        ║
 * ║  GET    /api/users/:id/tasks        → Tareas de un usuario          ║
 * ║  GET    /api/users/audit/logs       → Historial de auditoría        ║
 * ║                                                                      ║
 * ║  GET    /api/tasks                  → Listar tareas                 ║
 * ║  POST   /api/tasks                  → Crear y asignar tarea(s)      ║
 * ║  GET    /api/tasks/filter           → Filtrar por estado            ║
 * ║  GET    /api/tasks/dashboard        → Métricas del dashboard        ║
 * ║  GET    /api/tasks/:id              → Obtener tarea por ID          ║
 * ║  PUT    /api/tasks/:id              → Actualizar tarea completa     ║
 * ║  PATCH  /api/tasks/:id/status       → Cambiar solo el estado        ║
 * ║  DELETE /api/tasks/:id              → Eliminar tarea                ║
 * ║  POST   /api/tasks/:taskId/assign   → Asignar usuarios a tarea      ║
 * ║  GET    /api/tasks/:taskId/users    → Ver usuarios de una tarea     ║
 * ║  DELETE /api/tasks/:taskId/users/:userId → Remover usuario de tarea ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ── Middleware global de errores ───────────────────────────────────────────────
import { globalErrorHandler } from './middlewares/error.middleware.js';

// ── Core del servidor ──────────────────────────────────────────────────────────
import express from 'express';
import cors    from 'cors';
import 'dotenv/config'; // Carga las variables de entorno desde .env

// ── Conexión a la base de datos ────────────────────────────────────────────────
// Solo importar db.js es suficiente: el pool se crea y prueba al arrancar.
import './config/db.js';

// ── Módulos de rutas ───────────────────────────────────────────────────────────
import userRoutes from './routes/users.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// =============================================================================
// MIDDLEWARES GLOBALES
// Se ejecutan en orden para TODAS las peticiones antes de llegar a las rutas.
// =============================================================================

// Habilita CORS: permite que el frontend (distinto origen) consuma la API
app.use(cors());

// Parsea el cuerpo JSON de la petición → disponible en req.body
app.use(express.json());

// Parsea formularios HTML codificados (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// PASO 1: RUTAS
// Express intenta emparejar cada petición con estas rutas en orden.
// Si ninguna coincide, cae al manejador 404 de abajo.
// =============================================================================
app.use('/api/auth',  authRoutes);  // Autenticación (público y semi-público)
app.use('/api/users', userRoutes);  // Gestión de usuarios (requiere token)
app.use('/api/tasks', taskRoutes);  // Gestión de tareas (requiere token)

// Ruta raíz de bienvenida — útil para verificar que el servidor responde
app.get('/', (req, res) => {
    res.status(200).json({ msn: "Servidor Express funcionando correctamente" });
});

// =============================================================================
// PASO 2: MANEJADOR 404
// Solo se alcanza si ninguna ruta de arriba coincidió con la petición.
// Responde con el método y la ruta exacta que el cliente intentó usar.
// =============================================================================
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        msn: `La ruta ${req.method} ${req.url} no existe en este servidor`
    });
});

// =============================================================================
// PASO 3: MIDDLEWARE GLOBAL DE ERRORES
// Debe registrarse AL FINAL, después de todas las rutas.
// Express lo reconoce como manejador de errores por tener 4 parámetros (err, req, res, next).
// Captura cualquier error lanzado con "throw" desde los controladores (vía catchAsync).
// =============================================================================
app.use(globalErrorHandler);

// =============================================================================
// ARRANQUE DEL SERVIDOR
// Escucha en 0.0.0.0 para ser accesible tanto en localhost como en red local.
// El puerto se lee desde .env; si no existe, usa 3000 como fallback.
// =============================================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://10.5.225.153:${PORT}`);
});