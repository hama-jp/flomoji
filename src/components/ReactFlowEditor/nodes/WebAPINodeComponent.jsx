import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  ChevronDown, 
  ChevronUp, 
  Settings,
  Key,
  Globe,
  RefreshCw
} from 'lucide-react';
import { nodeTypes as nodeDefinitions } from '../../nodes';

const WebAPINodeComponent = ({ id, data, selected }) => {
  const [expanded, setExpanded] = useState(false);
  const [localData, setLocalData] = useState(data);
  
  const nodeDefinition = nodeDefinitions.web_api;
  const { inputs = [], outputs = [] } = nodeDefinition;

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleDataChange = (field, value) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    if (data.onChange) {
      data.onChange(newData);
    }
  };

  const handleAuthChange = (field, value) => {
    const newAuth = { ...localData.authentication, [field]: value };
    handleDataChange('authentication', newAuth);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-lg border-2 ${
        selected ? 'border-purple-500' : 'border-gray-200'
      } min-w-[280px]`}
    >
      {/* Handles */}
      {inputs.map((input, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={input}
          style={{ 
            top: `${((index + 1) * 100) / (inputs.length + 1)}%`,
            background: '#6b7280',
            width: 8,
            height: 8
          }}
        >
          <div className="absolute left-2 text-xs bg-white px-1 rounded whitespace-nowrap">
            {input}
          </div>
        </Handle>
      ))}
      
      {outputs.map((output, index) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={output}
          style={{ 
            top: `${((index + 1) * 100) / (outputs.length + 1)}%`,
            background: '#6b7280',
            width: 8,
            height: 8
          }}
        >
          <div className="absolute right-2 text-xs bg-white px-1 rounded whitespace-nowrap">
            {output}
          </div>
        </Handle>
      ))}

      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-purple-50 rounded-t-lg cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xl">🔌</span>
          <span className="font-semibold text-gray-800">Web API</span>
        </div>
        <div className="flex items-center space-x-1">
          {localData.authentication?.type !== 'none' && (
            <Key className="w-4 h-4 text-green-600" />
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* URL Input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Globe className="inline w-3 h-3 mr-1" />
            API URL
          </label>
          <input
            type="text"
            value={localData.url || ''}
            onChange={(e) => handleDataChange('url', e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Method Selection */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Method
          </label>
          <select
            value={localData.method || 'GET'}
            onChange={(e) => handleDataChange('method', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
        </div>

        {expanded && (
          <>
            {/* Authentication */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Key className="inline w-3 h-3 mr-1" />
                Authentication
              </label>
              <select
                value={localData.authentication?.type || 'none'}
                onChange={(e) => handleAuthChange('type', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key</option>
                <option value="basic">Basic Auth</option>
              </select>

              {localData.authentication?.type === 'bearer' && (
                <input
                  type="password"
                  value={localData.authentication?.token || ''}
                  onChange={(e) => handleAuthChange('token', e.target.value)}
                  placeholder="Bearer token"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              )}

              {localData.authentication?.type === 'apikey' && (
                <>
                  <input
                    type="text"
                    value={localData.authentication?.headerName || ''}
                    onChange={(e) => handleAuthChange('headerName', e.target.value)}
                    placeholder="Header name (e.g., X-API-Key)"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-1"
                  />
                  <input
                    type="password"
                    value={localData.authentication?.apiKey || ''}
                    onChange={(e) => handleAuthChange('apiKey', e.target.value)}
                    placeholder="API key value"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </>
              )}

              {localData.authentication?.type === 'basic' && (
                <>
                  <input
                    type="text"
                    value={localData.authentication?.username || ''}
                    onChange={(e) => handleAuthChange('username', e.target.value)}
                    placeholder="Username"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-1"
                  />
                  <input
                    type="password"
                    value={localData.authentication?.password || ''}
                    onChange={(e) => handleAuthChange('password', e.target.value)}
                    placeholder="Password"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </>
              )}
            </div>

            {/* Headers */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Headers (JSON)
              </label>
              <textarea
                value={typeof localData.headers === 'object' ? JSON.stringify(localData.headers, null, 2) : localData.headers || '{}'}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleDataChange('headers', parsed);
                  } catch {
                    handleDataChange('headers', e.target.value);
                  }
                }}
                placeholder='{"Content-Type": "application/json"}'
                className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded h-20 resize-none"
              />
            </div>

            {/* Body Type & Content */}
            {localData.method !== 'GET' && localData.method !== 'HEAD' && (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Body Type
                  </label>
                  <select
                    value={localData.bodyType || 'json'}
                    onChange={(e) => handleDataChange('bodyType', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="json">JSON</option>
                    <option value="form">Form Data</option>
                    <option value="xml">XML</option>
                    <option value="text">Text</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Body Content
                  </label>
                  <textarea
                    value={localData.body || ''}
                    onChange={(e) => handleDataChange('body', e.target.value)}
                    placeholder={localData.bodyType === 'json' ? '{"key": "value"}' : 'Body content...'}
                    className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded h-20 resize-none"
                  />
                </div>
              </>
            )}

            {/* Response Type */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Response Type
              </label>
              <select
                value={localData.responseType || 'auto'}
                onChange={(e) => handleDataChange('responseType', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="auto">Auto Detect</option>
                <option value="json">JSON</option>
                <option value="text">Text</option>
                <option value="blob">Binary</option>
              </select>
            </div>

            {/* Retry Settings */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <RefreshCw className="inline w-3 h-3 mr-1" />
                Retry Settings
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={localData.retryCount || 0}
                    onChange={(e) => handleDataChange('retryCount', parseInt(e.target.value) || 0)}
                    placeholder="Retries"
                    min="0"
                    max="5"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-500">Retries</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={localData.retryDelay || 1000}
                    onChange={(e) => handleDataChange('retryDelay', parseInt(e.target.value) || 1000)}
                    placeholder="Delay (ms)"
                    min="100"
                    step="100"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-500">Delay (ms)</span>
                </div>
              </div>
            </div>

            {/* Timeout */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={localData.timeout || 30000}
                onChange={(e) => handleDataChange('timeout', parseInt(e.target.value) || 30000)}
                min="1000"
                step="1000"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </>
        )}

        {/* Status Indicator */}
        {localData.lastResponse && (
          <div className={`text-xs p-1 rounded mt-2 ${
            localData.lastResponse.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {localData.lastResponse.status} - {localData.lastResponse.statusText}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebAPINodeComponent;