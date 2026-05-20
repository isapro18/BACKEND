/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  tasks.controller.js — CONTROLADOR DE TAREAS                        ║
 * ║                                                                      ║
 * ║  Gestiona el ciclo de vida completo de las tareas del sistema.      ║
 * ║                                                                      ║
 * ║  MODELO DE DATOS (muchos a muchos):                                 ║
 * ║    tasks      → almacena título y descripción (sin estado ni userId) ║
 * ║    user_tasks → tabla pivote: (task_id, user_id, status)            ║
 * ║                 Cada fila = una asignación con su propio estado     ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  getTasks          → Lista tareas con sus usuarios asignados        ║
 * ║  getTaskById       → Obtiene una tarea con sus asignaciones         ║
 * ║  createTask        → Crea la tarea e inserta en user_tasks          ║
 * ║  updateTask        → Actualiza título y/o descripción de la tarea   ║
 * ║  deleteTask        → Elimina la tarea (CASCADE borra user_tasks)    ║
 * ║  patchTaskStatus   → Cambia el status en user_tasks para ese usuario║
 * ║  getTasksByUser    → Tareas asignadas a un usuario con su estado    ║
 * ║  filterTasks       → Filtra por estado en user_tasks                ║
 * ║  getDashboard      → Métricas globales desde user_tasks             ║
 * ║  assignTaskToUsers → Inserta nuevas filas en user_tasks             ║
 * ║  getTaskUsers      → Usuarios asignados a una tarea                 ║
 * ║  removeUserFromTask→ Borra la fila de user_tasks                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool from '../config/db.js';
import { catchAsync }      from '../utils/catchAsync.js';
import { successResponse } from '../utils/response.handler.js';

