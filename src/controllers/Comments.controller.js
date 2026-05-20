/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  comments.controller.js — COMENTARIOS Y CALIFICACIONES DE TAREAS   ║
 * ║                                                                      ║
 * ║  getComments    → Obtener hilo de comentarios tarea+estudiante      ║
 * ║  postComment    → Publicar un comentario en el hilo                 ║
 * ║  gradeTask      → Calificar una tarea (0-100)                       ║
 * ║  getGrade       → Obtener calificación de tarea+estudiante          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import pool            from '../config/db.js';
import { catchAsync }  from '../utils/catchAsync.js';
import { successResponse } from '../utils/response.handler.js';

// =============================================================================
// GET COMMENTS — GET /api/tasks/:taskId/comments/:studentId
// Requiere: verifyToken (cualquier usuario autenticado)
//
// Devuelve el hilo completo de comentarios de una tarea para un estudiante,
// incluyendo nombre y roles del autor de cada mensaje.
// =============================================================================
export const getComments = catchAsync(async (req, res) => {
    const { taskId, studentId } = req.params;

    const [comments] = await pool.query(`
        SELECT
            tc.id,
            tc.message,
            tc.createdAt,
            tc.author_id  AS authorId,
            u.name        AS authorName,
            (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ')
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = tc.author_id
            ) AS authorRoles
        FROM task_comments tc
        JOIN users u ON u.id = tc.author_id
        WHERE tc.task_id = ? AND tc.student_id = ?
        ORDER BY tc.createdAt ASC
    `, [taskId, studentId]);

    return successResponse(res, 200, 'Comentarios obtenidos', comments);
});

// =============================================================================
// POST COMMENT — POST /api/tasks/:taskId/comments
// Requiere: verifyToken (cualquier usuario autenticado)
// Body: { studentId, message }
//
// El author_id siempre es req.user.id (quién está logueado).
// studentId identifica el hilo (tarea+estudiante).
// =============================================================================
export const postComment = catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const { studentId, message } = req.body;

    if (!message?.trim()) {
        const error = new Error('El mensaje no puede estar vacío');
        error.statusCode = 400; error.isOperational = true; throw error;
    }
    if (!studentId) {
        const error = new Error('Se requiere el studentId del hilo');
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    const [result] = await pool.query(
        'INSERT INTO task_comments (task_id, student_id, author_id, message) VALUES (?, ?, ?, ?)',
        [taskId, studentId, req.user.id, message.trim()]
    );

    // Retornamos el comentario recién creado con los datos del autor
    const [[comment]] = await pool.query(`
        SELECT
            tc.id,
            tc.message,
            tc.createdAt,
            tc.author_id AS authorId,
            u.name       AS authorName,
            (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ')
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = tc.author_id
            ) AS authorRoles
        FROM task_comments tc
        JOIN users u ON u.id = tc.author_id
        WHERE tc.id = ?
    `, [result.insertId]);

    return successResponse(res, 201, 'Comentario publicado', comment);
});

// =============================================================================
// GRADE TASK — POST /api/tasks/:taskId/grade
// Requiere: TASKS_CREATE_MULTIPLE (instructor y superadmin)
// Body: { studentId, grade }
//
// Si ya existe una calificación para task+student, la actualiza (upsert).
// Regla SENA: >= 75 aprueba, < 75 no aprueba.
// =============================================================================
export const gradeTask = catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const { studentId, grade } = req.body;

    if (grade === undefined || grade === null) {
        const error = new Error('Se requiere la calificación');
        error.statusCode = 400; error.isOperational = true; throw error;
    }
    const gradeNum = Number(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
        const error = new Error('La calificación debe ser un número entre 0 y 100');
        error.statusCode = 400; error.isOperational = true; throw error;
    }
    if (!studentId) {
        const error = new Error('Se requiere el studentId');
        error.statusCode = 400; error.isOperational = true; throw error;
    }

    // Upsert: si ya existe actualiza, si no inserta
    await pool.query(`
        INSERT INTO task_grades (task_id, student_id, grade, graded_by)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            grade      = VALUES(grade),
            graded_by  = VALUES(graded_by),
            updatedAt  = CURRENT_TIMESTAMP
    `, [taskId, studentId, gradeNum, req.user.id]);

    const approved = gradeNum >= 75;
    return successResponse(res, 200, `Calificación guardada. ${approved ? 'APROBÓ ✅' : 'NO APROBÓ ❌'}`, {
        grade: gradeNum,
        approved,
        threshold: 75,
    });
});

// =============================================================================
// GET GRADE — GET /api/tasks/:taskId/grade/:studentId
// Requiere: verifyToken (cualquier usuario autenticado)
//
// Devuelve la calificación actual, quién calificó y si aprobó.
// =============================================================================
export const getGrade = catchAsync(async (req, res) => {
    const { taskId, studentId } = req.params;

    const [[grade]] = await pool.query(`
        SELECT
            tg.grade,
            tg.updatedAt,
            tg.grade >= 75      AS approved,
            grader.name         AS gradedByName
        FROM task_grades tg
        LEFT JOIN users grader ON grader.id = tg.graded_by
        WHERE tg.task_id = ? AND tg.student_id = ?
    `, [taskId, studentId]);

    if (!grade) {
        return successResponse(res, 200, 'Sin calificación aún', null);
    }

    return successResponse(res, 200, 'Calificación obtenida', {
        ...grade,
        approved: !!grade.approved,
        threshold: 75,
    });
});