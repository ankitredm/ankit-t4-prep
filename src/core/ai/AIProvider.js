/** @typedef {{ sendMessage: Function, generateStoryResponse: Function, summarizeMemory: Function, healthCheck: Function }} AIProvider */

export class BaseAIProvider {
  constructor(config) {
    this.config = config;
  }
  async sendMessage() {
    throw new Error('Not implemented');
  }
  async generateStoryResponse() {
    throw new Error('Not implemented');
  }
  async summarizeMemory() {
    throw new Error('Not implemented');
  }
  async healthCheck() {
    return { ok: false };
  }
}
