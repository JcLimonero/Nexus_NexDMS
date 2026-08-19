import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/vehicle-history";

/** Un tramo en el que un cliente tuvo el vehículo. */
export interface Dueno {
  id: string;
  clientId: string;
  cliente: string;
  desde: string;
  hasta: string | null;
  actual: boolean;
  origen: string;
  notas: string | null;
}

export interface ServicioDelVehiculo {
  id: string;
  folio: string;
  fecha: string;
  estado: string;
  kmEntrada: number | null;
  total: number;
  cliente: string;
  /** El servicio fue de un dueño anterior, no del actual. */
  deDuenoAnterior: boolean;
}

export interface FichaVehiculo {
  vehiculo: {
    id: string;
    descripcion: string;
    placa: string | null;
    vin: string | null;
    color: string | null;
    km: number;
    ownerId: string;
  };
  duenos: Dueno[];
  servicios: ServicioDelVehiculo[];
  resumen: {
    servicios: number;
    duenos: number;
    gastoTotal: number;
    ultimoServicio: string | null;
  };
}

export interface VehiculoDelCliente {
  vehicleId: string;
  descripcion: string;
  placa: string | null;
  vin: string | null;
  desde: string;
  hasta: string | null;
  actual: boolean;
  servicios: number;
}

@Injectable({ providedIn: "root" })
export class RelacionesService {
  private http = inject(HttpClient);

  vehiculosDelCliente(clientId: string): Observable<VehiculoDelCliente[]> {
    return this.http.get<VehiculoDelCliente[]>(`${URL}/cliente/${clientId}`);
  }

  fichaDelVehiculo(vehicleId: string): Observable<FichaVehiculo> {
    return this.http.get<FichaVehiculo>(`${URL}/vehiculo/${vehicleId}`);
  }

  traspasar(
    vehicleId: string,
    dto: { clientId: string; fecha?: string; notas?: string },
  ): Observable<Dueno[]> {
    return this.http.post<Dueno[]>(
      `${URL}/vehiculo/${vehicleId}/traspasar`,
      dto,
    );
  }
}
