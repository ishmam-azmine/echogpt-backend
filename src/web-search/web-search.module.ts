import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { WebSearchController } from './web-search.controller.js';
import { WebSearchService } from './web-search.service.js';

@Module({
  imports: [SubscriptionsModule],
  controllers: [WebSearchController],
  providers: [WebSearchService],
})
export class WebSearchModule {}
