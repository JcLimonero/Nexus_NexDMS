import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const USERS = "/api/v1/users";
const AGENDA = "/api/v1/user-availability";

/**
 * Roles del sistema, con lo que hace cada uno.
 *
 * La lista y su descripción viven aquí y no en la plantilla porque la
 * pantalla los muestra en tres sitios —tabla, alta y detalle— y repetirlos
 * garantizaba que acabaran diciendo cosas distintas.
 */
export const ROLES: { value: string; label: string; detalle: string }[] = [
  { value: "ADMIN", label: "Administrador", detalle: "Todo el sistema del grupo" },
  { value: "MANAGER", label: "Gerente", detalle: "Operación de su sucursal" },
  { value: "CASHIER", label: "Caja y ventas", detalle: "Mostrador, cobros y citas" },
  {
    value: "RECEPTIONIST",
    label: "Asesor de servicio",
    detalle: "Recibe unidades; se le reparten las citas",
  },
  { value: "MECHANIC", label: "Técnico", detalle: "Repara; su app es la del taller" },
  { value: "WAREHOUSE", label: "Almacén", detalle: "Entradas, salidas y traspasos" },
  { value: "SELLER", label: "Vendedor", detalle: "Unidades, leads y cotizaciones" },
  { value: "EXECUTIVE", label: "Directivo", detalle: "Consulta y reportes" },
  {
    value: "LEGAL_ENTITY_MANAGER",
    label: "Gerente de razón social",
    detalle: "Manda sobre las sucursales de una razón social",
  },
  { value: "ADMIN_MANAGER", label: "Gerente administrativo", detalle: "Finanzas y cobranza" },
  { value: "PARTS_MANAGER", label: "Jefe de refacciones", detalle: "Inventario y compras" },
  { value: "AFTERSALES_MANAGER", label: "Gerente de posventa", detalle: "Taller y garantías" },
  { value: "IT_MANAGER", label: "Sistemas", detalle: "Parámetros y usuarios" },
  { value: "AML_OFFICER", label: "Oficial de cumplimiento", detalle: "PLD y avisos" },
  {
    value: "DOCUMENT_VALIDATOR",
    label: "Validador de documentos",
    detalle: "Expediente del cliente",
  },
  { value: "AUDITOR", label: "Auditor", detalle: "Solo lectura" },
];

export const DIAS = [
  { valor: 1, corto: "Lun", nombre: "Lunes" },
  { valor: 2, corto: "Mar", nombre: "Martes" },
  { valor: 3, corto: "Mié", nombre: "Miércoles" },
  { valor: 4, corto: "Jue", nombre: "Jueves" },
  { valor: 5, corto: "Vie", nombre: "Viernes" },
  { valor: 6, corto: "Sáb", nombre: "Sábado" },
  // El domingo va al final: la semana laboral empieza en lunes aunque el
  // día 0 de JavaScript sea el domingo.
  { valor: 0, corto: "Dom", nombre: "Domingo" },
];

export interface Usuario {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Especialidad del mecánico (hojalatero, pintor, general…). */
  specialty: string | null;
  scope: "GLOBAL" | "LEGAL_ENTITY" | "SUCURSAL";
  isActive: boolean;
  lastLoginAt: string | null;
  /** Bloqueado por intentos fallidos; se quita al restablecer la contraseña. */
  bloqueado: boolean;
  roles: string[];
  branchIds: string[];
}

export interface NuevoUsuario {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
  scope: string;
  branchIds: string[];
  specialty?: string | null;
}

export interface DiaDeTrabajo {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Ausencia {
  id: string;
  startDate: string;
  endDate: string;
  type: "VACATION" | "SICK_LEAVE" | "OTHER";
  notes: string | null;
}

export interface Agenda {
  horarios: DiaDeTrabajo[];
  ausencias: Ausencia[];
  /** No tiene horario propio: rige el turno por omisión. */
  porOmision: boolean;
  turnoPorOmision: { inicio: string; fin: string };
}

/** Quién está y quién no en la sucursal un día dado. */
export interface EnTurno {
  id: string;
  nombre: string;
  disponible: boolean;
  motivo?: "ausente" | "fuera-de-horario";
  ventanas: { inicio: string; fin: string }[];
  porOmision: boolean;
}

@Injectable({ providedIn: "root" })
export class UsuariosService {
  private http = inject(HttpClient);

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(USERS);
  }

  crear(dto: NuevoUsuario): Observable<unknown> {
    return this.http.post(USERS, dto);
  }

  actualizar(id: string, dto: Partial<Usuario>): Observable<Usuario> {
    return this.http.patch<Usuario>(`${USERS}/${id}`, dto);
  }

  alternarActivo(id: string): Observable<{ id: string; isActive: boolean }> {
    return this.http.patch<{ id: string; isActive: boolean }>(
      `${USERS}/${id}/activo`,
      {},
    );
  }

  restablecerContrasena(id: string, password: string): Observable<void> {
    return this.http.patch<void>(`${USERS}/${id}/contrasena`, { password });
  }

  // ─── Horario ────────────────────────────────────────────────

  agenda(userId: string, branchId?: string): Observable<Agenda> {
    const q = branchId ? `?branchId=${branchId}` : "";
    return this.http.get<Agenda>(`${AGENDA}/agenda/${userId}${q}`);
  }

  guardarHorario(
    userId: string,
    branchId: string,
    dias: DiaDeTrabajo[],
  ): Observable<DiaDeTrabajo[]> {
    return this.http.put<DiaDeTrabajo[]>(`${AGENDA}/agenda/${userId}`, {
      branchId,
      dias,
    });
  }

  registrarAusencia(
    userId: string,
    dto: {
      branchId: string;
      startDate: string;
      endDate: string;
      type: string;
      notes?: string;
    },
  ): Observable<Ausencia> {
    return this.http.post<Ausencia>(
      `${AGENDA}/agenda/${userId}/ausencias`,
      dto,
    );
  }

  eliminarAusencia(id: string): Observable<void> {
    return this.http.delete<void>(`${AGENDA}/ausencias/${id}`);
  }

  enTurno(branchId: string, date: string): Observable<EnTurno[]> {
    return this.http.get<EnTurno[]>(
      `${AGENDA}/panel?branchId=${branchId}&date=${date}`,
    );
  }
}
