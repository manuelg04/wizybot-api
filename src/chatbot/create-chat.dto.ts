/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'User input for the chatbot',
    example: 'I am looking for a phone',
  })
  userEnquiry: string;
}
