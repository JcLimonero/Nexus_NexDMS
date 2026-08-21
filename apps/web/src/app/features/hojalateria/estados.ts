import {
  BodyworkItemStatus,
  BodyworkOperation,
  BodyworkStatus,
} from "./hojalateria.service";

export const ESTADOS: { value: BodyworkStatus; label: string; tono: string }[] =
  [
    { value: "RECEIVED", label: "Recibida", tono: "recibida" },
    { value: "IN_PROGRESS", label: "En proceso", tono: "proceso" },
    { value: "READY", label: "Lista", tono: "lista" },
    { value: "DELIVERED", label: "Entregada", tono: "entregada" },
    { value: "CANCELLED", label: "Cancelada", tono: "cancelada" },
  ];

/** Estados a los que se puede avanzar una orden (flujo simple). */
export const FLUJO: BodyworkStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
];

export const OPERACIONES: { value: BodyworkOperation; label: string }[] = [
  { value: "REPAIR", label: "Reparar" },
  { value: "REPLACE", label: "Cambiar" },
  { value: "PAINT", label: "Pintar" },
];

export const ITEM_ESTADOS: { value: BodyworkItemStatus; label: string }[] = [
  { value: "PENDING", label: "Por autorizar" },
  { value: "APPROVED", label: "Autorizada" },
  { value: "REJECTED", label: "Rechazada" },
];

export const ZONAS: { value: string; label: string }[] = [
  { value: "FRENTE", label: "Frente" },
  { value: "TRASERA", label: "Trasera" },
  { value: "LATERAL_IZQ", label: "Lateral izquierdo" },
  { value: "LATERAL_DER", label: "Lateral derecho" },
  { value: "TECHO", label: "Techo" },
  { value: "INTERIOR", label: "Interior" },
  { value: "OTRO", label: "Otro" },
];
