import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { StripPasswordInterceptor } from './interceptors/strip-password.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { AppLogger, getLogLevels } from './logger/app-logger.service';

async function bootstrap() {
  const logLevel = process.env.LOG_LEVEL ?? 'log';

  const appLogger = new AppLogger('Bootstrap', {
    logLevels: getLogLevels(logLevel),
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(appLogger);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new StripPasswordInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('The Knowledge Hub API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  appLogger.log(`Application listening on port ${port}`);
}
bootstrap();
