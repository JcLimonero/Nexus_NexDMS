export enum CashSessionStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

export interface CashSession {
  id: string;
  tenantId: string;
  branchId: string;
  userId: string;
  openingBalance: number;
  closingBalance: number | null;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalSales: number;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  status: CashSessionStatus;
  closingNotes: string | null;
  denominations: Record<string, number> | null;
  countedCash: number | null;
  expectedCash: number | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string };
}

export interface CashSessionsResponse {
  data: CashSession[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CashSessionFilters {
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface OpenCashSessionDto {
  branchId: string;
  openingBalance: number;
}

export interface CloseCashSessionDto {
  closingBalance?: number;
  denominations?: Record<string, number>;
  closingNotes?: string;
}

export interface MovimientoCaja {
  id: string;
  kind: "DEPOSIT" | "WITHDRAWAL" | "EXPENSE";
  amount: number;
  concept: string;
  reference: string | null;
  createdAt: string;
}
