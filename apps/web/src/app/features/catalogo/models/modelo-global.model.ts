export interface VehicleType {
  id: string;
  categoryId?: string;
  code: string;
  label: string;
}

export interface VehicleCategory {
  id: string;
  code: string;
  label: string;
}

export interface CombustionType {
  id: string;
  code: string;
  label: string;
}

import type { GlobalBrand } from "./global-brand.model";

export interface GlobalModel {
  id: string;
  brandId: string;
  brand?: GlobalBrand;
  vehicleTypeId: string;
  vehicleType?: VehicleType;
  model: string;
  version: string;
  year: number;
  combustionTypeId: string | null;
  combustionType?: CombustionType | null;
  displacement: number | null;
  doorCount: number | null;
  passengerCount: number | null;
  exteriorColorId: string | null;
  interiorColorId: string | null;
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
  brandId: string;
  vehicleTypeId: string;
  model: string;
  version: string;
  year: number;
  combustionTypeId?: string;
  displacement?: number;
  doorCount?: number;
  passengerCount?: number;
  exteriorColorId?: string;
  interiorColorId?: string;
  isActive?: boolean;
}

export interface FilterGlobalModels {
  search?: string;
  brandId?: string;
  vehicleTypeId?: string;
  year?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
