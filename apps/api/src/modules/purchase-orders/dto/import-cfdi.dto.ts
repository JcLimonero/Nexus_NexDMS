import { IsString, IsUUID, MinLength } from 'class-validator';

/** Importa una orden de compra desde el XML del CFDI del proveedor. */
export class ImportCfdiDto {
  @IsUUID()
  branchId: string;

  /** Contenido del XML del CFDI (texto). */
  @IsString()
  @MinLength(20)
  xml: string;
}
