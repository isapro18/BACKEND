/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  user.schema.js — ESQUEMAS DE VALIDACIÓN PARA USUARIOS              ║
 * ║                                                                      ║
 * ║  SCHEMAS EXPORTADOS:                                                 ║
 * ║                                                                      ║
 * ║  createUserSchema → Valida el body de POST /api/users               ║
 * ║  updateUserSchema → Valida el body de PUT /api/users/:id            ║
 * ║                                                                      ║
 * ║  Ambos usan .strict() para rechazar cualquier campo no declarado,  ║
 * ║  previniendo inyección de datos sensibles (ej: permisos, password)  ║
 * ║  en las peticiones de creación y actualización de usuarios.         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// =============================================================================
// UPDATE USER SCHEMA — PUT /api/users/:id
//
// Todos los campos son opcionales para permitir actualizaciones parciales.
// El controlador recibe solo los campos que lleguen y los aplica todos.
//
// Validaciones de seguridad importantes:
//   - document: solo números (sin letras ni espacios)
//   - role_id:  número entero positivo (evita asignar roles inválidos)
//   - status:   solo 'activo' o 'inactivo' (enum estricto)
//
// .strict() previene que el cliente intente inyectar campos como
// 'password', 'permissions' o 'otp_code' en la actualización.
// =============================================================================
export const updateUserSchema = z.object({
    name: z.string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100)
        .optional(),

    email: z.string()
        .email("Formato de correo electrónico inválido")
        .optional(),

    document: z.string()
        .regex(/^\d+$/, "El documento solo puede contener números")
        .optional(),

    // Validamos el ID numérico del rol, no el nombre string
    role_id: z.number({
        invalid_type_error: "El ID del rol debe ser un número"
    }).int("El ID del rol debe ser entero").positive("El ID del rol debe ser positivo").optional(),

    status: z.enum(["activo", "inactivo"], {
        errorMap: () => ({ message: "El estado debe ser 'activo' o 'inactivo'" })
    }).optional()

}).strict("Alerta de Seguridad: No se permiten campos adicionales (como permisos) en la actualización.");

// =============================================================================
// CREATE USER SCHEMA — POST /api/users
//
// Campos obligatorios: name, email, document.
// Campos opcionales:   role_id (default: 3 → Estudiante), status (default: 'activo').
//
// El password NO se incluye aquí porque se genera automáticamente
// en el controlador (últimos 4 dígitos del documento).
//
// .strict() protege contra inyección de datos no autorizados,
// como intentar establecer una contraseña específica o forzar un rol
// de SuperAdmin directamente desde la petición.
// =============================================================================
export const createUserSchema = z.object({
    name: z.string({
        required_error: "El nombre es obligatorio"
    }).min(3, "El nombre debe tener al menos 3 caracteres").max(100),

    email: z.string({
        required_error: "El email es obligatorio"
    }).email("Formato de correo electrónico inválido"),

    document: z.string({
        required_error: "El documento es obligatorio"
    }).regex(/^\d+$/, "El documento solo puede contener números, sin espacios ni letras"),

    // Si no se envía, el controlador usa 3 (Estudiante) como valor por defecto
    role_id: z.number({
        invalid_type_error: "El ID del rol debe ser un número"
    }).int().positive().optional(),

    status: z.enum(["activo", "inactivo"], {
        errorMap: () => ({ message: "El estado debe ser 'activo' o 'inactivo'" })
    }).optional()

}).strict("Alerta de Seguridad: Violación de payload. No se permiten inyecciones de datos no autorizados.");