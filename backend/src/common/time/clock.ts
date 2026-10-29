import { Injectable } from '@nestjs/common';

/**
 * Abstração do relógio.
 *
 * Regras como "sem passado" dependem do instante atual. Se o código chamasse
 * `new Date()` diretamente, os testes ficariam presos ao dia em que rodam.
 * Injetando um Clock, os testes trocam por um relógio fixo e viram
 * determinísticos (mesmo resultado hoje, amanhã e no CI).
 */
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

/** Relógio parado num instante; usado em testes. */
export class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant);
  }
}
