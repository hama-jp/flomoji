import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const execute: NodeExecuteFunction = async (
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> => {
  const { transformType, format, encoding, delimiter, headers, skipEmpty } = node.data;
  const inputData = inputs.data || inputs.input;

  if (!inputData && transformType !== 'generate') {
    throw new Error('No input data provided');
  }

  context?.addLog('info', `Executing ${transformType} transformation`, node.id);

  try {
    switch (transformType) {
      case 'csv_to_json': {
        // Convert CSV to JSON
        if (typeof inputData !== 'string') {
          throw new Error('CSV input must be a string');
        }

        const result = parseCSV(inputData, {
          delimiter: delimiter || ',',
          headers: headers !== false,
          skipEmpty: skipEmpty || false
        });

        context?.addLog('success', `Parsed CSV: ${result.length} rows`, node.id);
        return result;
      }

      case 'json_to_csv': {
        // Convert JSON array to CSV
        if (!Array.isArray(inputData) || inputData.length === 0) {
          throw new Error('Input must be a non-empty array for CSV conversion');
        }

        const csv = generateCSV(inputData, {
          delimiter: delimiter || ',',
          headers: headers !== false
        });

        context?.addLog('success', `Generated CSV with ${inputData.length} rows`, node.id);
        return csv;
      }

      case 'xml_to_json': {
        // Convert XML to JSON (simplified)
        if (typeof inputData !== 'string') {
          throw new Error('XML input must be a string');
        }

        const json = parseSimpleXML(inputData);
        context?.addLog('success', 'Parsed XML to JSON', node.id);
        return json;
      }

      case 'json_to_xml': {
        // Convert JSON to XML (simplified)
        const xml = generateSimpleXML(inputData, node.data.rootElement || 'root');
        context?.addLog('success', 'Generated XML from JSON', node.id);
        return xml;
      }

      case 'base64_encode': {
        // Encode to Base64
        const text = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
        const encoded = btoa(unescape(encodeURIComponent(text)));
        context?.addLog('success', 'Encoded to Base64', node.id);
        return encoded;
      }

      case 'base64_decode': {
        // Decode from Base64
        if (typeof inputData !== 'string') {
          throw new Error('Base64 input must be a string');
        }

        try {
          const decoded = decodeURIComponent(escape(atob(inputData)));

          // Try to parse as JSON if possible
          if (format === 'json') {
            try {
              return JSON.parse(decoded);
            } catch {
              return decoded;
            }
          }

          return decoded;
        } catch (error) {
          throw new Error('Invalid Base64 input');
        }
      }

      case 'url_encode': {
        // URL encode
        const text = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
        const encoded = encodeURIComponent(text);
        context?.addLog('success', 'URL encoded', node.id);
        return encoded;
      }

      case 'url_decode': {
        // URL decode
        if (typeof inputData !== 'string') {
          throw new Error('URL encoded input must be a string');
        }

        const decoded = decodeURIComponent(inputData);

        // Try to parse as JSON if possible
        if (format === 'json') {
          try {
            return JSON.parse(decoded);
          } catch {
            return decoded;
          }
        }

        context?.addLog('success', 'URL decoded', node.id);
        return decoded;
      }

      case 'html_escape': {
        // Escape HTML
        const text = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
        const escaped = escapeHTML(text);
        context?.addLog('success', 'HTML escaped', node.id);
        return escaped;
      }

      case 'html_unescape': {
        // Unescape HTML
        if (typeof inputData !== 'string') {
          throw new Error('HTML input must be a string');
        }

        const unescaped = unescapeHTML(inputData);
        context?.addLog('success', 'HTML unescaped', node.id);
        return unescaped;
      }

      case 'markdown_to_html': {
        // Convert Markdown to HTML (basic)
        if (typeof inputData !== 'string') {
          throw new Error('Markdown input must be a string');
        }

        const html = convertMarkdownToHTML(inputData);
        context?.addLog('success', 'Converted Markdown to HTML', node.id);
        return html;
      }

      case 'format_template': {
        // Format string template
        const template = node.data.template || inputs.template;
        if (!template) {
          throw new Error('Template is required for formatting');
        }

        const variables = typeof inputData === 'object' ? inputData : { value: inputData };
        const formatted = formatTemplate(template, variables);
        context?.addLog('success', 'Formatted template', node.id);
        return formatted;
      }

      case 'extract_text': {
        // Extract text from HTML
        if (typeof inputData !== 'string') {
          throw new Error('HTML input must be a string');
        }

        const text = extractTextFromHTML(inputData);
        context?.addLog('success', 'Extracted text from HTML', node.id);
        return text;
      }

      case 'case_transform': {
        // Transform text case
        if (typeof inputData !== 'string') {
          throw new Error('Input must be a string for case transformation');
        }

        const caseType = node.data.caseType || 'lower';
        const transformed = transformCase(inputData, caseType);
        context?.addLog('success', `Transformed to ${caseType} case`, node.id);
        return transformed;
      }

      case 'generate': {
        // Generate data based on template
        const template = node.data.template || inputs.template;
        const count = node.data.count || 1;

        if (!template) {
          throw new Error('Template is required for data generation');
        }

        const generated = [];
        for (let i = 0; i < count; i++) {
          const item = generateFromTemplate(template, i);
          generated.push(item);
        }

        context?.addLog('success', `Generated ${count} items`, node.id);
        return count === 1 ? generated[0] : generated;
      }

      default:
        throw new Error(`Unknown transform type: ${transformType}`);
    }
  } catch (error: any) {
    context?.addLog('error', `Transform failed: ${error.message}`, node.id);
    throw error;
  }
};

// CSV parsing function (RFC 4180 compliant)
function parseCSV(csv: string, options: any): any[] {
  const delimiter = options.delimiter || ',';
  const skipEmpty = options.skipEmpty || false;
  const hasHeaders = options.headers !== false;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      // Inside quotes, look for closing quote
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote (doubled quote)
          currentField += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      // Outside quotes
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField);
        if (!skipEmpty || currentRow.some(f => f.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  // Add last field and row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (!skipEmpty || currentRow.some(f => f.trim())) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Process headers
  if (hasHeaders && rows.length > 0) {
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  return rows;
}

// CSV generation function (RFC 4180 compliant)
function generateCSV(data: any[], options: any): string {
  if (data.length === 0) return '';

  const delimiter = options.delimiter || ',';
  const hasHeaders = options.headers !== false;
  const lines: string[] = [];

  // Helper to escape CSV field
  const escapeField = (field: any): string => {
    const str = String(field == null ? '' : field);

    // Check if field needs quoting
    const needsQuoting = str.includes(delimiter) ||
                        str.includes('"') ||
                        str.includes('\n') ||
                        str.includes('\r');

    if (needsQuoting) {
      // Escape quotes by doubling them
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  };

  // Add headers if needed
  if (hasHeaders && typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const headers = Object.keys(data[0]);
    lines.push(headers.map(escapeField).join(delimiter));
  }

  // Add data rows
  for (const item of data) {
    if (typeof item === 'object' && !Array.isArray(item)) {
      const values = Object.values(item).map(escapeField);
      lines.push(values.join(delimiter));
    } else if (Array.isArray(item)) {
      lines.push(item.map(escapeField).join(delimiter));
    } else {
      lines.push(escapeField(item));
    }
  }

  return lines.join('\n');
}

// Simple XML parser (very basic)
function parseSimpleXML(xml: string): any {
  // This is a very simplified XML parser
  // In production, use a proper XML parser library
  const result: any = {};

  // Remove XML declaration
  xml = xml.replace(/<\?xml[^?]*\?>/g, '');

  // Extract tag content
  const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>/gs;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const tagName = match[1];
    const content = match[3];

    // Check if content has nested tags
    if (/<\w+[^>]*>/.test(content)) {
      result[tagName] = parseSimpleXML(content);
    } else {
      result[tagName] = content.trim();
    }
  }

  return result;
}

// Simple XML generator
function generateSimpleXML(obj: any, rootElement: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;

  function buildXML(data: any, indent: string = ''): string {
    let result = '';

    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        result += `${indent}<${key}>`;

        if (typeof value === 'object') {
          result += '\n' + buildXML(value, indent + '  ') + indent;
        } else {
          result += escapeXML(String(value));
        }

        result += `</${key}>\n`;
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        result += buildXML(item, indent);
      }
    } else {
      result += escapeXML(String(data));
    }

    return result;
  }

  xml += `<${rootElement}>\n${buildXML(obj, '  ')}</${rootElement}>`;
  return xml;
}

// HTML escape function
function escapeHTML(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

// HTML unescape function
function unescapeHTML(text: string): string {
  const unescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };

  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, entity => unescapeMap[entity] || entity);
}

