/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  catchAsync.js — WRAPPER PARA CONTROLADORES ASÍNCRONOS              ║
 * ║                                                                      ║
 * ║  Elimina la necesidad de escribir try/catch en cada controlador.    ║
 * ║                                                                      ║
 * ║  ¿POR QUÉ ES NECESARIO?                                             ║
 * ║  Express no captura automáticamente los errores de funciones async. ║
 * ║  Si un controlador hace "throw new Error" o una Promise se rechaza, ║
 * ║  Express no lo intercepta y el servidor se cuelga sin respuesta.    ║
 * ║                                                                      ║
 * ║  ¿CÓMO FUNCIONA?                                                    ║
 * ║  Envuelve el controlador en una función que agrega un .catch(next). ║
 * ║  Si la Promise del controlador es rechazada, next(error) activa     ║
 * ║  automáticamente el globalErrorHandler en error.middleware.js.      ║
 * ║                                                                      ║
 * ║  USO:                                                               ║
 * ║    export const miControlador = catchAsync(async (req, res) => {   ║
 * ║        // Cualquier throw aquí llega a globalErrorHandler           ║
 * ║        const [rows] = await pool.query('...');                      ║
 * ║    });                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export const catchAsync = (fn) => {
    // Devolvemos el middleware estándar de Express (req, res, next)
    return (req, res, next) => {
        // Ejecutamos el controlador y capturamos cualquier error con .catch(next)
        // next(error) activa el middleware de error global (4 parámetros)
        fn(req, res, next).catch(next);
    };
};