import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const port = process.env.AUTH_SERVICE_PORT || 3003;
  const host = process.env.AUTH_SERVICE_HOST || 'localhost';
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host,
      port: parseInt(port.toString()),
    },
  });

  await app.listen();
  Logger.log(`🚀 Auth Service is listening on ${host}:${port}`);
}

bootstrap();
