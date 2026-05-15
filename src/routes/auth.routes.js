/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  auth.routes.js — RUTAS DE AUTENTICACIÓN                            ║
 * ║                                                                      ║
 * ║  Define todos los endpoints del módulo de identidad.                ║
 * ║  Estas rutas son PÚBLICAS (no requieren token), excepto /refresh    ║
 * ║  que requiere un refreshToken válido en el body.                    ║
 * ║                                                                      ║
 * ║  BASE: /api/auth  (montado en app.js)                               ║
 * ║                                                                      ║
 * ║  ENDPOINTS:                                                          ║
 * ║                                                                      ║
 * ║  POST /register                                                      ║
 * ║    → Sin validación Zod (campos opcionales según si es 1er usuario) ║
 * ║    → Controlador: register                                           ║
 * ║                                                                      ║
 * ║  POST /login                                                         ║
 * ║    → Valida body con loginSchema (document + password obligatorios) ║
 * ║    → Controlador: login                                              ║
 * ║                                                                      ║
 * ║  POST /refresh                                                       ║
 * ║    → Recibe { refreshToken } en el body                             ║
 * ║    → Controlador: renewToken                                         ║
 * ║                                                                      ║
 * ║  POST /forgot-password  → Paso 1: solicita OTP por correo           ║
 * ║  POST /verify-otp       → Paso 2: valida el código OTP              ║
 * ║  POST /reset-password   → Paso 3: establece la nueva contraseña     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';
import {
    login,
    register,
    renewToken,
    forgotPassword,
    verifyOTP,
    resetPassword
} from '../controllers/auth.controller.js';
import { validateSchema } from '../middlewares/validate.middleware.js';
import { loginSchema }    from '../schemas/auth.schema.js';

const authRouter = express.Router();

// =============================================================================
// RUTAS PÚBLICAS — No requieren JWT
// =============================================================================

// Registro de nueva cuenta (el primer usuario se convierte en SuperAdmin)
authRouter.post('/register', register);

// Inicio de sesión con validación estricta de documento y contraseña
authRouter.post('/login', validateSchema(loginSchema), login);

// Renovación de tokens usando el refreshToken (rotación de tokens)
authRouter.post('/refresh', renewToken);

// ── FLUJO DE RECUPERACIÓN DE CONTRASEÑA (3 pasos en orden) ──────────────────

// Paso 1: el usuario ingresa su correo → se le envía un OTP de 6 dígitos
authRouter.post('/forgot-password', forgotPassword);

// Paso 2: el usuario ingresa el OTP recibido → se verifica que sea válido
authRouter.post('/verify-otp', verifyOTP);

// Paso 3: el usuario ingresa su nueva contraseña → se actualiza en la BD
authRouter.post('/reset-password', resetPassword);

export default authRouter;