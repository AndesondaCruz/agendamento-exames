import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * O guard do pacote já faz a contagem e responde 429. Aqui só falta o
 * cabeçalho: com mais de um balde, o pacote nomeia o cabeçalho com sufixo
 * ("Retry-After-lookup"), que nenhum cliente HTTP entende. Emitimos o
 * "Retry-After" padrão (em segundos), que o navegador e as bibliotecas usam.
 *
 * O corpo do erro sai no formato único da API pelo AllExceptionsFilter
 * (code TOO_MANY_REQUESTS).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    this.setResponseHeader(res, 'Retry-After', detail.timeToBlockExpire);
    await super.throwThrottlingException(context, detail);
  }
}
