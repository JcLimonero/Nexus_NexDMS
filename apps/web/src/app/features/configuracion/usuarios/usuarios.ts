import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import {
  Agenda,
  Ausencia,
  DIAS,
  DiaDeTrabajo,
  EnTurno,
  ROLES,
  Usuario,
  UsuariosService,
} from "./usuarios.service";

interface Sucursal {
  id: string;
  name: string;
}

/** Un día en el editor de horario: marcado o no, con sus horas. */
interface DiaEditable {
  valor: number;
  nombre: string;
  corto: string;
  trabaja: boolean;
  inicio: string;
  fin: string;
}

/**
 * Usuarios del grupo: quién entra, con qué rol y en qué horario.
 *
 * El horario no es un dato administrativo más: de él depende a quién se le
 * reparten las citas. Por eso vive junto al usuario y no en una pantalla
 * aparte del taller.
 */
@Component({
  selector: "app-usuarios",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./usuarios.html",
  styleUrls: ["./usuarios.scss"],
})
export class Usuarios implements OnInit, OnDestroy {
  private srv = inject(UsuariosService);
  private branchesSrv = inject(BranchesService);

  readonly roles = ROLES;
  readonly dias = DIAS;

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);

  usuarios = signal<Usuario[]>([]);
  sucursales = signal<Sucursal[]>([]);
  /** Sucursal cuyo horario se administra; los horarios son por sucursal. */
  branchId = signal<string>("");
  enTurno = signal<EnTurno[]>([]);

  disponiblesHoy = computed(
    () => this.enTurno().filter((u) => u.disponible).length,
  );

  constructor() {
    // Con un diálogo abierto la rueda tiene que mover su contenido, no la
    // página de atrás: si no, el listado se desplaza bajo el diálogo y al
    // cerrarlo uno aparece en otro sitio del que estaba.
    effect(() => {
      const abierto = this.formAbierto() || !!this.horarioDe();
      document.body.style.overflow = abierto ? "hidden" : "";
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
  }

  ngOnInit(): void {
    this.branchesSrv.getAll(1, 100).subscribe({
      next: (res) => {
        this.sucursales.set(res.data ?? []);
        if (!this.branchId() && res.data?.length) {
          this.branchId.set(res.data[0].id);
          this.cargarTurno();
        }
      },
    });
    this.cargar();
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 4000);
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (u) => {
        this.usuarios.set(u);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisar(e?.error?.message || "No se pudo cargar la lista", "error");
      },
    });
  }

  cargarTurno(): void {
    const b = this.branchId();
    if (!b) return;
    this.srv.enTurno(b, this.hoy()).subscribe({
      next: (t) => this.enTurno.set(t),
    });
  }

  alCambiarSucursal(): void {
    this.cargarTurno();
    // Si hay un horario abierto, se relee: es de la sucursal, no del usuario.
    const u = this.horarioDe();
    if (u) this.abrirHorario(u);
  }

  etiquetaRol(r: string): string {
    return this.roles.find((x) => x.value === r)?.label ?? r;
  }

  nombreSucursal(id: string): string {
    return this.sucursales().find((s) => s.id === id)?.name ?? "—";
  }

  // ─── Alta y edición ─────────────────────────────────────────

  editando = signal<Usuario | null>(null);
  /** Abierto el formulario de datos; en alta el usuario es null. */
  formAbierto = signal(false);
  form = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    scope: "SUCURSAL",
    roles: [] as string[],
    branchIds: [] as string[],
  };

  nuevo(): void {
    this.editando.set(null);
    this.form = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      scope: "SUCURSAL",
      roles: [],
      branchIds: this.branchId() ? [this.branchId()] : [],
    };
    this.formAbierto.set(true);
  }

  editar(u: Usuario): void {
    this.editando.set(u);
    this.form = {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: "",
      phone: u.phone ?? "",
      scope: u.scope,
      roles: [...u.roles],
      branchIds: [...u.branchIds],
    };
    this.formAbierto.set(true);
  }

  cerrarForm(): void {
    this.formAbierto.set(false);
    this.editando.set(null);
  }

  tieneRol(r: string): boolean {
    return this.form.roles.includes(r);
  }

  alternarRol(r: string): void {
    this.form.roles = this.tieneRol(r)
      ? this.form.roles.filter((x) => x !== r)
      : [...this.form.roles, r];
  }

  tieneSucursal(id: string): boolean {
    return this.form.branchIds.includes(id);
  }

  alternarSucursal(id: string): void {
    this.form.branchIds = this.tieneSucursal(id)
      ? this.form.branchIds.filter((x) => x !== id)
      : [...this.form.branchIds, id];
  }

  guardar(): void {
    if (!this.form.firstName.trim() || !this.form.lastName.trim()) {
      this.avisar("Falta el nombre o el apellido", "error");
      return;
    }
    if (!this.form.roles.length) {
      this.avisar("El usuario necesita al menos un rol", "error");
      return;
    }
    if (!this.form.branchIds.length) {
      this.avisar("Asigna al menos una sucursal", "error");
      return;
    }

    this.guardando.set(true);
    const actual = this.editando();
    const listo = () => {
      this.guardando.set(false);
      this.avisar(actual ? "Usuario actualizado" : "Usuario dado de alta");
      this.cerrarForm();
      this.cargar();
      this.cargarTurno();
    };
    const falló = (e: { error?: { message?: string | string[] } }) => {
      this.guardando.set(false);
      const m = e?.error?.message;
      this.avisar(
        Array.isArray(m) ? m[0] : m || "No se pudo guardar",
        "error",
      );
    };

    if (actual) {
      this.srv
        .actualizar(actual.id, {
          firstName: this.form.firstName,
          lastName: this.form.lastName,
          phone: this.form.phone || null,
          scope: this.form.scope as Usuario["scope"],
          roles: this.form.roles,
          branchIds: this.form.branchIds,
        })
        .subscribe({ next: listo, error: falló });
      return;
    }

    if (this.form.password.length < 8) {
      this.guardando.set(false);
      this.avisar("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    this.srv
      .crear({
        firstName: this.form.firstName,
        lastName: this.form.lastName,
        email: this.form.email,
        password: this.form.password,
        roles: this.form.roles,
        scope: this.form.scope,
        branchIds: this.form.branchIds,
      })
      .subscribe({ next: listo, error: falló });
  }

  alternarActivo(u: Usuario): void {
    this.srv.alternarActivo(u.id).subscribe({
      next: () => {
        this.avisar(u.isActive ? "Usuario suspendido" : "Usuario reactivado");
        this.cargar();
      },
      error: (e) =>
        this.avisar(e?.error?.message || "No se pudo cambiar", "error"),
    });
  }

  restablecer(u: Usuario): void {
    const nueva = prompt(
      `Contraseña nueva para ${u.firstName} ${u.lastName} (mínimo 8 caracteres):`,
    );
    if (!nueva) return;
    this.srv.restablecerContrasena(u.id, nueva).subscribe({
      next: () => {
        this.avisar("Contraseña restablecida");
        this.cargar();
      },
      error: (e) =>
        this.avisar(e?.error?.message || "No se pudo restablecer", "error"),
    });
  }

  // ─── Horario ────────────────────────────────────────────────

  horarioDe = signal<Usuario | null>(null);
  agenda = signal<Agenda | null>(null);
  semana = signal<DiaEditable[]>([]);
  ausenciaNueva = {
    startDate: "",
    endDate: "",
    type: "VACATION",
    notes: "",
  };

  abrirHorario(u: Usuario): void {
    this.horarioDe.set(u);
    this.agenda.set(null);
    const b = this.branchId();
    this.srv.agenda(u.id, b).subscribe({
      next: (a) => {
        this.agenda.set(a);
        // El editor muestra la semana entera: los días sin turno se ven
        // desmarcados, que es como se dice "no trabaja" sin ambigüedad.
        this.semana.set(
          this.dias.map((d) => {
            const suyo = a.horarios.find((h) => h.dayOfWeek === d.valor);
            return {
              valor: d.valor,
              nombre: d.nombre,
              corto: d.corto,
              trabaja: !!suyo,
              inicio: suyo?.startTime?.slice(0, 5) ?? a.turnoPorOmision.inicio,
              fin: suyo?.endTime?.slice(0, 5) ?? a.turnoPorOmision.fin,
            };
          }),
        );
      },
      error: () => this.avisar("No se pudo cargar el horario", "error"),
    });
    this.ausenciaNueva = {
      startDate: this.hoy(),
      endDate: this.hoy(),
      type: "VACATION",
      notes: "",
    };
  }

  cerrarHorario(): void {
    this.horarioDe.set(null);
    this.agenda.set(null);
  }

  alternarDia(d: DiaEditable): void {
    this.semana.update((s) =>
      s.map((x) => (x.valor === d.valor ? { ...x, trabaja: !x.trabaja } : x)),
    );
  }

  /** Deja de lunes a viernes en el turno estándar; es el caso más común. */
  semanaEstandar(): void {
    const t = this.agenda()?.turnoPorOmision ?? { inicio: "09:00", fin: "18:00" };
    this.semana.update((s) =>
      s.map((x) => ({
        ...x,
        trabaja: x.valor >= 1 && x.valor <= 5,
        inicio: t.inicio,
        fin: t.fin,
      })),
    );
  }

  guardarHorario(): void {
    const u = this.horarioDe();
    const b = this.branchId();
    if (!u || !b) return;
    const dias: DiaDeTrabajo[] = this.semana()
      .filter((d) => d.trabaja)
      .map((d) => ({
        dayOfWeek: d.valor,
        startTime: d.inicio,
        endTime: d.fin,
      }));

    this.guardando.set(true);
    this.srv.guardarHorario(u.id, b, dias).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(
          dias.length
            ? `Horario de ${u.firstName} guardado`
            : `${u.firstName} queda con el turno por omisión`,
        );
        this.abrirHorario(u);
        this.cargarTurno();
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisar(e?.error?.message || "No se pudo guardar", "error");
      },
    });
  }

  agregarAusencia(): void {
    const u = this.horarioDe();
    const b = this.branchId();
    if (!u || !b) return;
    if (!this.ausenciaNueva.startDate || !this.ausenciaNueva.endDate) {
      this.avisar("Faltan las fechas de la ausencia", "error");
      return;
    }
    this.guardando.set(true);
    this.srv
      .registrarAusencia(u.id, { branchId: b, ...this.ausenciaNueva })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisar("Ausencia registrada");
          this.abrirHorario(u);
          this.cargarTurno();
        },
        error: (e) => {
          this.guardando.set(false);
          this.avisar(e?.error?.message || "No se pudo registrar", "error");
        },
      });
  }

  quitarAusencia(a: Ausencia): void {
    const u = this.horarioDe();
    if (!u) return;
    this.srv.eliminarAusencia(a.id).subscribe({
      next: () => {
        this.avisar("Ausencia eliminada");
        this.abrirHorario(u);
        this.cargarTurno();
      },
      error: () => this.avisar("No se pudo eliminar", "error"),
    });
  }

  etiquetaAusencia(t: string): string {
    return (
      { VACATION: "Vacaciones", SICK_LEAVE: "Incapacidad", OTHER: "Otro" }[t] ??
      t
    );
  }
}
