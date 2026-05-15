/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  auth.middleware.js — GUARDIAS DE AUTENTICACIÓN Y AUTORIZACIÓN      ║
 * ║                                                                      ║
 * ║  Contiene los dos middleware que protegen todas las rutas privadas  ║
 * ║  de la API bajo el modelo de seguridad JWT + RBAC.                  ║
 * ║                                                                      ║
 * ║  FLUJO DE SEGURIDAD EN CADA PETICIÓN PRIVADA:                       ║
 * ║                                                                      ║
 * ║  Cliente                                                             ║
 * ║    │  Authorization: Bearer <accessToken>                           ║
 * ║    ▼                                                                 ║
 * ║  verifyToken()                                                       ║
 * ║    ├── ¿Falta el header?    → 401 Token no proporcionado            ║
 * ║    ├── ¿Firma inválida?     → 401 Firma inválida                    ║
 * ║    ├── ¿Token expirado?     → 401 Token expirado                    ║
 * ║    └── ✅ Válido            → adjunta decoded a req.user → next()   ║
 * ║    ▼                                                                 ║
 * ║  checkPermission('permiso.requerido')                                ║
 * ║    ├── ¿req.user no tiene permissions[]? → 403 Sesión inválida      ║
 * ║    ├── ¿No está el permiso en el array?  → 403 Acceso denegado      ║
 * ║    └── ✅ Tiene el permiso  → next() → llega al controlador         ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  verifyToken       → Middleware simple: valida el JWT de la petición║
 * ║  checkPermission   → Middleware factory: recibe un permiso requerido║
 * ║                       y devuelve un middleware que lo evalúa        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import jwt from 'jsonwebtoken';
import 'dotenv/config';

// =============================================================================
// VERIFY TOKEN — Middleware de autenticación
//
// Lee el JWT del header Authorization (formato: "Bearer <token>"),
// lo verifica con la clave secreta del servidor y adjunta el payload
// decodificado a req.user para que los middlewares y controladores
// siguientes puedan acceder a los datos del usuario en sesión.
//
// USO EN RUTAS:
//   router.get('/ruta', verifyToken, miControlador);
// =============================================================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Verificamos que el header exista y tenga el formato "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            ok: false,
            msn: "Acceso denegado. Token no proporcionado o formato inválido."
        });
    }

    // Extraemos el token eliminando el prefijo "Bearer "
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify lanza error si la firma es inválida o el token expiró
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Adjuntamos el payload decodificado para los middlewares siguientes
        // req.user contiene: { id, role, role_id, permissions: [...] }
        req.user = decoded;
        next();
    } catch (error) {
        // Distinguimos expiración de firma corrupta para mensajes más precisos
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                ok: false,
                msn: "Acceso denegado. El token ha expirado."
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                ok: false,
                msn: "Acceso denegado. Firma de token inválida."
            });
        }
        return res.status(500).json({
            ok: false,
            msn: "Error interno verificando el token."
        });
    }
};

// =============================================================================
// CHECK PERMISSION — Middleware factory de autorización (RBAC)
//
// Recibe el permiso exacto requerido para acceder a una ruta y devuelve
// un middleware que verifica si el usuario en sesión lo posee.
//
// Los permisos del usuario están embebidos en el JWT como un array de
// strings (ej: ['users.read.all', 'tasks.create.multiple']).
// Al hacer login, el servidor los consulta desde role_permissions y los
// firma dentro del token, evitando queries a la BD en cada petición.
//
// USO EN RUTAS:
//   router.delete('/:id', verifyToken, checkPermission(PERMISSIONS.SYSTEM_MANAGE_ALL), deleteUser);
//
// IMPORTANTE: siempre debe ir DESPUÉS de verifyToken, ya que depende
// de que req.user esté disponible.
// =============================================================================
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // 1. Validamos que el payload del JWT contenga un array de permisos válido
        //    (podría no existir si el token fue generado con una versión antigua)
        if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
            return res.status(403).json({
                ok: false,
                msn: "Acceso denegado. La sesión no contiene permisos atómicos válidos."
            });
        }

        // 2. Comprobamos si el permiso requerido está en el array del usuario
        const hasPermission = req.user.permissions.includes(requiredPermission);

        if (!hasPermission) {
            return res.status(403).json({
                ok: false,
                // Incluimos el permiso faltante para facilitar el debugging
                msn: `Acceso denegado. Se requiere el permiso: [${requiredPermission}]`
            });
        }

        // 3. El usuario tiene el permiso → puede continuar al controlador
        next();
    };
};

export { verifyToken, checkPermission };