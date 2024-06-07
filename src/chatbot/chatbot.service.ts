/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY_WIZZYBOT'),
    });
  }

  /**
   * Handles the chat by interacting with the OpenAI API.
   * @param userEnquiry - The user's enquiry.
   * @returns The final response from the assistant.
   */
  async handleChat(userEnquiry: string): Promise<string> {
    const initialPrompt = `A user asks: ${userEnquiry}. You have the following functions available: searchProducts(query), convertCurrencies(amount, fromCurrency, toCurrency). Indicate which function you want to use to solve the user's enquiry. Always use the appropriate function and provide the result in JSON format.`;

    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0613',
        messages: [
          { role: 'system', content: 'You are a helpful assistant chatbot. You can call functions to get additional information. Always return results in JSON format.' },
          { role: 'user', content: initialPrompt },
        ],
        functions: [
          {
            name: 'searchProducts',
            description: 'Retrieve a selection of 2 items from the product list related to the query',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
              },
              required: ['query'],
            },
          },
          {
            name: 'convertCurrencies',
            description: 'Convert a price from one currency to another',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                fromCurrency: { type: 'string' },
                toCurrency: { type: 'string' },
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
          },
        ],
        function_call: 'auto',
      });
    } catch (error) {
      console.error('Error fetching from OpenAI:', error);
      throw new HttpException('Error fetching from OpenAI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const messageContent = response.choices[0].message;

    if (messageContent.function_call) {
      const functionCall = messageContent.function_call;
      const args = JSON.parse(functionCall.arguments);

      let result;
      if (functionCall.name === 'searchProducts') {
        result = await this.searchProducts(args.query);
      } else if (functionCall.name === 'convertCurrencies') {
        result = await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency);
      }

      const finalPrompt = `A user asks: ${userEnquiry}. You have the following functions available: searchProducts(query), convertCurrencies(amount, fromCurrency, toCurrency). You chose to execute the function ${functionCall.name} but do not tell me what function should you use. The result was: ${result}. Formulate a final response.`;

      let finalResponse;
      try {
        finalResponse = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo-0613',
          messages: [
            { role: 'system', content: 'You are a helpful assistant chatbot.' },
            { role: 'user', content: finalPrompt },
          ],
        });
      } catch (error) {
        console.error('Error fetching final response from OpenAI:', error);
        throw new HttpException('Error fetching final response from OpenAI', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return finalResponse.choices[0].message.content;
    } else {
      return messageContent.content;
    }
  }

  /**
   * Searches for products related to the query in the CSV products file.
   * @param query - The search query.
   * @returns A promise that resolves to a JSON string of the filtered products as requested in tests.
   */
  async searchProducts(query: string): Promise<string> {
    try {
      const products = await this.readCSVFile('data/products_list.csv');
      const filteredProducts = this.filterProducts(products, query);
      return JSON.stringify(filteredProducts.slice(0, 2));
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw new HttpException('Error reading CSV file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Filters products based on the query.
   * @param products - The array of products.
   * @param query - The search query.
   * @returns An array of filtered products.
   */
  private filterProducts(products: any[], query: string): any[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return products.filter(product => {
      const combinedText = `${product.displayTitle} ${product.embeddingText} ${product.productType}`.toLowerCase();
      return queryTerms.some(term => combinedText.includes(term));
    });
  }

  /**
   * Reads and parses the CSV file.
   * @param filePath - The path to the CSV products file.
   * @returns A promise that resolves to an array of products.
   */
  private readCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const products = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => products.push(data))
        .on('end', () => resolve(products))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Converts an amount from one currency to another.
   * @param amount - The amount to convert.
   * @param fromCurrency - The currency to convert from.
   * @param toCurrency - The currency to convert to.
   * @returns A promise that resolves to a string of the converted amount with the target currency.
   */
  async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPEN_EXCHANGE_API_KEY');
    if (!apiKey) {
      throw new HttpException('Open Exchange Rates API key is missing', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
      const rates = response.data.rates;
      const convertedAmount = (amount / rates[fromCurrency]) * rates[toCurrency];
      return `${convertedAmount} ${toCurrency}`;
    } catch (error) {
      console.error('Error fetching currency data:', error.response ? error.response.data : error.message);
      throw new HttpException('Error fetching currency data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
