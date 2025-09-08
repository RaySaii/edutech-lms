import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentController } from './content.controller';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'CONTENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('CONTENT_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('CONTENT_SERVICE_PORT', '3004'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [ContentController],
})
export class ContentModule {}
