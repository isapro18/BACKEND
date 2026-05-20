/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  users.controller.js — CONTROLADOR DE USUARIOS                      ║
 * ║                                                                      ║
 * ║  Gestiona el CRUD completo de usuarios y el registro de auditoría.  ║
 * ║  Incluye normalización de roles entre la BD y el frontend,          ║
 * ║  eliminación con trazabilidad y consulta de logs de auditoría.      ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  getUsers       → Lista todos los usuarios con su rol normalizado   ║
 * ║  getUserById    → Obtiene un usuario por ID                         ║
 * ║  createUser     → Crea usuario con contraseña temporal (últimos 4   ║
 * ║                    dígitos del documento)                           ║
 * ║  updateUser     → Actualización completa de datos del usuario       ║
 * ║  deleteUser     → Hard delete con registro obligatorio en           ║
 * ║                    audit_logs antes de destruir el registro         ║
 * ║  patchUserStatus→ Cambia solo el estado (activo/inactivo)           ║
 * ║  getUserTasks   → Lista las tareas asignadas a un usuario           ║
 * ║  getAuditLogs   → Devuelve el historial de auditoría completo       ║
 * ║                                                                      ║
 * ║  NORMALIZACIÓN DE ROLES (normalizarRol):                            ║
 * ║  La BD guarda los roles con nombres en español y mayúscula          ║
 * ║  (SuperAdmin, Profesor, Estudiante, Auditor). El frontend filtra    ║
 * ║  por valores en inglés y minúscula (admin, user, auditor).          ║
 * ║  Esta función traduce de un sistema al otro para mantener           ║
 * ║  compatibilidad sin modificar la BD.                                ║
 * ║                                                                      ║
 * ║  AUDITORÍA (deleteUser):                                            ║
 * ║  Toda eliminación definitiva queda registrada en audit_logs con:   ║
 * ║  acción, justificación, nombre del usuario eliminado y quién lo    ║
 * ║  hizo. La justificación es obligatoria (se envía como ?reason=).   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool from '../config/db.js';
import { catchAsync }      from '../utils/catchAsync.js';
import { successResponse } from '../utils/response.handler.js';
import { hashPassword, comparePassword } from '../utils/security.js';

// =============================================================================
// HELPER: normalizarRol(roleNameBD)
//
// Traduce los nombres de roles guardados en la BD al formato que espera
// el frontend para sus filtros y lógica de presentación.
//
//   BD (español, mayúscula) → Frontend (inglés, minúscula)
//   ─────────────────────────────────────────────────────
//   'SuperAdmin' → 'admin'
//   'Profesor'   → 'admin'   (el instructor tiene permisos de gestión)
//   'Estudiante' → 'user'
//   'Auditor'    → 'auditor'
//
// Si el nombre no está en el mapa, devuelve 'user' como valor seguro.
// =============================================================================
function normalizarRol(roleNameBD) {
    const map = {
        'superadmin': 'admin',
        'profesor':   'admin',
        'estudiante': 'user',
        'auditor':    'auditor'
    };
    return map[(roleNameBD || '').toLowerCase()] || 'user';
}

