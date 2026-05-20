/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  roles.controller.js — GESTIÓN DE ROLES Y SUS PERMISOS              ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  getRoles               → Lista todos los roles con sus permisos    ║
 * ║  getPermissions         → Lista todos los permisos disponibles      ║
 * ║  createRole             → Crea un nuevo rol                         ║
 * ║  deleteRole             → Elimina un rol (no los del sistema)       ║
 * ║  updateRolePermissions  → Reemplaza los permisos de un rol          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool from '../config/db.js';
import { catchAsync }      from '../utils/catchAsync.js';
import { successResponse } from '../utils/response.handler.js';

// =============================================================================
// DELETE ROLE — DELETE /api/roles/:id
// Requiere: SYSTEM_MANAGE_ALL (solo SuperAdmin)
//
// Elimina un rol del sistema. Los roles del sistema (id 1-4) están protegidos.
// Si el rol tiene usuarios asignados, se desvincula automáticamente antes de borrar.
// =============================================================================
export const deleteRole = catchAsync(async (req, res) => {
    const roleId = Number(req.params.id);

    // Protección de roles del sistema (SuperAdmin, Profesor, Estudiante, Auditor)
    if ([1, 2, 3, 4].includes(roleId)) {
        const error = new Error('Los roles del sistema no pueden eliminarse.');
        error.statusCode = 403; error.isOperational = true; throw error;
    }

    const [role] = await pool.query('SELECT id, name FROM roles WHERE id = ?', [roleId]);
    if (role.length === 0) {
        const error = new Error('Rol no encontrado.');
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    // Desvincular usuarios que tengan este rol antes de eliminar
    await pool.query('DELETE FROM user_roles WHERE role_id = ?', [roleId]);

    // Eliminar permisos asociados al rol
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    // Eliminar el rol
    await pool.query('DELETE FROM roles WHERE id = ?', [roleId]);

    return successResponse(res, 200, `Rol "${role[0].name}" eliminado correctamente`);
});
// Requiere: verifyToken (cualquier usuario autenticado)
//
// Devuelve todos los roles con sus permisos asociados.
// Usado por el frontend para llenar los checkboxes de asignación de roles
// y para la gestión de roles del admin.
// =============================================================================
export const getRoles = catchAsync(async (req, res) => {
    const [roles] = await pool.query('SELECT id, name, description FROM roles ORDER BY id ASC');

    // Para cada rol traemos sus permisos
    const rolesWithPermissions = await Promise.all(roles.map(async role => {
        const [perms] = await pool.query(`
            SELECT p.id, p.name, p.description
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
            ORDER BY p.id ASC
        `, [role.id]);
        return { ...role, permissions: perms };
    }));

    return successResponse(res, 200, 'Roles obtenidos correctamente', rolesWithPermissions);
});

// =============================================================================
// GET PERMISSIONS — GET /api/roles/permissions
// Requiere: verifyToken
//
// Lista todos los permisos disponibles en el sistema.
// Usado por el frontend para los checkboxes al crear o editar un rol.
// =============================================================================
export const getPermissions = catchAsync(async (req, res) => {
    const [rows] = await pool.query(
        'SELECT id, name, description FROM permissions ORDER BY id ASC'
    );
    return successResponse(res, 200, 'Permisos obtenidos correctamente', rows);
});

// =============================================================================
// CREATE ROLE — POST /api/roles
// Requiere: SYSTEM_MANAGE_ALL (solo SuperAdmin)
//
// Crea un rol nuevo con nombre y descripción opcionales.
// Si se envían permission_ids, los asigna al rol recién creado.
// =============================================================================
export const createRole = catchAsync(async (req, res) => {
    const { name, description, permission_ids } = req.body;

    if (!name || !name.trim()) {
        const error = new Error('El nombre del rol es obligatorio.');
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Verificamos que no exista un rol con el mismo nombre
    const [existing] = await pool.query(
        'SELECT id FROM roles WHERE name = ?', [name.trim()]
    );
    if (existing.length > 0) {
        const error = new Error('Ya existe un rol con ese nombre.');
        error.statusCode = 409; error.isOperational = true; throw error;
    }

    const [result] = await pool.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name.trim(), description?.trim() || null]
    );

    const newRoleId = result.insertId;

    // Si se enviaron permisos, los asignamos al nuevo rol
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
        await Promise.all(permission_ids.map(pid =>
            pool.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                [newRoleId, pid]
            )
        ));
    }

    return successResponse(res, 201, 'Rol creado correctamente', { id: newRoleId });
});

// =============================================================================
// UPDATE ROLE PERMISSIONS — PUT /api/roles/:id/permissions
// Requiere: SYSTEM_MANAGE_ALL (solo SuperAdmin)
//
// Reemplaza TODOS los permisos de un rol por el array enviado.
// Si se envía un array vacío, el rol queda sin permisos.
// No permite modificar los permisos del rol SuperAdmin (id=1)
// para evitar bloquear el sistema por accidente.
// =============================================================================
export const updateRolePermissions = catchAsync(async (req, res) => {
    const roleId = req.params.id;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
        const error = new Error('permission_ids debe ser un array.');
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Protección del SuperAdmin: sus permisos no se pueden modificar
    if (Number(roleId) === 1) {
        const error = new Error('Los permisos del SuperAdmin no pueden modificarse.');
        error.statusCode = 403; error.isOperational = true; throw error;
    }

    const [role] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (role.length === 0) {
        const error = new Error('Rol no encontrado.');
        error.statusCode = 404; error.isOperational = true; throw error;
    }

    // Borramos todos los permisos actuales del rol y reinsertamos los nuevos
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    if (permission_ids.length > 0) {
        await Promise.all(permission_ids.map(pid =>
            pool.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                [roleId, pid]
            )
        ));
    }

    return successResponse(res, 200, 'Permisos del rol actualizados correctamente');
});