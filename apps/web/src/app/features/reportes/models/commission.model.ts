export enum CommissionPeriodStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PAID = "PAID",
}

export enum CommissionPeriodType {
  BIWEEKLY = "BIWEEKLY",
  MONTHLY = "MONTHLY",
}

export enum CommissionDetailStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface CommissionDetail {
  id: string;
  periodId: string;
  userId: string;
  referenceId: string;
  referenceType: string;
  concept: string;
  baseAmount: number;
  amount: number;
  status: CommissionDetailStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

export interface CommissionPeriod {
  id: string;
  tenantId: string;
  branchId: string;
  periodDate: string;
  type: CommissionPeriodType;
  status: CommissionPeriodStatus;
  approverId: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
  approver?: { id: string; firstName: string; lastName: string };
  details?: CommissionDetail[];
}

export interface CommissionPeriodFilters {
  branchId?: string;
  status?: CommissionPeriodStatus;
  type?: CommissionPeriodType;
  page?: number;
  limit?: number;
}

export interface CommissionPeriodsResponse {
  data: CommissionPeriod[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateCommissionPeriodDto {
  branchId: string;
  periodDate: string;
  type: CommissionPeriodType;
}
