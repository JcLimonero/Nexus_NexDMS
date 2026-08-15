import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { REQUIRES_MODULE } from '../modules/modules.module';
import { RoleEnum } from '../users/entities/user.entity';
import {
  MODULE_REGISTRY,
  getModule,
} from '../modules/module-registry';

export interface RouteOperation {
  method: string;
  path: string;
  module: string | null;
  roles: string[];
}

export interface RoleAccess {
  role: string;
  modules: { key: string; name: string }[];
  operationCount: number;
  operations: { method: string; path: string; module: string | null }[];
}

export interface RoleMap {
  generatedAt: string;
  /** Roles del sistema, cada uno con lo que alcanza según las rutas. */
  roles: RoleAccess[];
  /** Operaciones sin `@Roles`: cualquier usuario autenticado las alcanza. */
  openOperations: { method: string; path: string; module: string | null }[];
  /** Módulos con al menos una ruta protegida y los roles que los tocan. */
  modules: { key: string; name: string; roles: string[] }[];
}

const PREFIX = 'api/v1';

/**
 * Deriva a qué llega cada rol recorriendo los controladores de Nest y leyendo
 * la metadata real de `@Roles` y `@RequiresModule`, en vez de una tabla a mano
 * que se desincroniza. Es el cimiento del catálogo de roles y de los roles a
 * medida por cliente.
 */
@Injectable()
export class RoleMapService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /** Todas las operaciones HTTP declaradas, con sus roles y módulo. */
  private recolectarOperaciones(): RouteOperation[] {
    const operaciones: RouteOperation[] = [];
    const controllers = this.discovery.getControllers();

    for (const wrapper of controllers) {
      const metatype = wrapper.metatype;
      if (!metatype || !wrapper.instance) continue;

      const basePath = this.normalizarSegmento(
        (Reflect.getMetadata(PATH_METADATA, metatype) as string) ?? '',
      );
      const classRoles = this.reflector.get<string[]>(ROLES_KEY, metatype);
      const classModule = this.reflector.get<string>(REQUIRES_MODULE, metatype);

      const prototype = Object.getPrototypeOf(wrapper.instance);
      const methodNames = this.scanner.getAllMethodNames(prototype);

      for (const methodName of methodNames) {
        const handler = prototype[methodName];
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          | number
          | undefined;
        // Sin verbo HTTP no es un endpoint (hooks, helpers privados, etc.).
        if (httpMethod === undefined) continue;

        const methodPath = this.normalizarSegmento(
          (Reflect.getMetadata(PATH_METADATA, handler) as string) ?? '',
        );
        const roles =
          this.reflector.get<string[]>(ROLES_KEY, handler) ?? classRoles ?? [];
        const modulo =
          this.reflector.get<string>(REQUIRES_MODULE, handler) ??
          classModule ??
          null;

        operaciones.push({
          method: RequestMethod[httpMethod] ?? String(httpMethod),
          path: this.unirRuta(basePath, methodPath),
          module: modulo,
          roles,
        });
      }
    }

    operaciones.sort((a, b) => a.path.localeCompare(b.path));
    return operaciones;
  }

  build(): RoleMap {
    const operaciones = this.recolectarOperaciones();

    const roles = Object.values(RoleEnum);
    const rolesAcceso: RoleAccess[] = roles.map((role) => {
      // Un rol alcanza una operación si es abierta o si lo incluye @Roles.
      const alcanzables = operaciones.filter(
        (op) => op.roles.length === 0 || op.roles.includes(role),
      );
      const moduleKeys = [
        ...new Set(
          alcanzables
            .map((op) => op.module)
            .filter((m): m is string => m !== null),
        ),
      ].sort();
      return {
        role,
        modules: moduleKeys.map((key) => ({
          key,
          name: getModule(key)?.name ?? key,
        })),
        operationCount: alcanzables.length,
        operations: alcanzables.map((op) => ({
          method: op.method,
          path: op.path,
          module: op.module,
        })),
      };
    });

    const openOperations = operaciones
      .filter((op) => op.roles.length === 0)
      .map((op) => ({ method: op.method, path: op.path, module: op.module }));

    // Por módulo, qué roles lo tocan (solo rutas con @Roles restringido).
    const porModulo = new Map<string, Set<string>>();
    for (const op of operaciones) {
      if (!op.module || op.roles.length === 0) continue;
      const set = porModulo.get(op.module) ?? new Set<string>();
      op.roles.forEach((r) => set.add(r));
      porModulo.set(op.module, set);
    }
    const modules = MODULE_REGISTRY.filter((m) => porModulo.has(m.key)).map(
      (m) => ({
        key: m.key,
        name: m.name,
        roles: [...(porModulo.get(m.key) ?? [])].sort(),
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      roles: rolesAcceso,
      openOperations,
      modules,
    };
  }

  /** Quita barras sobrantes de un segmento de ruta. */
  private normalizarSegmento(seg: string): string {
    return seg.replace(/^\/+|\/+$/g, '');
  }

  private unirRuta(base: string, method: string): string {
    return (
      '/' +
      [PREFIX, base, method]
        .filter((s) => s.length > 0)
        .join('/')
        .replace(/\/+/g, '/')
    );
  }
}
