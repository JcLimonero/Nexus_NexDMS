/**
 * Llave de caché de la ruta de un número de WhatsApp.
 *
 * Vive aparte del servicio para que quien cambia la configuración de la
 * sucursal pueda invalidarla sin tener que importar el módulo del bot: si un
 * admin corrige el `phone_number_id`, los mensajes deben enrutar bien de
 * inmediato, no cuando expire la caché.
 */
export function whatsappRouteCacheKey(phoneNumberId: string): string {
  return `wa:route:${phoneNumberId}`;
}
