import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import {
  SearchIndex,
  SearchQuery,
  SearchResultClick,
  SearchSuggestion,
  SearchFilter,
  SearchAnalytics,
  SearchPersonalization,
  User,
  Course,
  Content,
  Organization,
} from '@edutech-lms/database';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AdvancedSearchController } from './advanced-search.controller';
import { AdvancedSearchService } from './advanced-search.service';
import { SearchIndexingProcessor } from './search-indexing.processor';
import { SearchAnalyticsProcessor } from './search-analytics.processor';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      SearchIndex,
      SearchQuery,
      SearchResultClick,
      SearchSuggestion,
      SearchFilter,
      SearchAnalytics,
      SearchPersonalization,
      User,
      Course,
      Content,
      Organization,
    ]),
    ElasticsearchModule.registerAsync({
      useFactory: () => ({
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
        auth: process.env.ELASTICSEARCH_AUTH ? {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        } : undefined,
        maxRetries: 3,
        requestTimeout: 60000,
        pingTimeout: 60000,
        sniffOnStart: false,
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'search-indexing',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
      },
      {
        name: 'search-analytics',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
      }
    ),
    ScheduleModule.forRoot(),
  ],
  controllers: [SearchController, AdvancedSearchController],
  providers: [
    SearchService,
    AdvancedSearchService,
    SearchIndexingProcessor,
    SearchAnalyticsProcessor,
  ],
  exports: [SearchService, AdvancedSearchService],
})
export class SearchModule {}