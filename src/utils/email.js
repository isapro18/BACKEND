/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  email.js — SERVICIO DE ENVÍO DE CORREOS (MAILTRAP SANDBOX)         ║
 * ║                                                                      ║
 * ║  Maneja el envío del correo de recuperación de contraseña con       ║
 * ║  el código OTP de 6 dígitos.                                        ║
 * ║                                                                      ║
 * ║  PROVEEDOR: Mailtrap Sandbox                                         ║
 * ║  En desarrollo, Mailtrap intercepta todos los correos y los         ║
 * ║  muestra en su bandeja de prueba sin enviarlos a destinatarios      ║
 * ║  reales. Ideal para probar el flujo de recuperación sin riesgo.     ║
 * ║                                                                      ║
 * ║  IMPLEMENTACIÓN: Fetch nativo (sin SDK)                             ║
 * ║  Se usa la API REST directa de Mailtrap para mayor control y        ║
 * ║  sin dependencias adicionales.                                       ║
 * ║                                                                      ║
 * ║  VARIABLES DE ENTORNO REQUERIDAS:                                   ║
 * ║    MAILTRAP_TOKEN    → API key de tu cuenta Mailtrap                ║
 * ║    MAILTRAP_INBOX_ID → ID del sandbox (visible en la URL del inbox) ║
 * ║                                                                      ║
 * ║  FUNCIÓN EXPORTADA:                                                  ║
 * ║    sendOTPEmail(userEmail, otpCode)                                  ║
 * ║    → Envía el correo HTML con el OTP al email indicado.             ║
 * ║    → Si Mailtrap rechaza la petición, lanza un error operacional    ║
 * ║       que catchAsync() propagará al globalErrorHandler.             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import 'dotenv/config';

// =============================================================================
// SEND OTP EMAIL
// Construye y envía el correo HTML de recuperación de contraseña
// al usuario indicado, con el código OTP generado por forgotPassword().
// =============================================================================
export const sendOTPEmail = async (userEmail, otpCode) => {

    // Datos del remitente que aparecerán en el correo
    const sender = {
        name:  "SENA TaskApp Premium",
        email: "seguridad@taskappsena.edu.co"
    };

    // ── PLANTILLA HTML DEL CORREO ─────────────────────────────────────────────
    // Diseño oscuro para coherencia visual con la app.
    // El OTP se muestra centrado y con tipografía grande para facilitar la lectura.
    const htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;
                    background-color:#111827;border:1px solid #374151;border-radius:12px;color:#f9fafb;">
            <div style="text-align:center;margin-bottom:20px;">
                <h2 style="color:#8b5cf6;margin:0;font-size:24px;">Recuperación de Acceso</h2>
            </div>
            <p style="color:#d1d5db;font-size:16px;">Hola,</p>
            <p style="color:#d1d5db;font-size:16px;">
                Tu código de seguridad de un solo uso para restablecer tu contraseña es:
            </p>
            <div style="text-align:center;margin:35px 0;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ffffff;
                             background:#1f2937;padding:15px 30px;border-radius:8px;
                             border:1px solid #8b5cf6;display:inline-block;">${otpCode}</span>
            </div>
            <p style="color:#ef4444;font-size:14px;text-align:center;font-weight:600;">
                Este código expirará en 30 minutos.
            </p>
        </div>
    `;

    try {
        // ── PETICIÓN A LA API SANDBOX DE MAILTRAP ─────────────────────────────
        // Endpoint: POST https://sandbox.api.mailtrap.io/api/send/{inboxId}
        const mailtrapUrl = `https://sandbox.api.mailtrap.io/api/send/${process.env.MAILTRAP_INBOX_ID}`;

        const response = await fetch(mailtrapUrl, {
            method: 'POST',
            headers: {
                // La API key de Mailtrap como Bearer token
                'Authorization': `Bearer ${process.env.MAILTRAP_TOKEN}`,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify({
                from:     sender,
                to:       [{ email: userEmail }],
                subject:  "Código de Recuperación 🔐",
                html:     htmlContent,
                category: "Recuperacion_OTP" // etiqueta visible en el panel de Mailtrap
            })
        });

        // Si Mailtrap responde con un código de error (4xx/5xx), lanzamos excepción
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Detalle del rechazo de Mailtrap:", errorData);
            throw new Error("Mailtrap rechazó la petición");
        }

        console.log("Correo despachado exitosamente al Sandbox vía Fetch API!");

    } catch (error) {
        // Registramos el error técnico y lanzamos uno operacional para el cliente
        console.error("Error de conexión en email.js:", error);
        throw new Error("No se pudo despachar el correo de seguridad.");
    }
};