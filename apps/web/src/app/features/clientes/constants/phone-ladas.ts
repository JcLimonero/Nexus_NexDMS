/**
 * Códigos de país (LADA) para teléfonos.
 * México por defecto para clientes.
 * flag: emoji de bandera (Unicode)
 */
export interface PhoneLada {
  code: string;
  country: string;
  flag: string;
}

export const PHONE_LADAS: PhoneLada[] = [
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+1", country: "Estados Unidos / Canadá", flag: "🇺🇸" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+51", country: "Perú", flag: "🇵🇪" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+507", country: "Panamá", flag: "🇵🇦" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+81", country: "Japón", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+353", country: "Irlanda", flag: "🇮🇪" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
];

export const DEFAULT_LADA = "+52";

/**
 * Parsea un teléfono completo y devuelve { lada, number }.
 * Si no coincide con ninguna LADA conocida, asume México.
 */
export function parsePhone(fullPhone: string | null | undefined): {
  lada: string;
  number: string;
} {
  if (!fullPhone?.trim()) {
    return { lada: DEFAULT_LADA, number: "" };
  }
  const trimmed = fullPhone.trim();
  // Ordenar por longitud descendente para matchear +593 antes de +59
  const sorted = [...PHONE_LADAS].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const { code } of sorted) {
    if (trimmed.startsWith(code)) {
      return {
        lada: code,
        number: trimmed.slice(code.length).replace(/^\s+/, ""),
      };
    }
  }
  // Si empieza con +, extraer el código manualmente (país no en lista)
  if (trimmed.startsWith("+")) {
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return { lada: match[1], number: match[2].trim() };
    }
  }
  // Sin +, asumir México
  return { lada: DEFAULT_LADA, number: trimmed };
}

/**
 * Une LADA + número para enviar a la API.
 */
export function formatPhoneForApi(lada: string, number: string): string {
  const num = (number || "").trim();
  if (!num) return "";
  const code = (lada || DEFAULT_LADA).trim();
  return code.startsWith("+") ? `${code}${num}` : `+${code}${num}`;
}
