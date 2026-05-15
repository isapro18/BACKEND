/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  role.schema.js — ESQUEMA DE VALIDACIÓN PARA ROLES                  ║
 * ║                                                                      ║
 * ║  Define las reglas para crear un nuevo rol en el sistema.           ║
 * ║  Actualmente el endpoint de creación de roles está reservado para   ║
 * ║  uso interno / futuras extensiones del panel de SuperAdmin.         ║
 * ║                                                                      ║
 * ║  CAMPOS VALIDADOS:                                                   ║
 * ║    name        → string obligatorio, mínimo 3 caracteres            ║
 * ║    description → string opcional, máximo 255 caracteres             ║
 * ║    permissions → array de IDs numéricos enteros positivos (opcional)║
 * ║                  Representan los IDs de la tabla permissions en BD  ║
 * ║                                                                      ║
 * ║  .strict() → rechaza campos no declarados en el schema.            ║
 * ║  Previene inyecciones de datos no autorizados al crear roles.       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

export const createRoleSchema = z.object({
    name: z.string({
        required_error:    "El nombre del rol es obligatorio",
        invalid_type_error: "El nombre debe ser texto"
    }).min(3, "El nombre debe tener al menos 3 caracteres"),

    description: z.string({
        invalid_type_error: "La descripción debe ser texto"
    }).max(255, "La descripción excede el límite permitido").optional(),

    // Array de IDs numéricos que se relacionarán en role_permissions
    permissions: z.array(
        z.number().int().positive(),
        { invalid_type_error: "Los permisos deben ser un arreglo de IDs numéricos" }
    ).optional()

}).strict("Inyección de datos detectada: No se permiten campos adicionales en el rol.");