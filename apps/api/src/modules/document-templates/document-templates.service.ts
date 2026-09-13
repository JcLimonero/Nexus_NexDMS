import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTemplate } from './entities/document-template.entity';

/** Claves permitidas (evita crear plantillas arbitrarias). */
export const TEMPLATE_KEYS = ['contract-unit-sale'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@Injectable()
export class DocumentTemplatesService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly repo: Repository<DocumentTemplate>,
  ) {}

  esClaveValida(key: string): key is TemplateKey {
    return (TEMPLATE_KEYS as readonly string[]).includes(key);
  }

  /** HTML de la plantilla, o `null` si el cliente no ha definido la suya. */
  async obtenerHtml(tenantId: string, key: string): Promise<string | null> {
    const t = await this.repo.findOne({
      where: { tenantId, templateKey: key },
    });
    const html = t?.html?.trim();
    return html ? html : null;
  }

  async obtener(tenantId: string, key: string) {
    const t = await this.repo.findOne({
      where: { tenantId, templateKey: key },
    });
    return { key, html: t?.html ?? '', updatedAt: t?.updatedAt ?? null };
  }

  async guardar(tenantId: string, key: string, html: string) {
    let t = await this.repo.findOne({ where: { tenantId, templateKey: key } });
    if (!t) {
      t = this.repo.create({ tenantId, templateKey: key, html });
    } else {
      t.html = html;
    }
    const guardado = await this.repo.save(t);
    return { key, html: guardado.html, updatedAt: guardado.updatedAt };
  }
}
