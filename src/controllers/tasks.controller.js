/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  tasks.controller.js — CONTROLADOR DE TAREAS                        ║
 * ║                                                                      ║
 * ║  Gestiona el ciclo de vida completo de las tareas del sistema:      ║
 * ║  creación, asignación, consulta, actualización y eliminación.       ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  getTasks          → Lista todas las tareas del sistema             ║
 * ║  getTaskById       → Obtiene una tarea por su ID                   ║
 * ║  createTask        → Crea y asigna tarea(s) a uno o varios         ║
 * ║                       usuarios (asignación masiva con userIds[])    ║
 * ║  updateTask        → Actualiza campos seleccionados de una tarea   ║
 * ║                       (query dinámica, no pisa campos vacíos)       ║
 * ║  deleteTask        → Elimina una tarea de la BD                    ║
 * ║  patchTaskStatus   → Cambia solo el campo status de una tarea      ║
 * ║  getTasksByUser    → Lista todas las tareas asignadas a un usuario  ║
 * ║  filterTasks       → Filtra tareas por estado desde query param     ║
 * ║  getDashboard      → Devuelve métricas globales (total/estado)      ║
 * ║  assignTaskToUsers → Reasigna una tarea existente a otro usuario   ║
 * ║  getTaskUsers      → Obtiene el usuario asignado a una tarea       ║
 * ║  removeUserFromTask→ Desvincula un usuario de una tarea (userId=NULL)║
 * ║                                                                      ║
 * ║  ESTADOS VÁLIDOS DE UNA TAREA:                                      ║
 * ║    "pendiente" → "en progreso" → "completada" | "incompleta"       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool from '../config/db.js';
import { catchAsync }      from '../utils/catchAsync.js';
import { successResponse } from '../utils/response.handler.js';

// =============================================================================
// GET TASKS — GET /api/tasks
// Devuelve todas las tareas registradas en el sistema.
// Requiere: TASKS_READ_ALL o TASKS_READ_OWN (ver tasks.routes.js)
// =============================================================================
export const getTasks = catchAsync(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM tasks');
    return successResponse(res, 200, "Tareas obtenidas correctamente", rows);
});

// =============================================================================
// GET TASK BY ID — GET /api/tasks/:id
// Busca una tarea específica por su ID. Responde 404 si no existe.
// =============================================================================
export const getTaskById = catchAsync(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
        const error = new Error("Tarea no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Tarea encontrada", rows[0]);
});

// =============================================================================
// CREATE TASK — POST /api/tasks
// Requiere: TASKS_CREATE_MULTIPLE
//
// Soporta DOS modos de asignación:
//   A) userIds (array)  → Crea UNA tarea por cada usuario del array.
//                         Útil para asignar la misma tarea a un grupo
//                         de estudiantes en una sola petición.
//   B) userId (singular) → Crea una sola tarea para un usuario específico.
//
// Si no viene ninguno de los dos, responde con 400.
// =============================================================================
export const createTask = catchAsync(async (req, res) => {
    const { title, description, userIds, userId } = req.body;

    let tareasCreadas = 0;

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // ── MODO MASIVO: una tarea por cada userId del array ─────────────────
        for (const uid of userIds) {
            await pool.query(
                'INSERT INTO tasks (title, description, userId) VALUES (?, ?, ?)',
                [title, description || null, uid]
            );
            tareasCreadas++;
        }
    } else if (userId) {
        // ── MODO SINGULAR: una sola tarea para un usuario ────────────────────
        await pool.query(
            'INSERT INTO tasks (title, description, userId) VALUES (?, ?, ?)',
            [title, description || null, userId]
        );
        tareasCreadas = 1;
    } else {
        const error = new Error("Debes asignar la tarea a al menos un usuario");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    return successResponse(res, 201, `Se asignaron ${tareasCreadas} tarea(s) exitosamente`);
});