// =============================================================================
// GET TASKS — GET /api/tasks
// Devuelve todas las tareas con la lista de usuarios asignados y sus estados.
// Usa LEFT JOIN para incluir tareas aunque no tengan asignaciones aún.
// =============================================================================
export const getTasks = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.createdAt,
            ut.user_id  AS userId,
            ut.status,
            u.name      AS userName,
            creator.id   AS creatorId,
            creator.name AS creatorName,
            (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ')
             FROM user_roles ur2
             JOIN roles r ON r.id = ur2.role_id
             WHERE ur2.user_id = creator.id
            ) AS creatorRoles
        FROM tasks t
        LEFT JOIN user_tasks ut ON t.id = ut.task_id
        LEFT JOIN users u       ON ut.user_id = u.id
        LEFT JOIN users creator ON t.created_by = creator.id
        ORDER BY t.id DESC
    `);
    return successResponse(res, 200, "Tareas obtenidas correctamente", rows);
});

// =============================================================================
// GET TASK BY ID — GET /api/tasks/:id
// Devuelve la tarea con TODOS sus usuarios asignados y sus estados individuales.
// =============================================================================
export const getTaskById = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.createdAt,
            ut.user_id AS userId,
            ut.status,
            u.name     AS userName,
            creator.id   AS creatorId,
            creator.name AS creatorName,
            (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ')
             FROM user_roles ur2
             JOIN roles r ON r.id = ur2.role_id
             WHERE ur2.user_id = creator.id
            ) AS creatorRoles
        FROM tasks t
        LEFT JOIN user_tasks ut ON t.id = ut.task_id
        LEFT JOIN users u       ON ut.user_id = u.id
        LEFT JOIN users creator ON t.created_by = creator.id
        WHERE t.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
        const error = new Error("Tarea no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Tarea encontrada", rows);
});

// =============================================================================
// CREATE TASK — POST /api/tasks
// Requiere: TASKS_CREATE_MULTIPLE
//
// Flujo con la tabla pivote:
//   1. Inserta UNA sola fila en tasks (título + descripción)
//   2. Inserta UNA fila en user_tasks por cada userId del array
//      con status = 'pendiente' por defecto
//
// Ventaja: no se duplica el título/descripción por cada estudiante.
// Existe una sola tarea y múltiples asignaciones con estado independiente.
// =============================================================================
export const createTask = catchAsync(async (req, res) => {
    const { title, description, userIds, userId } = req.body;

    // Normalizamos: aceptamos userIds (array) o userId (singular)
    const listaIds = userIds?.length > 0 ? userIds : userId ? [userId] : [];

    if (listaIds.length === 0) {
        const error = new Error("Debes asignar la tarea a al menos un usuario");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Paso 1: creamos la tarea UNA sola vez en tasks, guardando quién la creó
    const [result] = await pool.query(
        'INSERT INTO tasks (title, description, created_by) VALUES (?, ?, ?)',
        [title, description || null, req.user.id]
    );
    const taskId = result.insertId;

    // Paso 2: insertamos una fila en user_tasks por cada usuario asignado
    for (const uid of listaIds) {
        await pool.query(
            'INSERT INTO user_tasks (task_id, user_id, status) VALUES (?, ?, ?)',
            [taskId, uid, 'pendiente']
        );
    }

    return successResponse(res, 201, `Tarea creada y asignada a ${listaIds.length} usuario(s) exitosamente`);
});

// =============================================================================
// UPDATE TASK — PUT /api/tasks/:id
// Requiere: TASKS_UPDATE_ALL
//
// Actualiza título y/o descripción de la tarea en la tabla tasks.
// El status NO se toca aquí — vive en user_tasks por asignación.
// Para cambiar el status usar PATCH /:id/status.
// =============================================================================
export const updateTask = catchAsync(async (req, res) => {
    const { title, description } = req.body;
    const taskId = req.params.id;

    const fields = [];
    const values = [];

    if (title !== undefined)       { fields.push('title = ?');       values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }

    if (fields.length === 0) {
        const error = new Error("No se enviaron campos para actualizar");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    values.push(taskId);
    const [result] = await pool.query(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    if (result.affectedRows === 0) {
        const error = new Error("Tarea no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Tarea actualizada correctamente");
});

// =============================================================================
// DELETE TASK — DELETE /api/tasks/:id
// Requiere: TASKS_DELETE_ALL
//
// Elimina la tarea de la tabla tasks.
// Las filas de user_tasks se eliminan automáticamente por ON DELETE CASCADE.
// =============================================================================
export const deleteTask = catchAsync(async (req, res) => {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        const error = new Error("Tarea no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Tarea eliminada correctamente");
});

// =============================================================================
// PATCH TASK STATUS — PATCH /api/tasks/:id/status
// Requiere: solo verifyToken
//
// Cambia el status en user_tasks SOLO para el usuario que hace la petición.
// El userId se extrae del JWT — el estudiante no puede cambiar el status
// de la asignación de otro estudiante.
// =============================================================================
export const patchTaskStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const taskId = req.params.id;
    const userId = req.user.id; // extraído del JWT por verifyToken

    if (!status) {
        const error = new Error("El campo status es obligatorio");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Actualizamos SOLO la fila de este usuario en user_tasks
    const [result] = await pool.query(
        'UPDATE user_tasks SET status = ? WHERE task_id = ? AND user_id = ?',
        [status, taskId, userId]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Asignación no encontrada para este usuario y tarea");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Estado de la tarea actualizado");
});

// =============================================================================
// GET TASKS BY USER — GET /api/users/:userId/tasks
// Devuelve las tareas asignadas a un usuario con su estado individual.
// Usado por el estudiante para cargar solo sus tareas desde el dashboard.
// =============================================================================
export const getTasksByUser = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.createdAt,
            ut.status
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.user_id = ?
        ORDER BY t.id DESC
    `, [req.params.userId]);

    return successResponse(res, 200, "Tareas del usuario obtenidas", rows);
});

