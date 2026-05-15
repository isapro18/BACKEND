/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  tasks.routes.js — RUTAS DE TAREAS                                  ║
 * ║                                                                      ║
 * ║  Define todos los endpoints del módulo de tareas.                   ║
 * ║  Todas las rutas son PRIVADAS (requieren verifyToken).              ║
 * ║  Cada ruta especifica además qué permiso RBAC necesita.             ║
 * ║                                                                      ║
 * ║  BASE: /api/tasks  (montado en app.js)                              ║
 * ║                                                                      ║
 * ║  ORDEN CRÍTICO DE RUTAS:                                            ║
 * ║  Las rutas con path exacto (/filter, /dashboard) DEBEN registrarse ║
 * ║  ANTES de las rutas con parámetros (/:id), porque Express evalúa   ║
 * ║  las rutas en orden y "/:id" capturaría "filter" como un ID.       ║
 * ║                                                                      ║
 * ║  PERMISOS POR RUTA:                                                 ║
 * ║                                                                      ║
 * ║  GET    /filter          TASKS_READ_ALL                             ║
 * ║  GET    /dashboard       TASKS_READ_ALL                             ║
 * ║  GET    /                TASKS_READ_ALL  OR  TASKS_READ_OWN (*)    ║
 * ║  POST   /                TASKS_CREATE_MULTIPLE                      ║
 * ║  GET    /:id             solo verifyToken                           ║
 * ║  PUT    /:id             TASKS_UPDATE_ALL                           ║
 * ║  DELETE /:id             TASKS_DELETE_ALL                           ║
 * ║  PATCH  /:id/status      solo verifyToken (autogestión estudiante)  ║
 * ║  POST   /:taskId/assign  TASKS_CREATE_MULTIPLE                      ║
 * ║  GET    /:taskId/users   TASKS_READ_ALL                             ║
 * ║  DELETE /:taskId/users/:userId  TASKS_UPDATE_ALL                   ║
 * ║                                                                      ║
 * ║  (*) checkPermissionAny: acepta CUALQUIERA de los dos permisos.    ║
 * ║  Permite que el estudiante (TASKS_READ_OWN) también acceda a GET / ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';
import {
    getTasks, getTaskById, createTask, updateTask, deleteTask,
    assignTaskToUsers, getTaskUsers, removeUserFromTask, filterTasks,
    patchTaskStatus, getDashboard
} from '../controllers/tasks.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';
import { validateSchema }               from '../middlewares/validate.middleware.js';
import {
    createTaskSchema, updateTaskSchema,
    assignTaskSchema, filterTaskQuerySchema
} from '../schemas/task.schema.js';
import { PERMISSIONS } from '../constants/permissions.js';

const tasksRouter = express.Router();

// =============================================================================
// RUTAS ESPECÍFICAS (sin parámetros)
// ⚠️  Deben ir ANTES de las rutas con /:id para evitar conflictos de matching.
// =============================================================================

// Filtra tareas por ?status=pendiente|en progreso|completada|incompleta
tasksRouter.get('/filter',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_READ_ALL),
    validateSchema(filterTaskQuerySchema, 'query'), // valida el query param
    filterTasks
);

// Métricas globales: total, pendientes y completadas
tasksRouter.get('/dashboard',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_READ_ALL),
    getDashboard
);

// =============================================================================
// RUTAS PRINCIPALES DE TAREAS
// =============================================================================

// Listar todas las tareas.
// checkPermissionAny: instructor (TASKS_READ_ALL) o estudiante (TASKS_READ_OWN)
// pueden acceder. Sin esto, el estudiante recibía 403 aunque estuviera logueado.
tasksRouter.get('/',
    verifyToken,
    checkPermissionAny(PERMISSIONS.TASKS_READ_ALL, PERMISSIONS.TASKS_READ_OWN),
    getTasks
);

// Crear y asignar tarea(s) a uno o varios estudiantes
tasksRouter.post('/',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_CREATE_MULTIPLE),
    validateSchema(createTaskSchema),
    createTask
);

// Obtener una tarea específica (no requiere permiso extra: solo sesión válida)
tasksRouter.get('/:id',
    verifyToken,
    getTaskById
);

// Actualizar título, descripción y/o estado de una tarea (aprobar/rechazar)
tasksRouter.put('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_UPDATE_ALL),
    validateSchema(updateTaskSchema),
    updateTask
);

// Eliminar una tarea definitivamente
tasksRouter.delete('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_DELETE_ALL),
    deleteTask
);

// Cambiar solo el status de una tarea (autogestión del estudiante)
// Cualquier usuario logueado puede actualizar su propio progreso
tasksRouter.patch('/:id/status',
    verifyToken,
    patchTaskStatus
);

// =============================================================================
// RUTAS DE ASIGNACIÓN
// Gestionan la relación tarea ↔ usuario (asignar, consultar, remover).
// =============================================================================

// Asignar o reasignar usuarios a una tarea existente
tasksRouter.post('/:taskId/assign',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_CREATE_MULTIPLE),
    validateSchema(assignTaskSchema),
    assignTaskToUsers
);

// Ver qué usuario tiene asignada la tarea
tasksRouter.get('/:taskId/users',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_READ_ALL),
    getTaskUsers
);

// Desvincular un usuario de una tarea (userId → NULL)
tasksRouter.delete('/:taskId/users/:userId',
    verifyToken,
    checkPermission(PERMISSIONS.TASKS_UPDATE_ALL),
    removeUserFromTask
);

export default tasksRouter;

// =============================================================================
// HELPER LOCAL: checkPermissionAny(...requiredPermissions)
//
// Variante de checkPermission que concede acceso si el usuario posee
// CUALQUIERA de los permisos recibidos (lógica OR en vez de AND).
//
// Se define aquí para no modificar auth.middleware.js y mantenerlo simple.
// Si en el futuro se necesita en más rutas, puede moverse al middleware.
// =============================================================================
function checkPermissionAny(...requiredPermissions) {
    return (req, res, next) => {
        // Verificamos que el JWT tenga un array de permisos válido
        if (!req.user?.permissions || !Array.isArray(req.user.permissions)) {
            return res.status(403).json({
                ok: false,
                msn: "La sesión no contiene permisos válidos."
            });
        }

        // Aprobamos si el usuario tiene AL MENOS UNO de los permisos requeridos
        const hasAny = requiredPermissions.some(p => req.user.permissions.includes(p));

        if (!hasAny) {
            return res.status(403).json({
                ok: false,
                msn: `Se requiere uno de estos permisos: [${requiredPermissions.join(', ')}]`
            });
        }

        next();
    };
}