// =============================================================================
// UPDATE TASK — PUT /api/tasks/:id
// Requiere: TASKS_UPDATE_ALL
//
// Actualización DINÁMICA: solo se actualizan los campos que llegaron en
// el body. Esto evita pisar datos existentes con undefined cuando el
// instructor, por ejemplo, solo quiere rechazar (cambiar status) sin
// tocar el título ni la descripción.
//
// Ejemplo: { status: "incompleta" } → solo actualiza el status.
// =============================================================================
export const updateTask = catchAsync(async (req, res) => {
    const { title, description, status } = req.body;
    const taskId = req.params.id;

    // Construimos la query de forma dinámica solo con los campos recibidos
    const fields = [];
    const values = [];

    if (title !== undefined)       { fields.push('title = ?');       values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (status !== undefined)      { fields.push('status = ?');      values.push(status); }

    // Si el cliente no envió ningún campo útil, rechazamos la petición
    if (fields.length === 0) {
        const error = new Error("No se enviaron campos para actualizar");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Agregamos el ID de la tarea al final como parámetro del WHERE
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
// Eliminación directa (hard delete). Responde 404 si no existe la tarea.
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
// Requiere: solo verifyToken (cualquier usuario autenticado)
//
// Ruta de autogestión del estudiante: le permite avanzar el estado de
// su tarea (ej: "pendiente" → "en progreso") sin tener acceso al
// endpoint de actualización completa (TASKS_UPDATE_ALL).
// =============================================================================
export const patchTaskStatus = catchAsync(async (req, res) => {
    const { status } = req.body;

    if (!status) {
        const error = new Error("El campo status es obligatorio");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const [result] = await pool.query(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [status, req.params.id]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Tarea no encontrada");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Estado de la tarea actualizado");
});

// =============================================================================
// GET TASKS BY USER — GET /api/users/:userId/tasks (también llamado internamente)
// Devuelve todas las tareas asignadas a un userId específico.
// Usado por la vista del estudiante para cargar su lista de tareas.
// =============================================================================
export const getTasksByUser = catchAsync(async (req, res) => {
    const [rows] = await pool.query(
        'SELECT * FROM tasks WHERE userId = ?', [req.params.userId]
    );
    return successResponse(res, 200, "Tareas del usuario obtenidas", rows);
});

// =============================================================================
// FILTER TASKS — GET /api/tasks/filter?status=pendiente
// Requiere: TASKS_READ_ALL
// Filtra tareas por el valor de status pasado como query parameter.
// El schema de Zod (filterTaskQuerySchema) valida que el status sea uno
// de los cuatro valores permitidos antes de llegar aquí.
// =============================================================================
export const filterTasks = catchAsync(async (req, res) => {
    const { status } = req.query;
    const [rows] = await pool.query('SELECT * FROM tasks WHERE status = ?', [status]);
    return successResponse(res, 200, "Tareas filtradas", rows);
});

// =============================================================================
// GET DASHBOARD — GET /api/tasks/dashboard
// Requiere: TASKS_READ_ALL
//
// Devuelve las métricas globales del sistema de tareas en tres conteos:
//   - total:      todas las tareas sin importar estado
//   - pendientes: tareas aún no iniciadas
//   - completadas: tareas finalizadas con éxito
//
// Usadas por el panel principal del Instructor y el SuperAdmin.
// =============================================================================
export const getDashboard = catchAsync(async (req, res) => {
    const [total]       = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const [pendientes]  = await pool.query('SELECT COUNT(*) as count FROM tasks WHERE status = "pendiente"');
    const [completadas] = await pool.query('SELECT COUNT(*) as count FROM tasks WHERE status = "completada"');

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
// Reasigna una tarea existente a otro usuario. En el modelo actual la
// tarea tiene un solo userId, así que se actualiza con el primer ID
// del array recibido (userIds[0]).
// =============================================================================
export const assignTaskToUsers = catchAsync(async (req, res) => {
    const { userIds } = req.body;
    const taskId = req.params.taskId;

    if (userIds && userIds.length > 0) {
        // Tomamos el primer elemento del array (modelo de asignación singular)
        await pool.query('UPDATE tasks SET userId = ? WHERE id = ?', [userIds[0], taskId]);
    }
    return successResponse(res, 200, "Usuario asignado a la tarea");
});

// =============================================================================
// GET TASK USERS — GET /api/tasks/:taskId/users
// Requiere: TASKS_READ_ALL
//
// Devuelve el usuario actualmente asignado a una tarea.
// Si la tarea no tiene userId, responde con un array vacío (200, no 404).
// =============================================================================
export const getTaskUsers = catchAsync(async (req, res) => {
    const [task] = await pool.query(
        'SELECT userId FROM tasks WHERE id = ?', [req.params.taskId]
    );

    // Si la tarea no existe o no tiene usuario asignado, devolvemos vacío
    if (task.length === 0 || !task[0].userId) {
        return successResponse(res, 200, "La tarea no tiene usuarios asignados", []);
    }

    const [users] = await pool.query(
        'SELECT id, name, email FROM users WHERE id = ?', [task[0].userId]
    );
    return successResponse(res, 200, "Usuario de la tarea obtenido", users);
});

// =============================================================================
// REMOVE USER FROM TASK — DELETE /api/tasks/:taskId/users/:userId
// Requiere: TASKS_UPDATE_ALL
//
// Desvincula un usuario de una tarea poniendo userId = NULL.
// El WHERE doble (taskId Y userId) evita desasignar al usuario incorrecto.
// =============================================================================
export const removeUserFromTask = catchAsync(async (req, res) => {
    await pool.query(
        'UPDATE tasks SET userId = NULL WHERE id = ? AND userId = ?',
        [req.params.taskId, req.params.userId]
    );
    return successResponse(res, 200, "Usuario removido de la tarea");
});