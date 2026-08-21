import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappRoutingService } from './whatsapp-routing.service';
import { StorageService } from '../../common/storage/storage.service';
import { WhatsappMediaService } from './whatsapp-media.service';
import { fetchWithRetry } from '../../common/http/retry.util';

// Se mockea `fetchWithRetry` en vez de `global.fetch`: así la prueba no paga
// los reintentos de verdad (el propio util espera con backoff exponencial
// antes de rendirse en un 5xx) y controla la respuesta de cada paso —consulta
// del media y descarga del binario— por separado.
jest.mock('../../common/http/retry.util');
const fetchWithRetryMock = fetchWithRetry as jest.MockedFunction<
  typeof fetchWithRetry
>;

const PARAMS = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  conversationId: 'conv-1',
  waMessageId: 'wamid.1',
  mediaId: 'media-1',
  mediaType: 'image' as const,
};

/** Una `Response` de `fetch` mínima, con lo que el servicio de verdad usa. */
const fakeResponse = (
  over: Partial<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    arrayBuffer: () => Promise<ArrayBuffer>;
  }> = {},
) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    ...over,
  }) as Response;

const mockMetaInfo = (over: Record<string, unknown> = {}) =>
  fakeResponse({
    json: () =>
      Promise.resolve({
        url: 'https://meta.example/media-real',
        mime_type: 'image/jpeg',
        file_size: 1024,
        ...over,
      }),
  });

const mockBinary = (bytes = 1024) =>
  fakeResponse({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)) });

describe('WhatsappMediaService', () => {
  let service: WhatsappMediaService;
  let routing: { credentialsFor: jest.Mock };
  let storage: { upload: jest.Mock };

  beforeEach(async () => {
    routing = {
      credentialsFor: jest
        .fn()
        .mockResolvedValue({ phoneNumberId: '123', token: 'tok' }),
    };
    storage = { upload: jest.fn().mockResolvedValue('key') };
    fetchWithRetryMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappMediaService,
        { provide: WhatsappRoutingService, useValue: routing },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(WhatsappMediaService);
  });

  it('sube el archivo a B2 con la key whatsapp/{tenant}/{conversación}/{mensaje}.{ext}', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(mockMetaInfo())
      .mockResolvedValueOnce(mockBinary());

    const key = await service.download(PARAMS);

    expect(key).toBe('whatsapp/tenant-1/conv-1/wamid.1.jpg');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      'whatsapp/tenant-1/conv-1/wamid.1.jpg',
      'image/jpeg',
    );
  });

  it('pide la url temporal y el binario con el Bearer de la sucursal', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(mockMetaInfo())
      .mockResolvedValueOnce(mockBinary());

    await service.download(PARAMS);

    expect(fetchWithRetryMock).toHaveBeenNthCalledWith(
      1,
      'https://graph.facebook.com/v18.0/media-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
    expect(fetchWithRetryMock).toHaveBeenNthCalledWith(
      2,
      'https://meta.example/media-real',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('sin credenciales de la sucursal, no intenta nada', async () => {
    routing.credentialsFor.mockResolvedValue(null);

    const key = await service.download(PARAMS);

    expect(key).toBeNull();
    expect(fetchWithRetryMock).not.toHaveBeenCalled();
  });

  it('rechaza un tipo MIME fuera de la lista blanca del tipo declarado', async () => {
    fetchWithRetryMock.mockResolvedValueOnce(
      mockMetaInfo({ mime_type: 'application/zip' }),
    );

    const key = await service.download(PARAMS);

    expect(key).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rechaza el archivo si Meta ya avisó que excede el tope del tipo', async () => {
    fetchWithRetryMock.mockResolvedValueOnce(
      mockMetaInfo({ file_size: 6 * 1024 * 1024 }), // > 5 MB de imagen
    );

    const key = await service.download(PARAMS);

    expect(key).toBeNull();
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1); // ni se intenta bajar el binario
  });

  it('rechaza el archivo si el tamaño real (ya descargado) excede el tope', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(mockMetaInfo({ file_size: undefined }))
      .mockResolvedValueOnce(mockBinary(6 * 1024 * 1024));

    const key = await service.download(PARAMS);

    expect(key).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('un 4xx de Meta al consultar el media es un fallo permanente: no revienta', async () => {
    fetchWithRetryMock.mockResolvedValueOnce(
      fakeResponse({ ok: false, status: 404 }),
    );

    await expect(service.download(PARAMS)).resolves.toBeNull();
  });

  it('un 5xx de Meta se deja salir como excepción para que la cola reintente', async () => {
    fetchWithRetryMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 503 }),
    );

    await expect(service.download(PARAMS)).rejects.toThrow();
  });

  it('un fallo al subir a B2 se deja salir como excepción para que la cola reintente', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(mockMetaInfo())
      .mockResolvedValueOnce(mockBinary());
    storage.upload.mockRejectedValue(new Error('B2 no responde'));

    await expect(service.download(PARAMS)).rejects.toThrow('B2 no responde');
  });

  it('audio y documento respetan la lista blanca de su propia categoría', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(mockMetaInfo({ mime_type: 'application/pdf' }))
      .mockResolvedValueOnce(mockBinary());

    const key = await service.download({ ...PARAMS, mediaType: 'document' });

    expect(key).toBe('whatsapp/tenant-1/conv-1/wamid.1.pdf');
  });
});
