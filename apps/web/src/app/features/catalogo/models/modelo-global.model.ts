export interface VehicleType {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface CombustionType {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface GlobalModel {
  id: string;
  brandName: string;
  vehicleTypeId: string;
  vehicleType?: VehicleType;
  model: string;
  version: string | null;
  year: number;
  combustionTypeId: string | null;
  combustionType?: CombustionType | null;
  displacement: number | null;
  doorCount: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface GlobalModelsResponse {
  data: GlobalModel[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateGlobalModelDto {
  brandName: string;
  vehicleTypeId: string;
  model: string;
  version?: string;
  year: number;
  combustionTypeId?: string;
  displacement?: number;
  doorCount?: number;
  isActive?: boolean;
}

export interface FilterGlobalModels {
  brandName?: string;
  vehicleTypeId?: string;
  year?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