// XML escape function
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Basic Markdown to HTML converter
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>\n');

  return html;
}

// Template formatting function
function formatTemplate(template: string, variables: Record<string, any>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

// Extract text from HTML
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = unescapeHTML(text);

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// Case transformation function
function transformCase(text: string, caseType: string): string {
  switch (caseType) {
    case 'lower':
      return text.toLowerCase();
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\w\S*/g, txt =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    case 'camel':
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');
    case 'pascal':
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
        .replace(/\s+/g, '');
    case 'snake':
      return text
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
    case 'kebab':
      return text
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('-');
    default:
      return text;
  }
}

// Generate data from template
function generateFromTemplate(template: string, index: number): any {
  try {
    const parsed = JSON.parse(template);

    // Replace placeholders with generated values
    function processValue(value: any): any {
      if (typeof value === 'string') {
        // Replace index placeholder
        value = value.replace(/{{index}}/g, String(index));
        value = value.replace(/{{id}}/g, String(index + 1));
        value = value.replace(/{{timestamp}}/g, new Date().toISOString());
        value = value.replace(/{{random}}/g, String(Math.random()));
        value = value.replace(/{{uuid}}/g, generateUUID());
        return value;
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map(processValue);
        } else {
          const result: any = {};
          for (const [key, val] of Object.entries(value)) {
            result[key] = processValue(val);
          }
          return result;
        }
      }
      return value;
    }

    return processValue(parsed);
  } catch {
    // If not valid JSON, treat as string template
    let result = template;
    result = result.replace(/{{index}}/g, String(index));
    result = result.replace(/{{id}}/g, String(index + 1));
    result = result.replace(/{{timestamp}}/g, new Date().toISOString());
    result = result.replace(/{{random}}/g, String(Math.random()));
    result = result.replace(/{{uuid}}/g, generateUUID());
    return result;
  }
}

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DataTransformNode = createNodeDefinition(
  'Data Transform',
  '🔧',
  'green',
  ['data', 'input', 'template'],
  ['output'],
  {
    transformType: 'csv_to_json', // csv_to_json, json_to_csv, xml_to_json, json_to_xml, base64_encode, base64_decode, url_encode, url_decode, html_escape, html_unescape, markdown_to_html, format_template, extract_text, case_transform, generate
    format: 'auto', // auto, json, text
    encoding: 'utf-8',
    delimiter: ',',
    headers: true,
    skipEmpty: false,
    rootElement: 'root',
    template: '',
    caseType: 'lower', // lower, upper, title, camel, pascal, snake, kebab
    count: 1
  },
  execute,
  {
    description: 'Transform data between different formats: CSV, JSON, XML, Base64, and more',
    category: 'processing'
  }
);

export default DataTransformNode;