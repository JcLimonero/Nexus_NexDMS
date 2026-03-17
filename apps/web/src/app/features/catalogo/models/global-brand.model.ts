export interface GlobalBrand {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalBrandDto {
  name: string;
  isActive?: boolean;
}
