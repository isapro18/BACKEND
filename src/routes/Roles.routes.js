import express from 'express';
import {
    getRoles,
    getPermissions,
    createRole,
    updateRolePermissions,
    deleteRole,
} from '../controllers/Roles.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';

const rolesRouter = express.Router();

// Listar todos los roles con sus permisos — cualquier usuario autenticado
rolesRouter.get('/', verifyToken, getRoles);

// Listar todos los permisos disponibles — cualquier usuario autenticado
// ⚠️ Debe ir ANTES de /:id para que Express no lea 'permissions' como un ID
rolesRouter.get('/permissions', verifyToken, getPermissions);

// Crear un nuevo rol — solo SuperAdmin
rolesRouter.post('/',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    createRole
);

// Eliminar un rol — solo SuperAdmin (los roles del sistema id 1-4 están protegidos)
rolesRouter.delete('/:id',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    deleteRole
);

// Reemplazar permisos de un rol — solo SuperAdmin
rolesRouter.put('/:id/permissions',
    verifyToken,
    checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL),
    updateRolePermissions
);

export default rolesRouter;