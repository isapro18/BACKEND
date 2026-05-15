/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  auth.schema.js — ESQUEMA DE VALIDACIÓN PARA AUTENTICACIÓN          ║
 * ║                                                                      ║
 * ║  Define las reglas que debe cumplir el body del endpoint /login.    ║
 * ║  El middleware validateSchema() ejecuta este schema antes de que    ║
 * ║  la petición llegue al controlador.                                  ║
 * ║                                                                      ║
 * ║  CAMPOS VALIDADOS:                                                   ║
 * ║    document → string, mínimo 5 caracteres (obligatorio)             ║
 * ║    password → string, mínimo 4 caracteres (obligatorio)             ║
 * ║               El mínimo es 4 para aceptar los PINs temporales       ║
 * ║               (últimos 4 dígitos del documento) que asigna createUser║
 * ║                                                                      ║
 * ║  .strict() → rechaza cualquier campo adicional en el body.          ║
 * ║  Protección contra inyección de datos no esperados en el login.     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

export const loginSchema = z.object({
    document: z.string({
        required_error:    "El documento es obligatorio",
        invalid_type_error: "El documento debe ser un texto",
    }).min(5, "El documento debe tener al menos 5 caracteres"),

    password: z.string({
        required_error:    "La contraseña es obligatoria",
        invalid_type_error: "La contraseña debe ser un texto",
    }).min(4, "La contraseña debe tener al menos 4 caracteres"),
    // ↑ Mínimo 4 para compatibilidad con contraseñas temporales (PINs de 4 dígitos)

}).strict("No se permiten campos adicionales en el inicio de sesión");