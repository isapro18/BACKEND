/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  auth.controller.js — CONTROLADOR DE AUTENTICACIÓN                  ║
 * ║                                                                      ║
 * ║  Maneja todo el ciclo de identidad del usuario:                     ║
 * ║  registro, inicio de sesión, renovación de token y el flujo         ║
 * ║  completo de recuperación de contraseña por OTP.                    ║
 * ║                                                                      ║
 * ║  FUNCIONES EXPORTADAS:                                               ║
 * ║                                                                      ║
 * ║  register        → Crea un nuevo usuario en la BD.                 ║
 * ║                    El PRIMER usuario registrado se convierte        ║
 * ║                    automáticamente en SuperAdmin (rol 1).           ║
 * ║                                                                      ║
 * ║  login           → Valida credenciales, consulta permisos del rol  ║
 * ║                    y devuelve accessToken + refreshToken.           ║
 * ║                                                                      ║
 * ║  renewToken      → Verifica el refreshToken y emite un par de      ║
 * ║                    tokens nuevos (rotación de tokens).              ║
 * ║                                                                      ║
 * ║  forgotPassword  → Genera un OTP de 6 dígitos, lo guarda en la    ║
 * ║                    BD con expiración de 30 min y lo envía al       ║
 * ║                    correo del usuario.                              ║
 * ║                                                                      ║
 * ║  verifyOTP       → Compara el OTP ingresado contra el guardado     ║
 * ║                    en la BD y verifica que no haya expirado.        ║
 * ║                                                                      ║
 * ║  resetPassword   → Valida OTP de nuevo (doble check), verifica     ║
 * ║                    que la nueva contraseña sea diferente a la       ║
 * ║                    actual, la hashea y limpia el OTP de la BD.     ║
 * ║                                                                      ║
 * ║  FLUJO DE RECUPERACIÓN DE CONTRASEÑA:                               ║
 * ║                                                                      ║
 * ║  POST /forgot-password                                              ║
 * ║    │  → Genera OTP → guarda en BD → envía email                   ║
 * ║    ▼                                                                 ║
 * ║  POST /verify-otp                                                   ║
 * ║    │  → Compara OTP → verifica expiración                          ║
 * ║    ▼                                                                 ║
 * ║  POST /reset-password                                               ║
 * ║       → Re-valida OTP → verifica contraseña diferente              ║
 * ║       → hashea → guarda → limpia OTP                               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool          from '../config/db.js';
import { catchAsync }       from '../utils/catchAsync.js';
import { successResponse }  from '../utils/response.handler.js';
import { hashPassword, comparePassword, generateTokens } from '../utils/security.js';
import { sendOTPEmail }     from '../utils/email.js';
import jwt from 'jsonwebtoken';

// =============================================================================
// REGISTER — POST /api/auth/register
//
// Crea un nuevo usuario en la base de datos.
// CASO ESPECIAL: si la tabla users está vacía, el primero que se registre
// recibe automáticamente el rol SuperAdmin (role_id = 1), sin importar
// el role_id que haya enviado. Esto garantiza que siempre haya al menos
// un administrador al iniciar el sistema desde cero.
// =============================================================================
export const register = catchAsync(async (req, res) => {
    const { name, email, document, password, role_id } = req.body;

    // Validación básica de campos obligatorios
    if (!name || !email || !document || !password) {
        const error = new Error("Todos los campos son obligatorios");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Verificamos unicidad de documento y correo antes de insertar
    const [existing] = await pool.query(
        'SELECT id FROM users WHERE document = ? OR email = ?', [document, email]
    );
    if (existing.length > 0) {
        const error = new Error("El documento o correo ya están registrados en el sistema");
        error.statusCode = 409; error.isOperational = true; throw error;
    }

    // ── DETECTOR DEL PRIMER USUARIO ───────────────────────────────────────────
    // Contamos los usuarios existentes ANTES de insertar.
    // Si el total es 0, este es el primero → SuperAdmin automático.
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const isFirstUser = countResult[0].total === 0;

    // SuperAdmin (1) si es el primero; rol enviado o Estudiante (3) si no lo es
    const finalRoleId = isFirstUser ? 1 : (role_id || 3);

    // Hasheamos la contraseña antes de guardarla (bcrypt, 10 rondas de salt)
    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
        'INSERT INTO users (name, email, document, password, role_id) VALUES (?, ?, ?, ?, ?)',
        [name, email, document, hashedPassword, finalRoleId]
    );

    // Mensaje dinámico: le informamos al cliente si coronó como SuperAdmin
    const message = isFirstUser
        ? "¡Has sido registrado como el SuperAdministrador del sistema!"
        : "Usuario registrado exitosamente";

    return successResponse(res, 201, message, { userId: result.insertId });
});