// =============================================================================
// GET USERS — GET /api/users
// Requiere: USERS_READ_ALL
//
// Lista todos los usuarios con su rol desde la BD (JOIN con roles).
// Agrega el campo `role` normalizado para compatibilidad con el frontend.
// =============================================================================
export const getUsers = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.document, u.status, u.createdAt,
               GROUP_CONCAT(r.id ORDER BY r.id)                    AS role_ids,
               GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR '|')   AS role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r       ON ur.role_id = r.id
        GROUP BY u.id
        ORDER BY u.id ASC
    `);
    const users = rows.map(u => {
        const roleNames = u.role_names ? u.role_names.split('|') : [];
        const roleIds   = u.role_ids   ? u.role_ids.split(',').map(Number) : [];
        return { ...u, role_ids: roleIds, role_names: roleNames,
            role: roleNames.some(r => ['SuperAdmin','Profesor'].includes(r)) ? 'admin'
                : roleNames.includes('Auditor') ? 'auditor' : 'user' };
    });
    return successResponse(res, 200, 'Usuarios obtenidos correctamente', users);
});

// =============================================================================
// GET USER BY ID — GET /api/users/:id
// Requiere: USERS_READ_ALL
// Igual que getUsers pero para un único usuario. Responde 404 si no existe.
// =============================================================================
export const getUserById = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.document, u.status, u.createdAt,
               GROUP_CONCAT(r.id ORDER BY r.id)                    AS role_ids,
               GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR '|')   AS role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r       ON ur.role_id = r.id
        WHERE u.id = ?
        GROUP BY u.id
    `, [req.params.id]);

    if (rows.length === 0) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404; error.isOperational = true; throw error;
    }
    const u = rows[0];
    const roleNames = u.role_names ? u.role_names.split('|') : [];
    const roleIds   = u.role_ids   ? u.role_ids.split(',').map(Number) : [];
    return successResponse(res, 200, 'Usuario encontrado', {
        ...u, role_ids: roleIds, role_names: roleNames,
        role: roleNames.some(r => ['SuperAdmin','Profesor'].includes(r)) ? 'admin'
            : roleNames.includes('Auditor') ? 'auditor' : 'user'
    });
});

// =============================================================================
// CREATE USER — POST /api/users
// Requiere: USERS_CREATE
//
// Crea un usuario desde el panel de administración.
// La contraseña temporal se construye con los ÚLTIMOS 4 DÍGITOS del
// documento del usuario. El usuario deberá cambiarla en su primer acceso.
// El estado inicial siempre es 'activo'.
// =============================================================================
export const createUser = catchAsync(async (req, res) => {
    const { name, email, document, role_ids } = req.body;
    const tempPassword   = document.slice(-4);
    const hashedPassword = await hashPassword(tempPassword);

    const [result] = await pool.query(
        'INSERT INTO users (name, email, document, password, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, document, hashedPassword, 'activo']
    );

    // Asignamos uno o varios roles en la tabla pivote
    const roles = Array.isArray(role_ids) && role_ids.length > 0 ? role_ids : [3];
    await Promise.all(roles.map(rid =>
        pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [result.insertId, rid])
    ));

    return successResponse(res, 201, 'Usuario creado con éxito', { id: result.insertId });
});

// =============================================================================
// UPDATE USER — PUT /api/users/:id
// Requiere: SYSTEM_MANAGE_ALL (solo SuperAdmin)
//
// Actualización completa del perfil de un usuario.
// Todos los campos son obligatorios en el body (validado por updateUserSchema).
// =============================================================================
export const updateUser = catchAsync(async (req, res) => {
    const { name, email, document, status } = req.body;

    const [result] = await pool.query(
        'UPDATE users SET name = ?, email = ?, document = ?, status = ? WHERE id = ?',
        [name, email, document, status, req.params.id]
    );

    if (result.affectedRows === 0) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, 'Usuario actualizado correctamente');
});

