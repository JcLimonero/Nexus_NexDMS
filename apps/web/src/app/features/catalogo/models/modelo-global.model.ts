export interface VehicleType {
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
  brandId: string;
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
  brandId?: string;
  vehicleTypeId?: string;
  year?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
