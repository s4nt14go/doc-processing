/**
 * Interface for AI-powered text summarization.
 * This port decouples the domain logic from specific AI providers.
 */
export interface ISummarizer {
  /**
   * Generates a concise summary of the provided text.
   * @param content The text content to analyze.
   * @returns A promise that resolves to the summary string.
   */
  summarize(content: string): Promise<string>;
}
