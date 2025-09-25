import React, { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import useReactFlowStore from '../../../store/reactFlowStore';
import CustomNode from './CustomNode';

const SchemaValidatorNodeComponent = ({ id, data }: any) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

  const onSchemaChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { schema: evt.target.value });
  };

  const onValidationModeChange = (value: string) => {
    updateNodeData(id, { validationMode: value });
  };

  const onOutputFormatChange = (value: string) => {
    updateNodeData(id, { outputFormat: value });
  };

  const onAttemptRepairChange = (checked: boolean) => {
    updateNodeData(id, { attemptRepair: checked });
  };

  // Node handle configuration
  const nodeDataWithHandles = {
    ...data,
    inputs: [
      { name: 'llmResponse', id: '0' },  // LLM response to validate
      { name: 'schema', id: '1' },        // Schema override (optional)
      { name: 'originalText', id: '2' }   // Original text for context (optional)
    ],
    outputs: [
      { name: 'data', id: '0' },          // Validated/repaired data
      { name: 'isValid', id: '1' },       // Validation success flag
      { name: 'error', id: '2' },         // Error message if invalid
      { name: 'validationErrors', id: '3' }, // Detailed validation errors
      { name: 'repairedData', id: '4' }   // Repaired version (if attempted)
    ],
    colorClass: 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3">
        {/* Validation Mode */}
        <div>
          <Label className="text-xs text-gray-500">Validation Mode</Label>
          <Select
            value={data.validationMode || 'strict'}
            onValueChange={onValidationModeChange}
          >
            <SelectTrigger className="nodrag h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict">Strict (fail on error)</SelectItem>
              <SelectItem value="lenient">Lenient (return invalid data)</SelectItem>
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

        {/* Attempt Repair */}
        <div className="flex items-center justify-between">
          <Label htmlFor={`repair-${id}`} className="text-xs text-gray-500">
            Attempt Repair
          </Label>
          <Switch
            id={`repair-${id}`}
            checked={data.attemptRepair !== false}
            onCheckedChange={onAttemptRepairChange}
            className="nodrag"
          />
        </div>

        {/* JSON Schema */}
        <div>
          <Label className="text-xs text-gray-500 block mb-1">JSON Schema</Label>
          <Textarea
            value={data.schema || ''}
            onChange={onSchemaChange}
            className="nodrag text-xs font-mono resize-both"
            style={{ resize: 'both', overflow: 'auto', minWidth: '250px', minHeight: '100px' }}
            placeholder="Enter JSON Schema for validation..."
            rows={4}
          />
        </div>

        {/* Info text */}
        <div className="text-xs text-gray-400 space-y-1">
          <div>✓ Validates LLM responses against schema</div>
          <div>✓ Extracts JSON from text responses</div>
          {data.attemptRepair !== false && (
            <div>✓ Auto-repairs missing fields & type mismatches</div>
          )}
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(SchemaValidatorNodeComponent);