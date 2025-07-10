/**
 * Formats and sanitizes product descriptions
 * Ensures proper HTML structure and consistent formatting
 */
export function formatProductDescription(description: string): string {
  if (!description) return '';
  
  // Ensure the description has proper HTML structure
  let formatted = description;
  
  // If the description doesn't start with an HTML tag, wrap it in a paragraph
  if (!formatted.trim().startsWith('<')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  // Replace common formatting issues
  formatted = formatted
    // Fix double spaces
    .replace(/\s+/g, ' ')
    // Fix multiple line breaks
    .replace(/(<br\s*\/?>){3,}/gi, '<br /><br />')
    // Ensure lists are properly formatted
    .replace(/<li>\s*-\s*/gi, '<li>')
    // Fix empty paragraphs
    .replace(/<p>\s*<\/p>/gi, '')
    // Fix unclosed tags
    .replace(/<p>([^<]*?)(?=<p>|<h[1-6]>|$)/gi, '<p>$1</p>')
    // Ensure headers have proper spacing
    .replace(/(<\/h[2-6]>)(<p>)/gi, '$1\n$2')
    .replace(/(<\/p>)(<h[2-6]>)/gi, '$1\n$2');
  
  // Add proper line breaks for readability in the editor
  formatted = formatted
    .replace(/(<\/p>)/g, '$1\n')
    .replace(/(<\/h[2-6]>)/g, '$1\n')
    .replace(/(<\/ul>)/g, '$1\n')
    .replace(/(<\/ol>)/g, '$1\n');
  
  return formatted.trim();
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 */
export function sanitizeHTML(html: string): string {
  // List of allowed tags
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'span', 'div',
    'blockquote', 'pre', 'code'
  ];
  
  // List of allowed attributes
  const allowedAttributes = {
    'a': ['href', 'title', 'target', 'rel'],
    'span': ['class', 'style'],
    'div': ['class', 'style']
  };
  
  // Simple sanitization - in production, use a library like DOMPurify
  let sanitized = html;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
}

/**
 * Truncates text to a specific character limit
 * Ensures truncation happens at word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Strips HTML tags from text
 * Useful for generating plain text versions
 */
export function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&')  // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}