/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  security.js — UTILIDADES CRIPTOGRÁFICAS Y DE TOKENS                ║
 * ║                                                                      ║
 * ║  Centraliza todas las operaciones sensibles de seguridad:           ║
 * ║  hashing de contraseñas y generación/rotación de tokens JWT.        ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  hashPassword(password)                                              ║
 * ║    → Genera un salt con 10 rondas de bcrypt y hashea la contraseña. ║
 * ║    → El salt es único por hash: misma contraseña → hashes distintos.║
 * ║                                                                      ║
 * ║  comparePassword(password, hashedPassword)                          ║
 * ║    → Compara una contraseña en texto plano contra su hash bcrypt.   ║
 * ║    → Devuelve true/false sin exponer el hash.                       ║
 * ║                                                                      ║
 * ║  generateTokens(user)                                                ║
 * ║    → Genera un par de tokens JWT:                                   ║
 * ║       accessToken:  vida corta (JWT_EXPIRES_IN, default 15m)        ║
 * ║       refreshToken: vida larga (JWT_REFRESH_EXPIRES_IN, default 7d) ║
 * ║    → El payload incluye: id, role, role_id y permissions[]          ║
 * ║                                                                      ║
 * ║  PAYLOAD DEL JWT:                                                    ║
 * ║  {                                                                   ║
 * ║    id:          número   (ID del usuario en la BD)                  ║
 * ║    role:        string   (nombre del rol: 'SuperAdmin', 'Profesor'…) ║
 * ║    role_id:     número   (ID del rol en la BD)                       ║
 * ║    permissions: string[] (permisos atómicos del rol)                 ║
 * ║  }                                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import 'dotenv/config';

// =============================================================================
// HASH PASSWORD
// Genera el hash bcrypt de una contraseña en texto plano.
// 10 rondas de salt: balance seguro entre tiempo de cómputo y seguridad.
// (12+ rondas es más seguro pero más lento; 10 es el estándar de producción.)
// =============================================================================
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// =============================================================================
// COMPARE PASSWORD
// Verifica si una contraseña en texto plano corresponde a su hash bcrypt.
// Devuelve true si coinciden, false si no. Nunca lanza error por no-match.
// =============================================================================
export const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// =============================================================================
// GENERATE TOKENS
// Crea el par accessToken + refreshToken con el payload del usuario.
//
// SEPARACIÓN DE CLAVES SECRETAS:
// Usamos JWT_SECRET para el accessToken y JWT_REFRESH_SECRET para el refresh.
// Esto garantiza que un refresh token comprometido no pueda usarse para
// falsificar un accessToken, y viceversa.
//
// PAYLOAD INCLUIDO:
// Embebemos los permisos atómicos para que checkPermission() no necesite
// consultar la BD en cada petición. Los permisos solo cambian si el admin
// modifica el rol del usuario (en cuyo caso deberá volver a iniciar sesión).
// =============================================================================
export const generateTokens = (user) => {
    const payload = {
        id:          user.id,
        role:        user.role_name || user.role, // compatibilidad con ambos formatos
        role_id:     user.role_id,
        permissions: user.permissions || []        // array de permisos atómicos del rol
    };

    // Token de acceso: vida corta, se renueva con el refreshToken
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    // Token de refresco: vida larga, solo se usa en POST /api/auth/refresh
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    return { accessToken, refreshToken };
};