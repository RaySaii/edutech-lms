import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const port = process.env.AUTH_SERVICE_PORT || process.env.PORT || 3003;
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: parseInt(port.toString()),
    },
  });

  await app.listen();
  Logger.log(`🚀 Auth Service is listening on TCP port ${port}`);
}

bootstrap();
