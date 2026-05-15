/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  permissions.js — CATÁLOGO DE PERMISOS ATÓMICOS DEL SISTEMA (RBAC) ║
 * ║                                                                      ║
 * ║  Define todos los permisos posibles del sistema bajo el modelo      ║
 * ║  RBAC (Role-Based Access Control — Control de Acceso por Roles).   ║
 * ║                                                                      ║
 * ║  ¿CÓMO FUNCIONA EL RBAC EN ESTA APP?                               ║
 * ║  1. Cada permiso es una cadena de texto única (ej: 'users.create') ║
 * ║  2. En la BD, la tabla role_permissions asocia roles ↔ permisos    ║
 * ║  3. Al hacer login, el servidor consulta los permisos del rol       ║
 * ║     del usuario y los embebe dentro del JWT como un array           ║
 * ║  4. En cada ruta protegida, el middleware checkPermission()         ║
 * ║     verifica que el JWT contenga el permiso requerido              ║
 * ║                                                                      ║
 * ║  JERARQUÍA DE ROLES Y SUS PERMISOS:                                 ║
 * ║                                                                      ║
 * ║  SuperAdmin (rol 1) ─── SYSTEM_MANAGE_ALL + todos los demás        ║
 * ║    │  Puede hacer absolutamente todo en el sistema.                 ║
 * ║    │                                                                 ║
 * ║  Instructor (rol 2) ─── TASKS_CREATE_MULTIPLE + TASKS_READ_ALL     ║
 * ║    │                  + TASKS_UPDATE_ALL + TASKS_DELETE_ALL         ║
 * ║    │  Gestiona tareas: crea, asigna, aprueba y rechaza.            ║
 * ║    │                                                                 ║
 * ║  Auditor (rol 3) ───── SYSTEM_AUDIT + USERS_READ_ALL               ║
 * ║    │                 + TASKS_READ_ALL                               ║
 * ║    │  Solo lectura: revisa usuarios, tareas y logs de auditoría.   ║
 * ║    │                                                                 ║
 * ║  Estudiante (rol 4) ── TASKS_READ_OWN + TASKS_UPDATE_STATUS_OWN   ║
 * ║       Puede ver sus propias tareas y actualizar su progreso.        ║
 * ║                                                                      ║
 * ║  USO EN RUTAS (ejemplo):                                            ║
 * ║    import { PERMISSIONS } from '../constants/permissions.js';       ║
 * ║    router.delete('/:id', verifyToken,                               ║
 * ║        checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL), deleteUser); ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export const PERMISSIONS = {

    // ── SISTEMA ───────────────────────────────────────────────────────────────
    // Permisos de máximo nivel. Solo el SuperAdmin los posee.

    // Permiso maestro: acceso total al sistema (gestión de usuarios y roles)
    SYSTEM_MANAGE_ALL: 'system.manage.all',

    // Permite leer logs de auditoría y exportar reportes (solo Auditor y SuperAdmin)
    SYSTEM_AUDIT: 'system.audit',

    // ── USUARIOS ──────────────────────────────────────────────────────────────
    // Permisos sobre el CRUD de la tabla users.

    // Crear nuevos usuarios desde el panel de administración
    USERS_CREATE: 'users.create',

    // Listar y ver el detalle de cualquier usuario del sistema
    USERS_READ_ALL: 'users.read.all',

    // Cambiar el estado de un usuario (activo ↔ inactivo) — soft delete
    USERS_UPDATE_STATUS: 'users.update.status',

    // Eliminar de raíz un usuario de la BD — hard delete con auditoría obligatoria
    USERS_DELETE_ALL: 'users.delete.all',

    // ── TAREAS GLOBALES ───────────────────────────────────────────────────────
    // Permisos para gestionar tareas de cualquier usuario del sistema.

    // Crear tareas y asignarlas a uno o varios estudiantes a la vez
    TASKS_CREATE_MULTIPLE: 'tasks.create.multiple',

    // Ver todas las tareas del sistema sin importar a quién pertenecen
    TASKS_READ_ALL: 'tasks.read.all',

    // Editar título, descripción y estado de cualquier tarea (aprobar/rechazar)
    TASKS_UPDATE_ALL: 'tasks.update.all',

    // Eliminar cualquier tarea del sistema
    TASKS_DELETE_ALL: 'tasks.delete.all',

    // ── TAREAS PROPIAS ────────────────────────────────────────────────────────
    // Permisos restringidos: el estudiante solo opera sobre sus propias tareas.

    // Ver únicamente las tareas asignadas al propio usuario
    TASKS_READ_OWN: 'tasks.read.own',

    // Actualizar el estado de la propia tarea (ej: pendiente → en progreso)
    TASKS_UPDATE_STATUS_OWN: 'tasks.update.status.own'
};