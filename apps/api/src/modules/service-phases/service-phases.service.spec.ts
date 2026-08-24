import { NotFoundException } from '@nestjs/common';
import { ServicePhasesService } from './service-phases.service';
import { PhaseStatusEnum } from './entities/service-phase.entities';

/**
 * IDOR — la fase no lleva tenant; se valida contra la orden a la que pertenece.
 * Un usuario de otra empresa no puede cambiar de estado / reasignar fases de
 * órdenes que no son suyas.
 */
describe('ServicePhasesService — fase acotada al tenant (IDOR)', () => {
  const phaseRepo = { findOne: jest.fn(), save: jest.fn() };
  const orderRepo = { findOne: jest.fn() };
  // Orden del constructor: kitPhaseRepo, phaseRepo, orderRepo, kitRepo, userRepo, availability
  const svc = new (ServicePhasesService as unknown as {
    new (...a: unknown[]): ServicePhasesService;
  })({}, phaseRepo, orderRepo, {}, {}, {});

  beforeEach(() => jest.clearAllMocks());

  it('cambiarEstado bloquea una fase cuya orden no es del tenant', async () => {
    phaseRepo.findOne.mockResolvedValue({ id: 'f1', serviceOrderId: 'o1' });
    orderRepo.findOne.mockResolvedValue(null); // la orden no es del tenant
    await expect(
      svc.cambiarEstado('f1', PhaseStatusEnum.EN_CURSO, null, 'tenant-atacante'),
    ).rejects.toThrow(NotFoundException);
    expect(phaseRepo.save).not.toHaveBeenCalled();
  });

  it('asignar bloquea una fase de otra empresa', async () => {
    phaseRepo.findOne.mockResolvedValue({ id: 'f1', serviceOrderId: 'o1' });
    orderRepo.findOne.mockResolvedValue(null);
    await expect(svc.asignar('f1', 'u9', 'tenant-atacante')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('cambiarEstado procede cuando la orden sí es del tenant', async () => {
    phaseRepo.findOne.mockResolvedValue({ id: 'f1', serviceOrderId: 'o1' });
    orderRepo.findOne.mockResolvedValue({ id: 'o1', tenantId: 't1' });
    phaseRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    await expect(
      svc.cambiarEstado('f1', PhaseStatusEnum.PENDIENTE, undefined, 't1'),
    ).resolves.toBeDefined();
    expect(phaseRepo.save).toHaveBeenCalled();
  });
});
