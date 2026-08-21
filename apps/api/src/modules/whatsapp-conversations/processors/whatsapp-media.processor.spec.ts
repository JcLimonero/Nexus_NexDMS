import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { WhatsappMediaService } from '../../whatsapp-core/whatsapp-media.service';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import {
  WhatsappMediaJobPayload,
  WhatsappMediaProcessor,
} from './whatsapp-media.processor';

const PAYLOAD: WhatsappMediaJobPayload = {
  messageId: 'msg-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  conversationId: 'conv-1',
  waMessageId: 'wamid.1',
  mediaId: 'media-1',
  mediaType: 'image',
};

describe('WhatsappMediaProcessor', () => {
  let processor: WhatsappMediaProcessor;
  let media: { download: jest.Mock };
  let messageRepo: { update: jest.Mock };

  beforeEach(async () => {
    media = { download: jest.fn() };
    messageRepo = { update: jest.fn().mockResolvedValue({ affected: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappMediaProcessor,
        { provide: WhatsappMediaService, useValue: media },
        { provide: getRepositoryToken(WhatsappMessage), useValue: messageRepo },
      ],
    }).compile();

    processor = module.get(WhatsappMediaProcessor);
  });

  const job = (data = PAYLOAD) => ({ data }) as Job<WhatsappMediaJobPayload>;

  it('guarda la key en el mensaje cuando la descarga sale bien', async () => {
    media.download.mockResolvedValue('whatsapp/tenant-1/conv-1/wamid.1.jpg');

    await processor.process(job());

    expect(media.download).toHaveBeenCalledWith(PAYLOAD);
    expect(messageRepo.update).toHaveBeenCalledWith(
      { id: 'msg-1' },
      { attachmentKey: 'whatsapp/tenant-1/conv-1/wamid.1.jpg' },
    );
  });

  it('sin key no toca el mensaje: se queda con attachmentType y sin attachmentKey', async () => {
    media.download.mockResolvedValue(null);

    await processor.process(job());

    expect(messageRepo.update).not.toHaveBeenCalled();
  });

  it('deja salir el error si la descarga falla: la reintenta BullMQ', async () => {
    media.download.mockRejectedValue(new Error('B2 no responde'));

    await expect(processor.process(job())).rejects.toThrow('B2 no responde');
    expect(messageRepo.update).not.toHaveBeenCalled();
  });
});