// =============================================================================
// LOGIN — POST /api/auth/login
//
// Valida las credenciales del usuario y devuelve un par de tokens JWT:
//   - accessToken:  vida corta (15 min). Se usa en cada petición.
//   - refreshToken: vida larga (7 días). Solo se usa para renovar el access.
//
// El payload del JWT incluye id, rol, role_id y el ARRAY DE PERMISOS
// atómicos del rol. Esto permite que el middleware checkPermission()
// evalúe el acceso sin consultar la BD en cada petición.
// =============================================================================
export const login = catchAsync(async (req, res) => {
    const { document, password } = req.body;

    if (!document || !password) {
        const error = new Error("El documento y la contraseña son obligatorios");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Buscamos al usuario junto con el nombre de su rol en un solo JOIN
    const [users] = await pool.query(`
        SELECT u.*, r.name as role_name 
        FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.document = ?
    `, [document]);

    // Usamos el mismo mensaje genérico para usuario no encontrado e incorrecto
    // para no revelar si el documento existe o no (seguridad por enumeración)
    if (users.length === 0) {
        const error = new Error("Credenciales inválidas");
        error.statusCode = 401; error.isOperational = true; throw error;
    }

    const user = users[0];

    // Bloqueamos el acceso si el usuario fue desactivado por un admin
    if (user.status === 'inactivo') {
        const error = new Error("El usuario se encuentra inactivo. Contacte al administrador.");
        error.statusCode = 403; error.isOperational = true; throw error;
    }

    // Comparamos la contraseña enviada contra el hash guardado en la BD
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        const error = new Error("Credenciales inválidas");
        error.statusCode = 401; error.isOperational = true; throw error;
    }

    // ── CARGA DE PERMISOS ATÓMICOS ─────────────────────────────────────────
    // Consultamos la tabla pivote role_permissions para obtener los permisos
    // del rol del usuario. Se embeben en el JWT para evitar consultas
    // repetidas a la BD en cada petición protegida.
    const [permissionsData] = await pool.query(`
        SELECT p.name FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
    `, [user.role_id]);

    // Convertimos el array de objetos a un array plano de strings
    user.permissions = permissionsData.map(p => p.name);

    // Generamos el par de tokens con el payload completo
    const { accessToken, refreshToken } = generateTokens(user);

    return successResponse(res, 200, "Inicio de sesión exitoso", {
        user: {
            id: user.id, name: user.name,
            role: user.role_name, role_id: user.role_id,
            permissions: user.permissions
        },
        accessToken,
        refreshToken
    });
});

// =============================================================================
// RENEW TOKEN — POST /api/auth/refresh
//
// Implementa la ROTACIÓN DE TOKENS: el cliente envía su refreshToken
// (que no ha expirado) y recibe un par de tokens completamente nuevos.
// Esto limita la ventana de exposición del accessToken sin forzar al
// usuario a re-iniciar sesión cada 15 minutos.
// =============================================================================
export const renewToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        const error = new Error("Se requiere el Refresh Token");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    try {
        // Verificamos la firma y la expiración del refreshToken
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generamos tokens nuevos con los mismos datos del payload original
        const { accessToken, refreshToken: newRefreshToken } = generateTokens({
            id: decoded.id, role_name: decoded.role,
            role_id: decoded.role_id, permissions: decoded.permissions
        });

        return successResponse(res, 200, "Token renovado exitosamente", {
            accessToken, refreshToken: newRefreshToken
        });
    } catch (error) {
        // Distinguimos expiración de firma inválida para mensajes más claros
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ ok: false, msn: "Sesión expirada. Inicie sesión de nuevo." });
        }
        return res.status(401).json({ ok: false, msn: "Refresh token inválido." });
    }
});

