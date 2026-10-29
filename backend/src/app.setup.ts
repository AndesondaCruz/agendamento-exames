import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { createValidationPipe } from './common/http/validation.pipe.js';

export const API_PREFIX = 'api';

/**
 * Configuração HTTP da aplicação, compartilhada entre main.ts e os testes
 * e2e. Assim os testes exercitam EXATAMENTE os mesmos pipes, filtros e
 * prefixo que rodam em produção.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet()); // cabeçalhos de segurança (X-Content-Type-Options, HSTS, etc.)
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks(); // fecha conexões do banco ao receber SIGTERM (Docker/deploy)

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Agendamento de Exames')
      .setDescription(
        'API de busca de exames, consulta de agenda e agendamento. ' +
          'Horários no fuso da clínica (America/Sao_Paulo). ' +
          'Erros seguem um formato único com `code` estável.',
      )
      .setVersion('1.0.0')
      .build(),
  );
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
}
