import React from 'react';

import useReactFlowStore from '../store/reactFlowStore';

import { nodesByCategory } from './nodes/index.js';

const NodePaletteContextStyle: React.FC = () => {
  const addNode = useReactFlowStore((state: any) => state.addNode);

  // ドラッグ開始時の処理
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    // ドラッグデータにノードタイプを設定
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // クリック時にノードを中央に追加（右クリックメニューと同様の動作）
  const handleAddNode = (nodeType: string) => {
    const nodeDefinition = Object.values(nodesByCategory)
      .flatMap(category => Object.entries(category.nodes))
      .find(([key]) => key === nodeType)?.[1];

    if (!nodeDefinition) return;

    // 中央付近の位置に配置
    const centerPosition = { x: 400, y: 200 };
    
    const newNode = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType,
      position: centerPosition,
      data: {
        label: nodeDefinition.name,
        icon: nodeDefinition.icon,
        ...nodeDefinition.defaultData,
      },
    };
    addNode(newNode);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm text-gray-700 mb-1">Node Palette</h3>
        <p className="text-xs text-gray-500">Drag to canvas or click to add</p>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="py-2">
          {Object.entries(nodesByCategory).map(([categoryId, category]: any) => (
            <div key={categoryId} className="mb-2">
              <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {category.name}
              </div>
              {Object.entries(category.nodes).map(([nodeType, nodeDefinition]: any) => (
                <div
                  key={nodeType}
                  className="mx-2 mb-1 bg-white border rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(event) => onDragStart(event, nodeType)}
                  onDragEnd={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => handleAddNode(nodeType)}
                >
                  <div className="p-3 flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg text-lg bg-gray-100 text-gray-700">
                      {nodeDefinition.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {nodeDefinition.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {nodeDefinition.description || 'Add node to workflow'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NodePaletteContextStyle;