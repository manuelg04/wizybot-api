/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { CreateChatDto } from './create-chat.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @ApiOperation({ summary: 'Chat with the chatbot' })
  @ApiResponse({ status: 200, description: 'The chat response', type: String })
  async chat(@Body() createChatDto: CreateChatDto) {
    const { userEnquiry } = createChatDto;
    return await this.chatbotService.handleChat(userEnquiry);
  }
}
