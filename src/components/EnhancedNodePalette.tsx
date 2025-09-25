import React, { useState, useMemo, useEffect } from 'react';
import useReactFlowStore from '../store/reactFlowStore';
import { nodesByCategory } from './nodes';
import { ChevronDown, ChevronRight, Search, Star, Clock, X, Info, Plus } from 'lucide-react';

interface NodeUsage {
  [nodeType: string]: {
    count: number;
    lastUsed: number;
  };
}

const EnhancedNodePalette: React.FC = () => {
  const addNode = useReactFlowStore((state: any) => state.addNode);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [nodeUsage, setNodeUsage] = useState<NodeUsage>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Load favorites and usage from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('nodePalette.favorites');
    const savedUsage = localStorage.getItem('nodePalette.usage');
    const savedExpanded = localStorage.getItem('nodePalette.expanded');

    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    if (savedUsage) {
      setNodeUsage(JSON.parse(savedUsage));
    }
    if (savedExpanded) {
      setExpandedCategories(new Set(JSON.parse(savedExpanded)));
    } else {
      // Default: expand first category
      setExpandedCategories(new Set(['input-output']));
    }
  }, []);

  // Save favorites and usage to localStorage
  useEffect(() => {
    localStorage.setItem('nodePalette.favorites', JSON.stringify(Array.from(favorites)));
    localStorage.setItem('nodePalette.usage', JSON.stringify(nodeUsage));
    localStorage.setItem('nodePalette.expanded', JSON.stringify(Array.from(expandedCategories)));
  }, [favorites, nodeUsage, expandedCategories]);

  // Get all nodes with metadata
  const allNodes = useMemo(() => {
    const nodes: Array<{
      type: string;
      definition: any;
      category: string;
      categoryName: string;
    }> = [];

    Object.entries(nodesByCategory).forEach(([categoryId, category]: any) => {
      Object.entries(category.nodes).forEach(([nodeType, nodeDefinition]: any) => {
        nodes.push({
          type: nodeType,
          definition: nodeDefinition,
          category: categoryId,
          categoryName: category.name
        });
      });
    });

    return nodes;
  }, []);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return allNodes;

    const query = searchQuery.toLowerCase();
    return allNodes.filter(node =>
      node.definition.name.toLowerCase().includes(query) ||
      node.definition.description?.toLowerCase().includes(query) ||
      node.type.toLowerCase().includes(query) ||
      node.categoryName.toLowerCase().includes(query)
    );
  }, [allNodes, searchQuery]);

  // Get recently used nodes
  const recentNodes = useMemo(() => {
    return Object.entries(nodeUsage)
      .sort(([, a], [, b]) => b.lastUsed - a.lastUsed)
      .slice(0, 5)
      .map(([nodeType]) => allNodes.find(n => n.type === nodeType))
      .filter(Boolean);
  }, [nodeUsage, allNodes]);

  // Get favorite nodes
  const favoriteNodes = useMemo(() => {
    return Array.from(favorites)
      .map(nodeType => allNodes.find(n => n.type === nodeType))
      .filter(Boolean);
  }, [favorites, allNodes]);

  // Group filtered nodes by category
  const groupedNodes = useMemo(() => {
    const groups: { [key: string]: typeof filteredNodes } = {};

    filteredNodes.forEach(node => {
      if (!groups[node.category]) {
        groups[node.category] = [];
      }
      groups[node.category].push(node);
    });

    return groups;
  }, [filteredNodes]);

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (nodeType: string) => {
    const node = allNodes.find(n => n.type === nodeType);
    if (!node) return;

    const centerPosition = { x: 400, y: 200 };

    const newNode = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType,
      position: centerPosition,
      data: {
        label: node.definition.name,
        icon: node.definition.icon,
        ...node.definition.defaultData,
      },
    };

    addNode(newNode);

    // Update usage statistics
    setNodeUsage(prev => ({
      ...prev,
      [nodeType]: {
        count: (prev[nodeType]?.count || 0) + 1,
        lastUsed: Date.now()
      }
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleFavorite = (nodeType: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(nodeType)) {
        next.delete(nodeType);
      } else {
        next.add(nodeType);
      }
      return next;
    });
  };

  const getNodeColor = (definition: any) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
    };
    return colorMap[definition.color] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const renderNode = (node: any, showCategory = false) => (
    <div
      key={node.type}
      className="relative group"
      onMouseEnter={() => setHoveredNode(node.type)}
      onMouseLeave={() => setHoveredNode(null)}
    >
      <div
        className="mx-2 mb-1 bg-white border rounded-lg hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(event) => onDragStart(event, node.type)}
        onClick={() => handleAddNode(node.type)}
      >
        <div className="p-2.5 flex items-center space-x-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg border ${getNodeColor(node.definition)}`}>
            {node.definition.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {node.definition.name}
              </div>
              {favorites.has(node.type) && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            {showCategory && (
              <div className="text-xs text-gray-400">
                {node.categoryName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(node.type);
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Star className={`w-3 h-3 ${favorites.has(node.type) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddNode(node.type);
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Plus className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredNode === node.type && node.definition.description && (
        <div className="absolute z-10 left-full ml-2 top-0 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
          <div className="font-semibold mb-1">{node.definition.name}</div>
          <div className="text-gray-300">{node.definition.description}</div>
          {node.definition.inputs && node.definition.inputs.length > 0 && (
            <div className="mt-2">
              <div className="text-gray-400">Inputs:</div>
              <div className="text-gray-300">{node.definition.inputs.join(', ')}</div>
            </div>
          )}
          {node.definition.outputs && node.definition.outputs.length > 0 && (
            <div className="mt-1">
              <div className="text-gray-400">Outputs:</div>
              <div className="text-gray-300">{node.definition.outputs.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-3 border-b bg-white shadow-sm">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">ノードパレット</h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ノードを検索..."
            className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>ドラッグまたはクリックで追加</span>
          </div>
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto">
        {/* Favorites Section */}
        {!searchQuery && favoriteNodes.length > 0 && (
          <div className="mb-2">
            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                お気に入り
              </span>
            </div>
            {favoriteNodes.map(node => renderNode(node, true))}
          </div>
        )}

        {/* Recent Section */}
        {!searchQuery && recentNodes.length > 0 && (
          <div className="mb-2">
            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                最近使用
              </span>
            </div>
            {recentNodes.map(node => renderNode(node, true))}
          </div>
        )}

        {/* Categories or Search Results */}
        {searchQuery ? (
          <div className="py-2">
            {filteredNodes.length > 0 ? (
              <>
                <div className="px-3 pb-2 text-xs text-gray-500">
                  {filteredNodes.length}件の結果
                </div>
                {filteredNodes.map(node => renderNode(node, true))}
              </>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                「{searchQuery}」に一致するノードが見つかりません
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(nodesByCategory).map(([categoryId, category]: any) => (
              <div key={categoryId} className="mb-2">
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  {expandedCategories.has(categoryId) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto mr-2">
                    {Object.keys(category.nodes).length}
                  </span>
                </button>

                {expandedCategories.has(categoryId) && (
                  <div>
                    {Object.entries(category.nodes).map(([nodeType, nodeDefinition]: any) =>
                      renderNode({
                        type: nodeType,
                        definition: nodeDefinition,
                        category: categoryId,
                        categoryName: category.name
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>{allNodes.length} ノード</span>
          <span>{Object.keys(nodesByCategory).length} カテゴリー</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNodePalette;