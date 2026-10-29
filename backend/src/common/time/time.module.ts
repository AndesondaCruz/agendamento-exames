import { Global, Module } from '@nestjs/common';
import { Clock, SystemClock } from './clock.js';

/**
 * @Global: qualquer service injeta `Clock` sem importar este módulo.
 * Nos testes, `overrideProvider(Clock).useValue(new FixedClock(...))`.
 */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class TimeModule {}
