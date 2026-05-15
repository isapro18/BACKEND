/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  response.handler.js — FUNCIONES DE RESPUESTA ESTANDARIZADA         ║
 * ║                                                                      ║
 * ║  Centraliza el formato de todas las respuestas de la API para       ║
 * ║  garantizar una estructura consistente en el 100% de los endpoints. ║
 * ║                                                                      ║
 * ║  ESTRUCTURA DE RESPUESTA EXITOSA:                                   ║
 * ║  {                                                                   ║
 * ║    "success": true,                                                  ║
 * ║    "message": "Descripción de lo que ocurrió",                      ║
 * ║    "data":    [] | {} | valor,                                       ║
 * ║    "errors":  []                                                     ║
 * ║  }                                                                   ║
 * ║                                                                      ║
 * ║  ESTRUCTURA DE RESPUESTA DE ERROR:                                   ║
 * ║  {                                                                   ║
 * ║    "success": false,                                                 ║
 * ║    "message": "Descripción del error",                              ║
 * ║    "data":    [],                                                    ║
 * ║    "errors":  ["detalle1", "detalle2"]                              ║
 * ║  }                                                                   ║
 * ║                                                                      ║
 * ║  Nota: el globalErrorHandler usa su propio formato { ok, msn }      ║
 * ║  para errores no operacionales. errorResponse() se usa en casos     ║
 * ║  donde el controlador quiere responder con error manualmente.       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// Respuesta exitosa: siempre success:true, con data y sin errors
export const successResponse = (res, statusCode, message, data = []) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [] // Siempre vacío en respuestas exitosas
    });
};

// Respuesta de error: siempre success:false, con errors y sin data
export const errorResponse = (res, statusCode, message, errors = []) => {
    // Normalizamos errors: si es un string o un objeto, lo convertimos a array
    const formattedErrors = Array.isArray(errors) ? errors : [errors];
    return res.status(statusCode).json({
        success: false,
        message,
        data:   [],
        errors: formattedErrors
    });
};