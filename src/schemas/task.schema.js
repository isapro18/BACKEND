/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  task.schema.js — ESQUEMAS DE VALIDACIÓN PARA TAREAS                ║
 * ║                                                                      ║
 * ║  SCHEMAS EXPORTADOS:                                                 ║
 * ║                                                                      ║
 * ║  createTaskSchema     → Valida el body de POST /api/tasks           ║
 * ║  updateTaskSchema     → Valida el body de PUT /api/tasks/:id        ║
 * ║  assignTaskSchema     → Valida el body de POST /api/tasks/:id/assign║
 * ║  filterTaskQuerySchema → Valida el query param de GET /filter       ║
 * ║                                                                      ║
 * ║  NOTA SOBRE .strict():                                               ║
 * ║  createTaskSchema y updateTaskSchema NO usan .strict() porque sus   ║
 * ║  campos son condicionalmente opcionales. Con .strict(), Zod bloquea ║
 * ║  campos extra o undefined explícitos, lo que causaba 400 cuando el  ║
 * ║  instructor enviaba campos parciales (ej: solo { status }).         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// =============================================================================
// CREATE TASK SCHEMA — POST /api/tasks
//
// Soporta dos modos de asignación (ambos opcionales individualmente,
// pero al menos uno debe estar presente, validado con .refine()):
//
//   userIds (array) → asignación masiva: una tarea por cada userId
//   userId (number) → asignación singular: una sola tarea
//
// El instructor usa userIds desde el selector múltiple del panel.
// Otros flujos pueden usar userId para asignación directa.
// =============================================================================
export const createTaskSchema = z.object({
    title: z.string({
        required_error: "El título es obligatorio"
    }).min(5, "El título debe tener al menos 5 caracteres").max(100),

    description: z.string()
        .max(500, "La descripción no puede exceder los 500 caracteres")
        .optional(),

    // Modo masivo: array con al menos un ID de usuario
    userIds: z.array(
        z.number({ invalid_type_error: "Cada ID debe ser un número entero" }).int().positive()
    ).min(1, "Debes asignar la tarea a al menos un usuario").optional(),

    // Modo singular: un solo ID de usuario
    userId: z.number({
        invalid_type_error: "El userId debe ser un número entero"
    }).int().positive().optional()

// .refine() valida la regla cruzada: debe venir userIds O userId, no ni uno ni otro
}).refine(data => data.userIds?.length > 0 || data.userId, {
    message: "Debes proporcionar userIds (array) o userId para asignar la tarea"
});
// ⚠️ Sin .strict(): los dos campos de asignación son condicionalmente opcionales

// =============================================================================
// UPDATE TASK SCHEMA — PUT /api/tasks/:id
//
// Todos los campos son opcionales: el controlador solo actualiza
// los que lleguen en el body (query dinámica).
//
// Esto permite que el instructor rechace una tarea enviando solo
// { status: "incompleta" } sin tocar el título ni la descripción.
// =============================================================================
export const updateTaskSchema = z.object({
    title:       z.string().min(5).max(100).optional(),
    description: z.string().max(500).optional(),
    status:      z.enum(
        ["pendiente", "en progreso", "completada", "incompleta"],
        { errorMap: () => ({ message: "Estado no válido. Usa: pendiente, en progreso, completada o incompleta" }) }
    ).optional()
});
// ⚠️ Sin .strict(): el instructor puede enviar campos extra sin romper la validación

// =============================================================================
// ASSIGN TASK SCHEMA — POST /api/tasks/:taskId/assign
//
// Valida que el body contenga un array de IDs de usuario para reasignar
// una tarea existente. Al menos un ID es obligatorio.
// =============================================================================
export const assignTaskSchema = z.object({
    userIds: z.array(
        z.number({
            invalid_type_error: "Cada ID de usuario debe ser un número entero",
            required_error:      "Se requiere un ID de usuario"
        }).int().positive("Los IDs deben ser números positivos")
    ).min(1, "Debes enviar al menos un ID de usuario en el arreglo")

}).strict("No se permiten campos adicionales en la asignación");

// =============================================================================
// FILTER TASK QUERY SCHEMA — GET /api/tasks/filter?status=...
//
// Valida el query param 'status'. Solo acepta los cuatro valores permitidos
// en el modelo. Se aplica sobre req.query (target = 'query' en la ruta).
// =============================================================================
export const filterTaskQuerySchema = z.object({
    status: z.enum(
        ["pendiente", "en progreso", "completada", "incompleta"],
        { errorMap: () => ({ message: "El estado de filtro enviado en la URL no es válido" }) }
    )
}).strict("No se permiten parámetros adicionales en la URL");