import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { CourseController } from './course.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'COURSE_SERVICE',
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('COURSE_SERVICE_HOST', 'localhost'),
            port: configService.get('COURSE_SERVICE_PORT', 3002),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CourseController],
})
export class CourseModule {}