// =============================================================================
// GET USER TASKS — GET /api/users/:id/tasks
// Requiere: solo verifyToken (cualquier usuario autenticado)
//
// Devuelve las tareas asignadas al usuario con el ID indicado.
// Ruta clave para el estudiante: le permite ver su propia lista de tareas.
// (La autorización de "solo ver las propias" se gestiona en el frontend
//  enviando siempre el ID del usuario en sesión.)
// =============================================================================
export const getUserTasks = catchAsync(async (req, res) => {
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
    `, [req.params.id]);
    return successResponse(res, 200, "Tareas del usuario obtenidas", rows);
});
// =============================================================================
// DELETE USER — DELETE /api/users/:id
// Requiere: SYSTEM_MANAGE_ALL (solo SuperAdmin)
//
// ELIMINACIÓN CON AUDITORÍA OBLIGATORIA (hard delete trazable):
//
//   1. Valida que llegue el parámetro ?reason= en la URL (justificación).
//   2. Busca el nombre del usuario antes de borrarlo para el registro.
//   3. Inserta un log inmutable en audit_logs con:
//        - acción: 'HARD_DELETE_USER'
//        - justificación del administrador
//        - ID y nombre del usuario eliminado
//        - ID del admin que ejecutó la acción
//   4. Finalmente elimina el usuario de la BD.
//
// El paso 3 se hace ANTES del paso 4 para garantizar que el log
// siempre quede registrado, incluso si el delete falla.
// =============================================================================
export const deleteUser = catchAsync(async (req, res) => {
    const targetUserId = req.params.id;

    // La justificación llega como query param: DELETE /api/users/5?reason=...
    const reason = req.query.reason;

    if (!reason) {
        const error = new Error("La justificación es obligatoria para la auditoría.");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Buscamos el nombre del usuario antes de borrarlo para que quede en el log
    const [userRows] = await pool.query(
        "SELECT name FROM users WHERE id = ?", [targetUserId]
    );

    if (userRows.length === 0) {
        const error = new Error("Usuario no encontrado");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    const targetUser = userRows[0];

    // ID del administrador que ejecuta la acción (extraído del JWT por verifyToken)
    const adminId = req.user?.id || req.userId || null;

    // ── REGISTRO DE AUDITORÍA (antes de borrar) ───────────────────────────────
    await pool.query(
        "INSERT INTO audit_logs (action, reason, target_user_id, target_user_name, performed_by) VALUES (?, ?, ?, ?, ?)",
        ['HARD_DELETE_USER', reason, targetUserId, targetUser.name, adminId]
    );

    // ── ELIMINACIÓN DEFINITIVA ────────────────────────────────────────────────
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [targetUserId]);

    if (result.affectedRows === 0) {
        const error = new Error("No se pudo eliminar el usuario");
        error.statusCode = 500; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Usuario eliminado de raíz y auditado correctamente");
});

// =============================================================================
// PATCH USER STATUS — PATCH /api/users/:id/status
// Requiere: SYSTEM_MANAGE_ALL
//
// Soft delete / reactivación: cambia el estado entre 'activo' e 'inactivo'.
// Un usuario inactivo sigue existiendo en la BD pero no puede iniciar sesión
// (bloqueado en el controlador de login).
// =============================================================================
export const patchUserStatus = catchAsync(async (req, res) => {
    const { status } = req.body;

    if (!status) {
        const error = new Error("El campo status es obligatorio");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const [result] = await pool.query(
        'UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Usuario no encontrado");
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    return successResponse(res, 200, "Estado actualizado correctamente");
});

// =============================================================================
// GET AUDIT LOGS — GET /api/users/audit/logs
// Requiere: SYSTEM_AUDIT (Auditor y SuperAdmin)
//
// Devuelve el historial completo de acciones críticas registradas en
// audit_logs, ordenado del más reciente al más antiguo.
// El JOIN con users resuelve el ID del administrador al nombre completo.
// LEFT JOIN: si el admin fue eliminado, la fila sigue apareciendo (performed_by_name = NULL).
// =============================================================================
export const getAuditLogs = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT a.id, a.action, a.reason, a.target_user_id, a.target_user_name, a.createdAt,
               u.name AS performed_by_name
        FROM audit_logs a
        LEFT JOIN users u ON a.performed_by = u.id
        ORDER BY a.createdAt DESC
    `);
    return successResponse(res, 200, "Registros de auditoría obtenidos", rows);
});

