import React, { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import useReactFlowStore from '../../../store/reactFlowStore';
import CustomNode from './CustomNode';

interface ExtractionRule {
  field: string;
  pattern: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'number' | 'boolean' | 'json';
}

const StructuredExtractionNodeComponent = ({ id, data }: any) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

  const onSchemaChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { schema: evt.target.value });
  };

  const onExtractionModeChange = (value: string) => {
    updateNodeData(id, { extractionMode: value });
  };

  const onOutputFormatChange = (value: string) => {
    updateNodeData(id, { outputFormat: value });
  };

  const onPromptTemplateChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { llmPromptTemplate: evt.target.value });
  };

  const addRule = () => {
    const newRule: ExtractionRule = {
      field: '',
      pattern: '',
      type: 'string',
      required: false,
      transform: undefined
    };
    const rules = data.rules || [];
    updateNodeData(id, { rules: [...rules, newRule] });
  };

  const updateRule = (index: number, field: keyof ExtractionRule, value: any) => {
    const rules = [...(data.rules || [])];
    rules[index] = { ...rules[index], [field]: value };
    updateNodeData(id, { rules });
  };

  const removeRule = (index: number) => {
    const rules = [...(data.rules || [])];
    rules.splice(index, 1);
    updateNodeData(id, { rules });
  };

  // Node handle configuration
  const nodeDataWithHandles = {
    ...data,
    inputs: [
      { name: 'text', id: '0' },      // Input text
      { name: 'schema', id: '1' }      // Schema override (optional)
    ],
    outputs: [
      { name: 'data', id: '0' },       // Extracted data (if successful)
      { name: 'prompt', id: '1' },     // Generated prompt (for LLM)
      { name: 'needsLLM', id: '2' },   // Boolean flag
      { name: 'originalText', id: '3' }, // Pass-through text
      { name: 'schema', id: '4' }      // Pass-through schema
    ],
    colorClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3">
        {/* Extraction Mode */}
        <div>
          <Label className="text-xs text-gray-500">Extraction Mode</Label>
          <Select
            value={data.extractionMode || 'hybrid'}
            onValueChange={onExtractionModeChange}
          >
            <SelectTrigger className="nodrag h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rules">Rules Only</SelectItem>
              <SelectItem value="llm">LLM Only</SelectItem>
              <SelectItem value="hybrid">Hybrid (Rules + LLM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Format */}
        <div>
          <Label className="text-xs text-gray-500">Output Format</Label>
          <Select
            value={data.outputFormat || 'object'}
            onValueChange={onOutputFormatChange}
          >
            <SelectTrigger className="nodrag h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="object">JavaScript Object</SelectItem>
              <SelectItem value="json">JSON String</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* JSON Schema */}
        <div>
          <Label className="text-xs text-gray-500 block mb-1">JSON Schema</Label>
          <Textarea
            value={data.schema || ''}
            onChange={onSchemaChange}
            className="nodrag text-xs font-mono resize-both"
            style={{ resize: 'both', overflow: 'auto', minWidth: '250px', minHeight: '100px' }}
            placeholder="Enter JSON Schema..."
            rows={4}
          />
        </div>

        {/* Rules Section (if extraction mode includes rules) */}
        {(data.extractionMode === 'rules' || data.extractionMode === 'hybrid' || !data.extractionMode) && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs text-gray-500">Extraction Rules</Label>
              <Button
                onClick={addRule}
                size="sm"
                variant="ghost"
                className="h-6 px-2 nodrag"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Rule
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(data.rules || []).map((rule: ExtractionRule, index: number) => (
                <div key={index} className="border border-gray-200 rounded p-2 space-y-1">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={rule.field || ''}
                      onChange={(e) => updateRule(index, 'field', e.target.value)}
                      placeholder="Field name"
                      className="nodrag text-xs px-1 py-0.5 border rounded flex-1"
                    />
                    <select
                      value={rule.type}
                      onChange={(e) => updateRule(index, 'type', e.target.value)}
                      className="nodrag text-xs px-1 py-0.5 border rounded"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                    </select>
                    <Button
                      onClick={() => removeRule(index)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 nodrag"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={rule.pattern || ''}
                    onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                    placeholder="Regex pattern"
                    className="nodrag text-xs px-1 py-0.5 border rounded w-full font-mono"
                  />
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={rule.required || false}
                        onChange={(e) => updateRule(index, 'required', e.target.checked)}
                        className="nodrag"
                      />
                      Required
                    </label>
                    <select
                      value={rule.transform || ''}
                      onChange={(e) => updateRule(index, 'transform', e.target.value || undefined)}
                      className="nodrag text-xs px-1 py-0.5 border rounded flex-1"
                    >
                      <option value="">No transform</option>
                      <option value="trim">Trim</option>
                      <option value="lowercase">Lowercase</option>
                      <option value="uppercase">Uppercase</option>
                      <option value="number">To Number</option>
                      <option value="boolean">To Boolean</option>
                      <option value="json">Parse JSON</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LLM Prompt Template (if extraction mode includes LLM) */}
        {(data.extractionMode === 'llm' || data.extractionMode === 'hybrid' || !data.extractionMode) && (
          <div>
            <Label className="text-xs text-gray-500 block mb-1">LLM Prompt Template</Label>
            <Textarea
              value={data.llmPromptTemplate || ''}
              onChange={onPromptTemplateChange}
              className="nodrag text-xs resize-both"
              style={{ resize: 'both', overflow: 'auto', minWidth: '250px', minHeight: '80px' }}
              placeholder="Use {text} and {schema} placeholders..."
              rows={3}
            />
          </div>
        )}
      </div>
    </CustomNode>
  );
};

export default memo(StructuredExtractionNodeComponent);