// =============================================================================
// FILTER TASKS — GET /api/tasks/filter?status=pendiente
// Requiere: TASKS_READ_ALL
// Filtra por el status de la asignación en user_tasks.
// =============================================================================
export const filterTasks = catchAsync(async (req, res) => {
    const { status } = req.query;

    const [rows] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.createdAt,
            ut.user_id AS userId,
            ut.status,
            u.name     AS userName
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        JOIN users u ON ut.user_id = u.id
        WHERE ut.status = ?
        ORDER BY t.id DESC
    `, [status]);

    return successResponse(res, 200, "Tareas filtradas", rows);
});

// =============================================================================
// GET DASHBOARD — GET /api/tasks/dashboard
// Requiere: TASKS_READ_ALL
//
// Las métricas se calculan sobre user_tasks (asignaciones)
// porque el estado vive en la pivote, no en tasks.
// =============================================================================
export const getDashboard = catchAsync(async (req, res) => {
    const [total]       = await pool.query('SELECT COUNT(*) as count FROM user_tasks');
    const [pendientes]  = await pool.query('SELECT COUNT(*) as count FROM user_tasks WHERE status = "pendiente"');
    const [completadas] = await pool.query('SELECT COUNT(*) as count FROM user_tasks WHERE status = "completada"');

    return successResponse(res, 200, "Métricas del dashboard obtenidas", {
        total:       total[0].count,
        pendientes:  pendientes[0].count,
        completadas: completadas[0].count
    });
});

// =============================================================================
// ASSIGN TASK TO USERS — POST /api/tasks/:taskId/assign
// Requiere: TASKS_CREATE_MULTIPLE
//
// Agrega nuevas asignaciones a una tarea existente.
// INSERT IGNORE evita error si el usuario ya estaba asignado (PK duplicada).
// =============================================================================
export const assignTaskToUsers = catchAsync(async (req, res) => {
    const { userIds } = req.body;
    const taskId = req.params.taskId;

    if (!userIds || userIds.length === 0) {
        const error = new Error("Debes enviar al menos un userId");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    for (const uid of userIds) {
        await pool.query(
            'INSERT IGNORE INTO user_tasks (task_id, user_id, status) VALUES (?, ?, ?)',
            [taskId, uid, 'pendiente']
        );
    }

    return successResponse(res, 200, "Usuarios asignados a la tarea");
});

// =============================================================================
// GET TASK USERS — GET /api/tasks/:taskId/users
// Requiere: TASKS_READ_ALL
// Devuelve todos los usuarios asignados a una tarea con su estado individual.
// =============================================================================
export const getTaskUsers = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT
            u.id,
            u.name,
            u.email,
            ut.status
        FROM user_tasks ut
        JOIN users u ON ut.user_id = u.id
        WHERE ut.task_id = ?
    `, [req.params.taskId]);

    if (rows.length === 0) {
        return successResponse(res, 200, "La tarea no tiene usuarios asignados", []);
    }

    return successResponse(res, 200, "Usuarios de la tarea obtenidos", rows);
});

// =============================================================================
// REMOVE USER FROM TASK — DELETE /api/tasks/:taskId/users/:userId
// Requiere: TASKS_UPDATE_ALL
// Elimina la fila de user_tasks que relaciona esa tarea con ese usuario.
// =============================================================================
export const removeUserFromTask = catchAsync(async (req, res) => {
    await pool.query(
        'DELETE FROM user_tasks WHERE task_id = ? AND user_id = ?',
        [req.params.taskId, req.params.userId]
    );
    return successResponse(res, 200, "Usuario removido de la tarea");
});

// PATCH /api/tasks/:taskId/users/:userId/status
// El instructor cambia el status de la asignación de UN estudiante específico
export const patchAssignmentStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const { taskId, userId } = req.params;

    if (!status) {
        const error = new Error("El campo status es obligatorio");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const [result] = await pool.query(
        'UPDATE user_tasks SET status = ? WHERE task_id = ? AND user_id = ?',
        [status, taskId, userId]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Asignación no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Estado de la asignación actualizado");
});