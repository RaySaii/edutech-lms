import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';

export interface TestDatabaseConfig {
  entities?: any[];
  synchronize?: boolean;
  dropSchema?: boolean;
  logging?: boolean;
}

export class TestDatabase {
  private static dataSource: DataSource;
  private static moduleRef: TestingModule;

  static async createTestModule(config: TestDatabaseConfig = {}): Promise<TestingModule> {
    const defaultConfig = {
      synchronize: true,
      dropSchema: true,
      logging: false,
      ...config
    };

    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: defaultConfig.entities || [
            path.join(__dirname, '../../../database/src/entities/*.entity{.ts,.js}')
          ],
          synchronize: defaultConfig.synchronize,
          dropSchema: defaultConfig.dropSchema,
          logging: defaultConfig.logging,
        }),
        TypeOrmModule.forFeature(defaultConfig.entities || []),
      ],
    }).compile();

    this.moduleRef = module;
    this.dataSource = module.get<DataSource>(DataSource);
    
    return module;
  }

  static async seed(seedData: { entity: any; data: any[] }[]): Promise<void> {
    if (!this.dataSource) {
      throw new Error('Test database not initialized. Call createTestModule first.');
    }

    for (const { entity, data } of seedData) {
      const repository = this.dataSource.getRepository(entity);
      await repository.save(data);
    }
  }

  static async cleanup(): Promise<void> {
    if (this.dataSource) {
      await this.dataSource.dropDatabase();
      await this.dataSource.destroy();
    }
    
    if (this.moduleRef) {
      await this.moduleRef.close();
    }
  }

  static getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('Test database not initialized. Call createTestModule first.');
    }
    return this.dataSource;
  }

  static getRepository<T>(entity: any) {
    return this.getDataSource().getRepository<T>(entity);
  }
}

export const testDatabaseConfig = {
  test: {
    type: 'sqlite' as const,
    database: ':memory:',
    synchronize: true,
    dropSchema: true,
    logging: false,
  }
};

export async function createTestingDatabase(entities: any[] = []) {
  return TypeOrmModule.forRoot({
    type: 'sqlite',
    database: ':memory:',
    entities,
    synchronize: true,
    dropSchema: true,
    logging: false,
  });
}