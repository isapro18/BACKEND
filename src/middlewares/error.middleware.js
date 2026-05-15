/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  error.middleware.js — MANEJADOR GLOBAL DE ERRORES                  ║
 * ║                                                                      ║
 * ║  Punto de centralización de todos los errores de la API.            ║
 * ║  Express lo reconoce como manejador de errores por tener exactamente║
 * ║  4 parámetros: (err, req, res, next).                               ║
 * ║                                                                      ║
 * ║  ¿CÓMO LLEGAN LOS ERRORES AQUÍ?                                     ║
 * ║  Los controladores están envueltos en catchAsync(), que captura     ║
 * ║  cualquier Promise rechazada o "throw new Error" y lo pasa a        ║
 * ║  next(error), lo que activa automáticamente este middleware.        ║
 * ║                                                                      ║
 * ║  CLASIFICACIÓN DE ERRORES:                                          ║
 * ║                                                                      ║
 * ║  Operacionales (error.isOperational = true):                        ║
 * ║    Errores esperados y controlados (404, 400, 409...).              ║
 * ║    Se muestra el mensaje exacto del error al cliente.               ║
 * ║                                                                      ║
 * ║  No operacionales (isOperational ausente o false):                  ║
 * ║    Errores inesperados (bugs, fallos de BD...).                     ║
 * ║    Se responde con "Error interno del servidor" para no exponer     ║
 * ║    detalles internos al cliente.                                    ║
 * ║                                                                      ║
 * ║  Casos especiales normalizados:                                     ║
 * ║    TokenExpiredError → 401 en español                               ║
 * ║    JsonWebTokenError → 401 en español                               ║
 * ║    ZodError / ValidationError → 400 en español                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { errorResponse } from "../utils/response.handler.js";

export const globalErrorHandler = (err, req, res, next) => {
    // Registramos el error en consola para debugging (nombre + mensaje)
    console.error("Error capturado globalmente:", err.name, "-", err.message);

    // Por defecto: 500 y mensaje genérico (para errores no operacionales)
    let statusCode = err.statusCode || 500;
    let message    = err.isOperational ? err.message : "Error interno del servidor";

    // ── ERRORES JWT ───────────────────────────────────────────────────────────
    // jwt.verify() lanza estos errores directamente (no pasan por catchAsync)
    // cuando el middleware verifyToken hace next(error) en lugar de retornar.
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message    = "Acceso denegado. El token ha expirado.";
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message    = "Acceso denegado. Firma de token inválida o corrupta.";
    }

    // ── ERRORES DE VALIDACIÓN ─────────────────────────────────────────────────
    // ZodError: lanzado por schema.parse() si los datos no pasan la validación.
    // ValidationError: compatibilidad con Joi u otras librerías de validación.
    if (err.name === 'ZodError' || err.name === 'ValidationError') {
        statusCode = 400;
        message    = "Error de validación: Revise que los datos enviados sean correctos.";
    }

    // Respondemos con el formato estándar { ok: false, msn: "..." }
    return res.status(statusCode).json({
        ok: false,
        msn: message
    });
};