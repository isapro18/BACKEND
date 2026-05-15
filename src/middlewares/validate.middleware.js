/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  validate.middleware.js — MIDDLEWARE DE VALIDACIÓN CON ZOD          ║
 * ║                                                                      ║
 * ║  Middleware factory que recibe un schema de Zod y un target         ║
 * ║  (parte de la petición a validar) y devuelve un middleware que      ║
 * ║  ejecuta la validación antes de que la petición llegue al           ║
 * ║  controlador.                                                        ║
 * ║                                                                      ║
 * ║  ¿QUÉ ES UN MIDDLEWARE FACTORY?                                      ║
 * ║  Es una función que devuelve otra función (el middleware real).      ║
 * ║  Esto permite parametrizarlo: cada ruta le pasa su propio schema.   ║
 * ║                                                                      ║
 * ║  FLUJO DE VALIDACIÓN:                                               ║
 * ║                                                                      ║
 * ║  Petición HTTP                                                       ║
 * ║    ▼                                                                 ║
 * ║  schema.safeParse(req[target])                                       ║
 * ║    ├── ✅ Válido  → inyecta los datos limpios en req[target]        ║
 * ║    │               → next() → llega al controlador                  ║
 * ║    └── ❌ Inválido → responde 400 con lista de errores por campo    ║
 * ║                      → el controlador NUNCA se ejecuta              ║
 * ║                                                                      ║
 * ║  TARGETS DISPONIBLES:                                               ║
 * ║    'body'  → req.body  (datos JSON del cuerpo — por defecto)        ║
 * ║    'query' → req.query (parámetros de la URL: ?status=pendiente)   ║
 * ║                                                                      ║
 * ║  USO EN RUTAS:                                                      ║
 * ║    // Valida el body con el schema de creación de tarea             ║
 * ║    router.post('/', verifyToken, validateSchema(createTaskSchema), createTask);   ║
 * ║                                                                      ║
 * ║    // Valida los query params para el filtro de tareas              ║
 * ║    router.get('/filter', validateSchema(filterSchema, 'query'), filterTasks);    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export const validateSchema = (schema, target = 'body') => {
    return (req, res, next) => {
        // safeParse no lanza excepciones: siempre devuelve { success, data, error }
        const result = schema.safeParse(req[target]);

        if (!result.success) {
            // Transformamos los errores de Zod en un formato legible por el frontend:
            // [{ field: 'email', message: 'Formato de correo inválido' }, ...]
            const structuredErrors = result.error.issues.map((issue) => {
                let finalMessage = issue.message;

                // Zod devuelve "received undefined" para campos ausentes.
                // Lo reemplazamos por un mensaje más amigable en español.
                if (finalMessage.includes("received undefined")) {
                    finalMessage = "Este campo es obligatorio";
                }

                return {
                    // issue.path[0] es el nombre del campo que falló
                    // Si path está vacío (error de refine global), usamos el target
                    field:   issue.path.length > 0 ? issue.path[0] : target,
                    message: finalMessage
                };
            });

            // Cortamos el flujo aquí: el controlador no llega a ejecutarse
            return res.status(400).json({
                success: false,
                message: `Error de validación en: ${target}`,
                errors:  structuredErrors
            });
        }

        // Reemplazamos req[target] con los datos ya validados y tipados por Zod.
        // Esto garantiza que el controlador recibe datos limpios y seguros.
        req[target] = result.data;
        next();
    };
};