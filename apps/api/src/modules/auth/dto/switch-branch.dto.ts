import { IsUUID } from 'class-validator';

export class SwitchBranchDto {
  @IsUUID()
  branchId: string;
}
