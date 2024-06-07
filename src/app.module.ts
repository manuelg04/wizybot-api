/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatbotController } from './chatbot/chatbot.controller';
import { ChatbotService } from './chatbot/chatbot.service';
import { ConfigModule } from '@nestjs/config';
import { ChatbotModule } from './chatbot/chatbot.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ChatbotModule,
  ],
  controllers: [AppController, ChatbotController],
  providers: [
    AppService, 
    ChatbotService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    }
  ],
})
export class AppModule {}
