/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  users.routes.js — RUTAS DE USUARIOS                                ║
 * ║                                                                      ║
 * ║  Define todos los endpoints del módulo de gestión de usuarios.      ║
 * ║  Todas las rutas son PRIVADAS (requieren verifyToken).              ║
 * ║                                                                      ║
 * ║  BASE: /api/users  (montado en app.js)                              ║
 * ║                                                                      ║
 * ║  ORDEN CRÍTICO DE RUTAS:                                            ║
 * ║  /audit/logs y /:id/tasks deben registrarse ANTES de /:id          ║
 * ║  para que Express no interprete "audit" o el ID como un :id.       ║
 * ║                                                                      ║
 * ║  PERMISOS POR RUTA:                                                 ║
 * ║                                                                      ║
 * ║  GET    /audit/logs      SYSTEM_AUDIT (Auditor y SuperAdmin)       ║
 * ║  GET    /:id/tasks       solo verifyToken (estudiante ve las suyas) ║
 * ║  GET    /                USERS_READ_ALL                             ║
 * ║  GET    /:id             USERS_READ_ALL                             ║
 * ║  POST   /                USERS_CREATE                               ║
 * ║  PUT    /:id             SYSTEM_MANAGE_ALL (solo SuperAdmin)        ║
 * ║  PATCH  /:id/status      SYSTEM_MANAGE_ALL (soft delete)           ║
 * ║  DELETE /:id             SYSTEM_MANAGE_ALL + ?reason= obligatorio  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';
import {
    getUsers, getUserById, createUser, updateUser,
    deleteUser, patchUserStatus, getUserTasks, getAuditLogs
} from '../controllers/users.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';
import { validateSchema }               from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import { PERMISSIONS } from '../constants/permissions.js';

const usersRouter = express.Router();

// =============================================================================
// RUTAS ESPECÍFICAS (sin parámetros genéricos)
// ⚠️  Deben ir ANTES de /:id para evitar que Express las interprete como IDs.
// =============================================================================

// Historial de auditoría: acciones críticas registradas en audit_logs.
// Solo Auditores y SuperAdmins tienen el permiso SYSTEM_AUDIT.
usersRouter.get('/audit/logs',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_AUDIT),
    getAuditLogs
);

// Tareas de un usuario específico.
// Solo requiere estar logueado: el estudiante puede ver las suyas propias
// sin necesitar el permiso de gestión (USERS_READ_ALL).
usersRouter.get('/:id/tasks',
    verifyToken,
    getUserTasks
);

// =============================================================================
// CRUD PRINCIPAL DE USUARIOS
// =============================================================================

// Listar todos los usuarios del sistema (con rol normalizado)
usersRouter.get('/',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_READ_ALL),
    getUsers
);

// Obtener el detalle de un usuario por ID
usersRouter.get('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_READ_ALL),
    getUserById
);

// Crear un nuevo usuario desde el panel de administración.
// La contraseña temporal es los últimos 4 dígitos del documento.
usersRouter.post('/',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_CREATE),
    validateSchema(createUserSchema),
    createUser
);

// Actualización completa de datos de un usuario (solo SuperAdmin)
usersRouter.put('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    validateSchema(updateUserSchema),
    updateUser
);

// =============================================================================
// GESTIÓN DE ESTADO Y ELIMINACIÓN
// =============================================================================

// Soft delete / reactivación: cambia el estado entre 'activo' e 'inactivo'.
// El usuario inactivo no puede iniciar sesión pero sigue en la BD.
usersRouter.patch('/:id/status',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    patchUserStatus
);

// Hard delete con auditoría obligatoria.
// Requiere el query param ?reason= con la justificación del administrador.
// El controlador guarda el log ANTES de eliminar el registro.
usersRouter.delete('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    deleteUser
);

export default usersRouter;