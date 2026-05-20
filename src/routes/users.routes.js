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
    deleteUser, patchUserStatus, getUserTasks, getAuditLogs,
    getMe, updateMe, patchUserRoles
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

// Historial de auditoría
usersRouter.get('/audit/logs',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_AUDIT),
    getAuditLogs
);

// Perfil propio — cualquier usuario autenticado puede ver sus datos
// ⚠️ Debe estar ANTES de /:id o Express leería "me" como un ID numérico
usersRouter.get('/me',
    verifyToken,
    getMe
);

// Actualizar perfil propio — cualquier usuario autenticado
usersRouter.patch('/me',
    verifyToken,
    updateMe
);

// Tareas de un usuario específico
usersRouter.get('/:id/tasks',
    verifyToken,
    getUserTasks
);

// Cambiar roles de un usuario — Admin (array de role_ids)
usersRouter.patch('/:id/roles',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_UPDATE_STATUS),
    patchUserRoles
);

// =============================================================================
// CRUD PRINCIPAL DE USUARIOS
// =============================================================================

usersRouter.get('/',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_READ_ALL),
    getUsers
);

usersRouter.get('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_READ_ALL),
    getUserById
);

usersRouter.post('/',
    verifyToken,
    checkPermission(PERMISSIONS.USERS_CREATE),
    validateSchema(createUserSchema),
    createUser
);

usersRouter.put('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    validateSchema(updateUserSchema),
    updateUser
);

// =============================================================================
// GESTIÓN DE ESTADO Y ELIMINACIÓN
// =============================================================================

usersRouter.patch('/:id/status',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    patchUserStatus
);

usersRouter.delete('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    deleteUser
);

export default usersRouter;