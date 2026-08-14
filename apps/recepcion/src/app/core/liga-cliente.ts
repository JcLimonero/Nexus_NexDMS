/**
 * La liga de seguimiento que se le entrega al cliente en el mostrador.
 *
 * ⚠️ Copia de `apps/web/src/app/shared/utils/liga-cliente.ts`. Los dos
 * portales son proyectos separados y no comparten árbol de código, igual que
 * el resto del flujo de recepción: un cambio aquí hay que llevarlo también
 * allá, sobre todo la regla de la lada del teléfono.
 */

/** Dirección pública de seguimiento de una orden. */
export function ligaDeSeguimiento(token: string): string {
  // Se arma sobre el origen actual porque la misma aplicación sirve `/t/:token`:
  // así funciona igual en la demo, en la red del taller y en producción, sin
  // una variable de entorno que alguien olvide cambiar al desplegar.
  return `${location.origin}/t/${token}`;
}

/**
 * Teléfono en el formato que exige WhatsApp: solo dígitos, con lada de país.
 *
 * Los teléfonos del taller se capturan a diez dígitos, como se marcan aquí.
 * WhatsApp los rechaza sin lada, y un `wa.me/5551002031` abre un chat con un
 * número de otro país en vez de dar un error, así que la corrección no puede
 * quedar en manos de quien captura.
 *
 * Devuelve null si no hay con qué: entonces se abre WhatsApp sin destinatario
 * y el asesor elige el contacto, que es mejor que escribirle a un desconocido.
 */
export function telefonoParaWhatsApp(
  telefono: string | null | undefined,
  ladaPais = '52',
): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 10) return null;
  if (digitos.length === 10) return `${ladaPais}${digitos}`;
  // Ya trae lada (52..., 521... para móviles antiguos) o es de otro país.
  return digitos;
}

/**
 * Mensaje con el que se manda la liga, listo para WhatsApp.
 *
 * Lleva el nombre del asesor porque el cliente que se queda con una duda
 * busca a una persona, no a un conmutador: si el mensaje no dice quién lo
 * atendió, acaba llamando al mostrador y contando la historia de nuevo.
 */
export function mensajeDeSeguimiento(
  folio: string,
  liga: string,
  nombre?: string | null,
  asesor?: string | null,
): string {
  const saludo = nombre ? `Hola ${nombre}: ` : "Hola: ";
  const quien = asesor ? ` Te atiende ${asesor}.` : "";
  return (
    `${saludo}recibimos tu unidad con la orden ${folio}.${quien} ` +
    `Aquí puedes ver cómo la recibimos y seguir su avance: ${liga}`
  );
}

/** Dirección de WhatsApp; sin teléfono, deja elegir el contacto. */
export function ligaWhatsApp(
  telefono: string | null,
  mensaje: string,
): string {
  const texto = encodeURIComponent(mensaje);
  return telefono
    ? `https://wa.me/${telefono}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}

/**
 * Copia al portapapeles.
 *
 * `navigator.clipboard` solo existe en contexto seguro. En el taller esto se
 * abre por IP en la red local, que no lo es, así que hace falta el camino
 * viejo o el botón no haría nada justo donde más se usa.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* sin permiso o sin contexto seguro: se intenta el camino viejo */
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
