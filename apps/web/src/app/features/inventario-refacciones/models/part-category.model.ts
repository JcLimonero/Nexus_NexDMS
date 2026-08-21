export interface PartCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartCategoriesResponse {
  data: PartCategory[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PartCategoryFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePartCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}
