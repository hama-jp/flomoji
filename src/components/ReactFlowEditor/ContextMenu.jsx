import React, { useState } from 'react';
import { useStore as useUIStore } from '../../store';
import useReactFlowStore from '../../store/reactFlowStore';
import { nodesByCategory } from '../nodes/index.js';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';

const ContextMenu = () => {
  const contextMenu = useUIStore(state => state.contextMenu);
  const setContextMenu = useUIStore(state => state.setContextMenu);
  const addNode = useReactFlowStore(state => state.addNode);
  const deleteSelectedElements = useReactFlowStore(state => state.deleteSelectedElements);
  const [expandedCategories, setExpandedCategories] = useState({});

  if (!contextMenu) {
    return null;
  }

  const handleAddNode = (nodeType) => {
    const nodeDefinition = Object.values(nodesByCategory)
      .flatMap(category => Object.entries(category.nodes))
      .find(([key]) => key === nodeType)?.[1];

    if (!nodeDefinition) return;

    const newNode = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType,
      position: { x: contextMenu.flowX || contextMenu.x, y: contextMenu.flowY || contextMenu.y },
      data: {
        label: nodeDefinition.name,
        icon: nodeDefinition.icon,
        ...nodeDefinition.defaultData,
      },
    };
    addNode(newNode);
    setContextMenu(null);
  };

  const handleDelete = () => {
    deleteSelectedElements();
    setContextMenu(null);
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const renderAddNodeMenu = () => (
    <>
      {/* Header */}
      <div className="px-3 py-2 text-sm font-semibold text-gray-700 border-b mb-1 flex items-center">
        <Plus className="w-4 h-4 mr-2" />
        Add Node
      </div>

      {/* Quick Add Section - moved to top */}
      <div className="border-b mb-2 pb-2">
        <div className="px-3 py-1">
          <div className="text-xs text-gray-400 mb-2">Quick Add</div>
          <div className="grid grid-cols-2 gap-1">
            {/* Most common nodes */}
            <button
              onClick={() => handleAddNode('input')}
              className="text-left px-2 py-1 hover:bg-blue-50 rounded text-xs flex items-center space-x-1 transition-colors"
            >
              <span>📥</span>
              <span>Input</span>
            </button>
            <button
              onClick={() => handleAddNode('output')}
              className="text-left px-2 py-1 hover:bg-blue-50 rounded text-xs flex items-center space-x-1 transition-colors"
            >
              <span>📤</span>
              <span>Output</span>
            </button>
            <button
              onClick={() => handleAddNode('llm')}
              className="text-left px-2 py-1 hover:bg-blue-50 rounded text-xs flex items-center space-x-1 transition-colors"
            >
              <span>🤖</span>
              <span>LLM</span>
            </button>
            <button
              onClick={() => handleAddNode('code_execution')}
              className="text-left px-2 py-1 hover:bg-blue-50 rounded text-xs flex items-center space-x-1 transition-colors"
            >
              <span>⚙️</span>
              <span>JS Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      {Object.entries(nodesByCategory).map(([categoryKey, { name, nodes }]) => {
        const isExpanded = expandedCategories[categoryKey];
        const nodeCount = Object.keys(nodes).length;
        
        return (
          <div key={categoryKey} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-5 h-5 flex items-center justify-center mr-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {name}
                </span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {nodeCount}
              </span>
            </button>

            {/* Category Nodes */}
            {isExpanded && (
              <div className="ml-2 border-l border-gray-200">
                {Object.entries(nodes).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => handleAddNode(type)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center space-x-3 transition-colors group ml-3"
                  >
                    <span className="text-lg flex-shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                        {config.name}
                      </div>
                      {config.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {config.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  const renderSelectionMenu = () => (
    <>
      <button
        onClick={handleDelete}
        className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center space-x-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete Selection</span>
      </button>
    </>
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: contextMenu.screenX || contextMenu.x,
        top: contextMenu.screenY || contextMenu.y,
        zIndex: 1000,
      }}
      className="bg-white rounded-lg shadow-lg border py-2 min-w-56 max-h-[32rem] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {contextMenu.type === 'selection' ? renderSelectionMenu() : renderAddNodeMenu()}
    </div>
  );
};

export default ContextMenu;