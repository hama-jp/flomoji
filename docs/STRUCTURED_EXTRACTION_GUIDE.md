# Structured Extraction Guide

## Overview

The Structured Extraction workflow allows you to extract structured, JSON Schema-compliant data from unstructured text. This is achieved using two complementary nodes that work together in a DAG-compliant pattern.

## Nodes

### 1. Structured Extraction Node (`structured_extraction`)

Extracts structured data from text using either rule-based patterns or by generating prompts for LLM-based extraction.

**Inputs:**
- `text`: The unstructured text to extract data from
- `schema` (optional): JSON Schema override (uses node's configured schema if not provided)

**Outputs:**
- `data`: Extracted data (when rule-based extraction succeeds)
- `prompt`: Generated prompt for LLM (when rules fail or in LLM mode)
- `needsLLM`: Boolean indicating if LLM processing is needed
- `originalText`: The original input text (passed through for validation)
- `schema`: The JSON Schema used (passed through for validation)

**Configuration:**
- `extractionMode`: `"rules"`, `"llm"`, or `"hybrid"` (default)
- `schema`: JSON Schema defining the expected data structure
- `rules`: Array of extraction rules for pattern matching
- `llmPromptTemplate`: Template for generating LLM prompts
- `outputFormat`: `"object"` or `"json"` string format

### 2. Schema Validator Node (`schema_validator`)

Validates and optionally repairs LLM responses to ensure they match the required JSON Schema.

**Inputs:**
- `llmResponse`: The response from an LLM node
- `schema` (optional): JSON Schema for validation
- `originalText` (optional): Original text for context

**Outputs:**
- `data`: The validated (and possibly repaired) structured data
- `isValid`: Boolean indicating if validation succeeded
- `error`: Error message if validation failed
- `validationErrors`: Detailed validation errors
- `repairedData`: Repaired version of the data (if repair was attempted)

**Configuration:**
- `schema`: Default JSON Schema for validation
- `validationMode`: `"strict"` or `"lenient"`
- `outputFormat`: `"object"` or `"json"` string format
- `attemptRepair`: Boolean to enable automatic repair attempts

## Workflow Patterns

### Pattern 1: LLM-Based Extraction

```
[Input Text] → [Structured Extraction] → [LLM Node] → [Schema Validator] → [Output]
                     ↓                                          ↓
                  (prompt)                                   (data)
```

**Example Flow:**
1. Input node provides unstructured text
2. Structured Extraction node generates a prompt with the schema
3. LLM node processes the prompt and returns JSON
4. Schema Validator ensures the JSON matches the schema
5. Output node receives the validated data

### Pattern 2: Hybrid Extraction with Fallback

```
[Input Text] → [Structured Extraction] → [If Node] → [LLM Node] → [Schema Validator]
                     ↓                        ↓                           ↓
                  (data/needsLLM)         (direct output)              (data)
```

**Example Flow:**
1. Structured Extraction attempts rule-based extraction first
2. If successful (`needsLLM=false`), data flows directly to output
3. If rules fail (`needsLLM=true`), prompt goes to LLM
4. LLM response is validated by Schema Validator
5. Validated data flows to output

### Pattern 3: Multi-Source Validation

```
[Text Source 1] → [Structured Extraction] → [LLM] →┐
                                                     ├→ [Schema Validator] → [Output]
[Text Source 2] → [Structured Extraction] → [LLM] →┘
```

Multiple extraction pipelines can feed into a single validator node for consistent schema enforcement.

## Configuration Examples

### Basic Contact Information Extraction

**Structured Extraction Node Configuration:**
```json
{
  "extractionMode": "hybrid",
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "phone": { "type": "string" }
    },
    "required": ["name", "email"]
  },
  "rules": [
    {
      "field": "email",
      "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "type": "string"
    },
    {
      "field": "phone",
      "pattern": "\\b(?:\\+?1[-.\\s]?)?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}\\b",
      "type": "string"
    }
  ]
}
```

**Schema Validator Node Configuration:**
```json
{
  "validationMode": "strict",
  "attemptRepair": true,
  "outputFormat": "object"
}
```

### Advanced Product Information Extraction

**Structured Extraction Node - LLM Mode:**
```json
{
  "extractionMode": "llm",
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "productName": { "type": "string" },
      "price": { "type": "number" },
      "currency": { "type": "string", "enum": ["USD", "EUR", "GBP"] },
      "features": {
        "type": "array",
        "items": { "type": "string" }
      },
      "inStock": { "type": "boolean" }
    },
    "required": ["productName", "price", "currency"]
  },
  "llmPromptTemplate": "Extract product information from the following description. Pay special attention to pricing and availability.\n\nText: {text}\n\nSchema: {schema}\n\nExtracted JSON:"
}
```

## Best Practices

1. **Start with Rules**: For simple, predictable patterns (emails, phones, dates), use rule-based extraction for better performance and reliability.

2. **Use Hybrid Mode**: Combine rules with LLM fallback for the best of both worlds - fast rule-based extraction when possible, intelligent LLM extraction when needed.

3. **Enable Repair**: Set `attemptRepair: true` on the Schema Validator to automatically fix common issues like missing required fields or type mismatches.

4. **Validate Strictly in Production**: Use `validationMode: "strict"` to ensure data quality in production workflows.

5. **Test with Examples**: Always test your schema and rules with real-world examples to ensure accurate extraction.

## Common Issues and Solutions

### Issue: LLM returns text instead of JSON
**Solution**: Ensure your LLM prompt template explicitly asks for JSON output. The Schema Validator will attempt to extract JSON from text responses when `attemptRepair` is enabled.

### Issue: Required fields are missing
**Solution**: The Schema Validator can add default values for missing required fields when `attemptRepair: true`.

### Issue: Type mismatches
**Solution**: The validator attempts type coercion (e.g., "123" → 123) when repairing data.

### Issue: Extraction rules not matching
**Solution**: Test your regex patterns independently and ensure they account for variations in formatting.

## Performance Considerations

- **Rule-based extraction** is fastest and most reliable for predictable patterns
- **LLM extraction** provides flexibility but requires more processing time and API calls
- **Schema validation** is cached for repeated use of the same schema
- **Hybrid mode** optimizes by trying rules first, falling back to LLM only when necessary

## Integration with Other Nodes

The Structured Extraction workflow integrates well with:
- **Input Node**: Provide text from user input or files
- **HTTP Request Node**: Fetch text from APIs
- **If Node**: Route based on extraction success (`needsLLM` output)
- **Variable Set Node**: Store extracted data for later use
- **Output Node**: Display or save the structured data

## Example Workflow

Here's a complete workflow for extracting meeting information from emails:

1. **Input Node** → Receives email text
2. **Structured Extraction Node** → Configured with meeting schema (date, time, attendees, subject)
3. **LLM Node** → Processes the extraction prompt
4. **Schema Validator Node** → Ensures all required fields are present
5. **If Node** → Checks `isValid` output
6. **Variable Set Node** → Stores the meeting data
7. **Output Node** → Confirms successful extraction

This pattern ensures reliable, schema-compliant data extraction while maintaining DAG compliance and avoiding cycles in the workflow.