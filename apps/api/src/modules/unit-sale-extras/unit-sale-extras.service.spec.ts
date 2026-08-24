import { NotFoundException } from '@nestjs/common';
import { UnitSaleExtrasService } from './unit-sale-extras.service';
import { UnitSaleStatusEnum } from '../unit-sales/entities/unit-sale.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

/**
 * IDOR — un extra debe pertenecer a la venta (ya validada por tenant); no se
 * puede editar/borrar un extra de otra empresa conociendo su id.
 */
describe('UnitSaleExtrasService — propiedad del extra (IDOR)', () => {
  const extraRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const svc = new (UnitSaleExtrasService as unknown as {
    new (r: unknown): UnitSaleExtrasService;
  })(extraRepo);
  const user = { roles: ['ADMIN'] } as unknown as UserPayload;

  beforeEach(() => jest.clearAllMocks());

  it('update rechaza un extra que pertenece a OTRA venta', async () => {
    extraRepo.findOne.mockResolvedValue({ id: 'e1', unitSaleId: 'venta-ajena' });
    await expect(
      svc.update(user, 'e1', 'mi-venta', UnitSaleStatusEnum.IN_PROGRESS, {}),
    ).rejects.toThrow(NotFoundException);
    expect(extraRepo.update).not.toHaveBeenCalled();
  });

  it('delete rechaza un extra que pertenece a OTRA venta', async () => {
    extraRepo.findOne.mockResolvedValue({ id: 'e1', unitSaleId: 'venta-ajena' });
    await expect(
      svc.delete(user, 'e1', 'mi-venta', UnitSaleStatusEnum.IN_PROGRESS),
    ).rejects.toThrow(NotFoundException);
    expect(extraRepo.delete).not.toHaveBeenCalled();
  });

  it('update procede cuando el extra sí es de la venta', async () => {
    extraRepo.findOne.mockResolvedValue({ id: 'e1', unitSaleId: 'mi-venta' });
    extraRepo.update.mockResolvedValue({});
    await expect(
      svc.update(user, 'e1', 'mi-venta', UnitSaleStatusEnum.IN_PROGRESS, {
        cost: 100,
      }),
    ).resolves.toBeDefined();
    expect(extraRepo.update).toHaveBeenCalled();
  });
});