// =============================================================================
// FORGOT PASSWORD — POST /api/auth/forgot-password
// PASO 1 DEL FLUJO DE RECUPERACIÓN
//
// Genera un OTP (One-Time Password) de 6 dígitos, lo guarda en la BD
// junto a su fecha de expiración (30 minutos desde ahora) y lo envía
// al correo del usuario vía Mailtrap.
//
// Nota de seguridad: si el correo no existe, respondemos con 404.
// Algunos sistemas devuelven 200 igual (para no revelar si el correo
// existe), pero en esta app se prioriza la experiencia del usuario.
// =============================================================================
export const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        const error = new Error("El correo es obligatorio");
        error.statusCode = 400; throw error;
    }

    // Verificamos que el correo esté registrado en el sistema
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
        const error = new Error("No existe un usuario registrado con este correo");
        error.statusCode = 404; throw error;
    }

    // Generamos un número aleatorio de 6 dígitos (100000–999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculamos la expiración: ahora + 30 minutos, en formato MySQL DATETIME
    const expiresAt = new Date(Date.now() + 30 * 60000)
        .toISOString().slice(0, 19).replace('T', ' ');

    // Guardamos el OTP y su expiración en la BD del usuario
    await pool.query(
        'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
        [otpCode, expiresAt, email]
    );

    // Enviamos el correo con el código al sandbox de Mailtrap
    await sendOTPEmail(email, otpCode);
    return successResponse(res, 200, "Código enviado exitosamente al correo.");
});

// =============================================================================
// VERIFY OTP — POST /api/auth/verify-otp
// PASO 2 DEL FLUJO DE RECUPERACIÓN
//
// El usuario envía el código que recibió en su correo.
// Verificamos dos cosas:
//   1. Que el código coincida con el guardado en la BD.
//   2. Que no haya superado los 30 minutos de vida.
//
// Si pasa, el frontend redirige al paso final (reset-password).
// =============================================================================
export const verifyOTP = catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        const error = new Error("Faltan datos para la verificación");
        error.statusCode = 400; throw error;
    }

    // Traemos solo los campos necesarios para la verificación
    const [users] = await pool.query(
        'SELECT otp_code, otp_expires_at FROM users WHERE email = ?', [email]
    );
    const user = users[0];

    // Verificamos que el OTP coincida exactamente (comparación de strings)
    if (!user || user.otp_code !== otp) {
        const error = new Error("El código ingresado es incorrecto");
        error.statusCode = 400; throw error;
    }

    // Verificamos que el OTP no haya expirado
    if (new Date() > new Date(user.otp_expires_at)) {
        const error = new Error("El código de seguridad ha expirado");
        error.statusCode = 400; throw error;
    }

    return successResponse(res, 200, "Código verificado correctamente.");
});

// =============================================================================
// RESET PASSWORD — POST /api/auth/reset-password
// PASO 3 DEL FLUJO DE RECUPERACIÓN
//
// Validamos el OTP por SEGUNDA VEZ (el usuario podría llamar esta ruta
// directamente saltándose verifyOTP). Luego:
//   1. Verificamos que la nueva contraseña sea DIFERENTE a la actual
//      (comparando contra el hash guardado con bcrypt).
//   2. Hasheamos la nueva contraseña.
//   3. La guardamos y dejamos el OTP en NULL para que no sea reutilizable.
// =============================================================================
export const resetPassword = catchAsync(async (req, res) => {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
        const error = new Error("Faltan datos para el restablecimiento");
        error.statusCode = 400; throw error;
    }

    // Traemos el hash actual Y el OTP para hacer la doble validación en un solo query
    const [users] = await pool.query(
        'SELECT password, otp_code, otp_expires_at FROM users WHERE email = ?', [email]
    );
    const user = users[0];

    // Doble check: OTP correcto y no expirado
    if (!user || user.otp_code !== otp || new Date() > new Date(user.otp_expires_at)) {
        const error = new Error("Solicitud inválida o código expirado");
        error.statusCode = 400; throw error;
    }

    // Evitamos que el usuario restablezca con la misma contraseña que ya tenía
    const isSamePassword = await comparePassword(password, user.password);
    if (isSamePassword) {
        const error = new Error("La nueva contraseña no puede ser igual a la contraseña actual");
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const hashedPassword = await hashPassword(password);

    // Actualizamos la contraseña y limpiamos el OTP (NULL) para invalidarlo
    await pool.query(
        'UPDATE users SET password = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
        [hashedPassword, email]
    );

    return successResponse(res, 200, "Contraseña restablecida exitosamente.");
});