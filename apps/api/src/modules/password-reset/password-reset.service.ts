import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import {
  PasswordResetToken,
  ResetUserType,
} from './password-reset-token.entity';

/** Vigencia del enlace de recuperación. */
const TTL_MS = 60 * 60 * 1000;

/**
 * Emite y consume tokens de recuperación de contraseña para ambos padrones
 * (tenant y admin). Guarda solo el hash; el token en claro solo viaja en el
 * correo. Un token es de un solo uso y caduca en una hora.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Crea un token para el usuario y devuelve el token en claro (para el correo). */
  async crear(userType: ResetUserType, userId: string): Promise<string> {
    // Invalida los tokens previos sin usar del mismo usuario.
    await this.repo.update(
      { userType, userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    const token = randomBytes(32).toString('hex');
    await this.repo.save(
      this.repo.create({
        userType,
        userId,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + TTL_MS),
      }),
    );
    return token;
  }

  /**
   * Verifica un token y lo marca usado. Devuelve a quién pertenece, o null si
   * es inválido, ya usado o caducado.
   */
  async consumir(
    token: string,
  ): Promise<{ userType: ResetUserType; userId: string } | null> {
    if (!token) return null;
    const row = await this.repo.findOne({
      where: { tokenHash: this.hash(token) },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return null;
    }
    row.usedAt = new Date();
    await this.repo.save(row);
    return { userType: row.userType, userId: row.userId };
  }
}
