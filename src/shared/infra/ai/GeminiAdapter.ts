import { GoogleGenAI } from '@google/genai';
import { logger } from '../logger/Logger.ts';
import { ISummarizer } from '../../../modules/documentProcessing/services/ISummarizer.ts';
import { getErrMsg } from '../../utils/utils.ts';

const { GEMINI_API_KEY } = process.env;

if (!GEMINI_API_KEY)
  throw new Error('GEMINI_API_KEY environment variable is required but not defined.');

/**
 * Adapter for interacting with Google Gemini AI API.
 * Implements ISummarizer port from the application layer.
 */
export class GeminiAdapter implements ISummarizer {
  private _ai: GoogleGenAI;

  public constructor() {
    this._ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY!,
    });
  }

  /**
   * Generates a concise summary of the provided text content.
   * @param content The text to summarize.
   * @returns A promise that resolves to the summary string.
   */
  public async summarize(content: string): Promise<string> {
    try {
      logger.info('GeminiAdapter: Requesting summary from Gemini API...');
      
      const prompt = `Please provide a concise summary (max 300 characters) of the following text. The summary MUST be in the same language as the original text:\n\n${content}`;
      
      const response = await this._ai.models.generateContent({
        model: 'gemma-3-27b-it',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      const { text } = response;
      
      logger.info('GeminiAdapter: Successfully generated summary.');
      return text ? text.trim() : '[No summary generated]';
    } catch (e: unknown) {
      const errorMessage = getErrMsg(e);
      logger.error('GeminiAdapter: Error generating summary.', { error: errorMessage });
      return `[Error generating summary: ${errorMessage}]`;
    }
  }
}
