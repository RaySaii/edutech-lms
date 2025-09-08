import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ContentService');
  
  const host = process.env.CONTENT_SERVICE_HOST || 'localhost';
  const port = parseInt(process.env.CONTENT_SERVICE_PORT || process.env.PORT || '3004', 10);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  await app.listen();
  logger.log(`🚀 Content Service is listening on ${host}:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Content Service:', error);
  process.exit(1);
});
