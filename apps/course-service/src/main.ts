import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const port = process.env.COURSE_SERVICE_PORT || 3002;
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: parseInt(port.toString()),
    },
  });

  await app.listen();
  Logger.log(`🚀 Course Service is listening on port ${port}`);
}

bootstrap();
