import { seconds } from '@nestjs/throttler';

/**
 * Cuotas de peticiones, más holgadas fuera de producción.
 *
 * En desarrollo el límite estorba más de lo que protege: recargar una
 * pantalla que hace varias llamadas, o probar el acceso con dos cuentas
 * seguidas, basta para agotarlo, y el 429 se confunde con un fallo del
 * sistema. En producción es lo contrario —es la primera defensa contra
 * quien prueba contraseñas— así que ahí no se toca.
 *
 * `NODE_ENV` distinto de `production` cuenta como desarrollo: un despliegue
 * real siempre lo declara, y equivocarse hacia el lado estricto es preferible
 * a dejar producción abierta por una variable sin poner.
 */
const EN_PRODUCCION = process.env.NODE_ENV === 'production';

/**
 * Intentos de acceso por minuto.
 *
 * Se cuentan por dirección IP, no por cuenta: en el login todavía no hay
 * sesión que identificar. Por eso en una demo, donde varias personas entran
 * a la vez desde la misma red, cinco se agotan enseguida.
 */
export const LIMITE_ACCESO = {
  medium: {
    limit: EN_PRODUCCION ? 5 : 50,
    ttl: seconds(60),
  },
};

/** Cuotas generales de la API, para todo lo que no sea el acceso. */
export const LIMITES_GENERALES = [
  { name: 'short', ttl: seconds(1), limit: EN_PRODUCCION ? 30 : 300 },
  { name: 'medium', ttl: seconds(60), limit: EN_PRODUCCION ? 120 : 1200 },
  { name: 'long', ttl: seconds(60), limit: EN_PRODUCCION ? 300 : 3000 },
];