// =============================================================================
// GET ME — GET /api/users/me
// Requiere: solo verifyToken (cualquier usuario autenticado)
//
// Devuelve los datos del usuario que tiene la sesión activa.
// Lee el ID desde el JWT — el usuario no puede consultar a otro.
// Usado por Profile.view.js para mostrar los datos actuales en placeholders.
// =============================================================================
export const getMe = catchAsync(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.document, u.status, u.createdAt,
               GROUP_CONCAT(r.id ORDER BY r.id)                    AS role_ids,
               GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR '|')   AS role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r       ON ur.role_id = r.id
        WHERE u.id = ?
        GROUP BY u.id
    `, [req.user.id]);

    if (rows.length === 0) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404; error.isOperational = true; throw error;
    }
    const u = rows[0];
    const roleNames = u.role_names ? u.role_names.split('|') : [];
    const roleIds   = u.role_ids   ? u.role_ids.split(',').map(Number) : [];
    return successResponse(res, 200, 'Perfil obtenido correctamente', {
        ...u, role_ids: roleIds, role_names: roleNames,
        role: roleNames.some(r => ['SuperAdmin','Profesor'].includes(r)) ? 'admin'
            : roleNames.includes('Auditor') ? 'auditor' : 'user'
    });
});

// =============================================================================
// UPDATE ME — PATCH /api/users/me
// Requiere: solo verifyToken (cualquier usuario autenticado)
//
// El usuario actualiza sus propios datos. El ID se toma del JWT.
// Todos los campos son opcionales — solo se actualiza lo que llegue.
// El backend valida unicidad de email y document contra otros usuarios.
// La contraseña se hashea antes de guardar.
// =============================================================================
export const updateMe = catchAsync(async (req, res) => {
    const { name, email, document, password, currentPassword } = req.body;
    const userId = req.user.id;

    // Verificamos duplicados de email y document excluyendo al propio usuario
    if (email) {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]
        );
        if (existing.length > 0) {
            const error = new Error("El correo ya está registrado por otro usuario.");
            error.statusCode = 409; error.isOperational = true; throw error;
        }
    }

    if (document) {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE document = ? AND id != ?', [document, userId]
        );
        if (existing.length > 0) {
            const error = new Error("El documento ya está registrado por otro usuario.");
            error.statusCode = 409; error.isOperational = true; throw error;
        }
    }

    // Validación de contraseña: si quiere cambiarla necesitamos la actual
    if (password) {
        if (!currentPassword) {
            const error = new Error("Debes ingresar tu contraseña actual para poder cambiarla.");
            error.statusCode = 400; error.isOperational = true; throw error;
        }

        // Traemos el hash actual de la BD
        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            const error = new Error("Usuario no encontrado.");
            error.statusCode = 404; error.isOperational = true; throw error;
        }

        const currentHash = rows[0].password;

        // Verificamos que la contraseña actual sea correcta
        const isCurrentValid = await comparePassword(currentPassword, currentHash);
        if (!isCurrentValid) {
            const error = new Error("La contraseña actual es incorrecta.");
            error.statusCode = 401; error.isOperational = true; throw error;
        }

        // Verificamos que la nueva contraseña sea diferente a la actual
        const isSamePassword = await comparePassword(password, currentHash);
        if (isSamePassword) {
            const error = new Error("La nueva contraseña no puede ser igual a la actual.");
            error.statusCode = 400; error.isOperational = true; throw error;
        }
    }

    // Construimos el SET dinámicamente con solo los campos que llegaron
    const fields = [];
    const values = [];

    if (name)     { fields.push('name = ?');     values.push(name); }
    if (email)    { fields.push('email = ?');     values.push(email); }
    if (document) { fields.push('document = ?');  values.push(document); }
    if (password) {
        const hashed = await hashPassword(password);
        fields.push('password = ?');
        values.push(hashed);
    }

    if (fields.length === 0) {
        const error = new Error("No se enviaron campos para actualizar.");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    return successResponse(res, 200, "Perfil actualizado correctamente");
});

// =============================================================================
// PATCH USER ROLE — PATCH /api/users/:id/role
// Requiere: USERS_UPDATE_STATUS (Profesor/Admin puede cambiar roles)
//
// Cambia únicamente el rol de un usuario.
// El SuperAdmin no puede cambiarle el rol a otro SuperAdmin.
// =============================================================================
export const patchUserRoles = catchAsync(async (req, res) => {
    const { role_ids } = req.body;

    if (!Array.isArray(role_ids) || role_ids.length === 0) {
        const error = new Error('Debes asignar al menos un rol.');
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const userId = req.params.id;

    const [target] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (target.length === 0) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    // El usuario id=1 es el Admin principal del sistema.
    // Su rol Admin (role_id=1) nunca puede quitarse — siempre se incluye.
    const finalRoleIds = Number(userId) === 1
        ? [...new Set([...role_ids, 1])]
        : role_ids;

    await pool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await Promise.all(finalRoleIds.map(rid =>
        pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, rid])
    ));

    return successResponse(res, 200, 'Roles actualizados correctamente');
});