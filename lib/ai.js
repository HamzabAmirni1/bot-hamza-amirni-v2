/**
 * lib/ai.js
 * Comprehensive AI Utilities & WhatsApp Link/Markdown Cleaners
 * Developed for bot-amirni-hamza by Hamza Amirni
 */

import {
  getSmartAIReply,
  askGeminiWeb,
  askGeminiOfficial,
  askDuckDuckGo,
  askAirforce,
  askNowtech,
  askPollinations,
  isValidReply
} from './gemini.js';

/**
 * Clean up distorted Markdown links [text](url) from AI output.
 * WhatsApp does NOT support markdown links and displays them as broken/mangled text in RTL Arabic.
 * 
 * Examples handled:
 * - [https://instagram.com/xxx](https://instagram.com/xxx) -> https://instagram.com/xxx
 * - [إنستغرام](https://instagram.com/xxx) -> إنستغرام: https://instagram.com/xxx
 * - إنستغرام: [https://instagram.com/xxx](https://instagram.com/xxx) -> إنستغرام: https://instagram.com/xxx
 * - [Google](https://google.com) -> Google: https://google.com
 * - [https://link.com] -> https://link.com
 */
export function cleanMarkdownLinks(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Remove markdown links where text and URL are identical or text is a URL: [url](url) -> url
  cleaned = cleaned.replace(/\[\s*(https?:\/\/[^\s\]]+)\s*\]\(\s*https?:\/\/[^\s\)]+\s*\)/gi, '$1');

  // 2. Remove markdown links where the label is identical to the target: [abc](abc) -> abc
  cleaned = cleaned.replace(/\[\s*([^\]]+?)\s*\]\(\s*\1\s*\)/gi, '$1');

  // 3. Handle label with URL: [Label](url)
  // If the preceding text already ends with ":" or label, avoid duplicating (e.g. "انستغرام: [Instagram](url)")
  cleaned = cleaned.replace(/(:\s*)?\[\s*([^\]\n]+?)\s*\]\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi, (match, colon, label, url) => {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();

    // If label is a URL or matches domain, just return the clean URL
    if (/^https?:\/\//i.test(trimmedLabel) || trimmedLabel.includes('www.') || trimmedLabel.includes('.com') || trimmedLabel.includes('.net') || trimmedLabel.includes('.org')) {
      return colon ? `${colon}${trimmedUrl}` : trimmedUrl;
    }

    // If there was already a colon before the link (e.g. "الموقع: [رابط](url)"), return ": url"
    if (colon) {
      return `: ${trimmedUrl}`;
    }

    // Otherwise return "Label: url"
    return `${trimmedLabel}: ${trimmedUrl}`;
  });

  // 4. Clean up standalone brackets around URLs: [https://example.com] -> https://example.com
  cleaned = cleaned.replace(/\[\s*(https?:\/\/[^\s\]]+)\s*\]/gi, '$1');

  // 5. Clean up parenthesized URLs with brackets: ([https://...]) -> https://...
  cleaned = cleaned.replace(/\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi, '$1');

  // 6. Fix markdown header hashtags (### Header -> *Header*) since WhatsApp does not support #
  cleaned = cleaned.replace(/^(?:#{1,6})\s+(.+)$/gm, '*$1*');

  return cleaned;
}

/**
 * Clean and format AI response specifically for WhatsApp rendering.
 */
export function cleanAIResponse(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = cleanMarkdownLinks(text);

  // Clean excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export {
  getSmartAIReply,
  askGeminiWeb,
  askGeminiOfficial,
  askDuckDuckGo,
  askAirforce,
  askNowtech,
  askPollinations,
  isValidReply
};

export default {
  cleanMarkdownLinks,
  cleanAIResponse,
  getSmartAIReply,
  askGeminiWeb,
  askGeminiOfficial,
  askDuckDuckGo,
  askAirforce,
  askNowtech,
  askPollinations,
  isValidReply
};
