/**
 * Configuración de EmailJS
 *
 * IMPORTANTE: Edita estas variables con tus credenciales de EmailJS
 * Si prefieres usar variables de entorno, déjalas vacías ("")
 */

export const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "",
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "",
};

// Verificar si está configurado
export const isEmailJSConfigured = () => {
  return !!(
    EMAILJS_CONFIG.SERVICE_ID &&
    EMAILJS_CONFIG.TEMPLATE_ID &&
    EMAILJS_CONFIG.PUBLIC_KEY
  );
};

// Log de configuración (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log(
    "📧 EmailJS:",
    isEmailJSConfigured()
      ? "✅ Configurado"
      : "⚠️ No configurado (usar variables de entorno: VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY)",
  );
  if (isEmailJSConfigured()) {
    console.log("   Service ID:", EMAILJS_CONFIG.SERVICE_ID);
    console.log("   Template ID:", EMAILJS_CONFIG.TEMPLATE_ID);
    console.log(
      "   Public Key:",
      EMAILJS_CONFIG.PUBLIC_KEY.substring(0, 8) + "...",
    );
  }
}
