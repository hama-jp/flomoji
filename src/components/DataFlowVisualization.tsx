import React, { useEffect, useRef, useState } from 'react';
import { useViewport, useNodes, useEdges } from '@xyflow/react';
import { useDebuggerStore } from '../store/debuggerStore';
import { cn } from '../lib/utils';

interface DataParticle {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  progress: number;
  data: any;
  path: SVGPathElement | null;
}

export const DataFlowVisualization: React.FC = () => {
  const viewport = useViewport();
  const nodes = useNodes();
  const edges = useEdges();
  const svgRef = useRef<SVGSVGElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [particles, setParticles] = useState<DataParticle[]>([]);

  // Subscribe to specific store values to trigger re-renders
  const dataFlowHistory = useDebuggerStore(state => state.dataFlowHistory);
  const debugMode = useDebuggerStore(state => state.debugMode);
  const currentStepIndex = useDebuggerStore(state => state.currentStepIndex);
  const currentNodeId = useDebuggerStore(state => state.currentNodeId);
  const breakpoints = useDebuggerStore(state => state.breakpoints);

  useEffect(() => {
    if (debugMode === 'off' || dataFlowHistory.length === 0) {
      setParticles([]);
      return;
    }

    // Get data flows up to current step
    const relevantFlows = dataFlowHistory.filter((_, index) => index <= currentStepIndex);
    const latestFlow = relevantFlows[relevantFlows.length - 1];

    if (!latestFlow) return;

    // Find the edge for this data flow
    const edge = edges.find(e =>
      e.source === latestFlow.sourceNodeId &&
      e.target === latestFlow.targetNodeId
    );

    if (!edge) return;

    // Create a new particle for this data flow
    const particleId = `particle-${Date.now()}-${Math.random()}`;
    const newParticle: DataParticle = {
      id: particleId,
      sourceNodeId: latestFlow.sourceNodeId,
      targetNodeId: latestFlow.targetNodeId,
      progress: 0,
      data: latestFlow.data,
      path: null
    };

    setParticles(prev => [...prev, newParticle]);

    // Remove particle after animation completes
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== particleId));
    }, 2000);

  }, [dataFlowHistory, currentStepIndex, debugMode, edges]);

  useEffect(() => {
    const animate = () => {
      setParticles(prevParticles =>
        prevParticles.map(particle => ({
          ...particle,
          progress: Math.min(particle.progress + 0.02, 1)
        }))
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (particles.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles.length]);

  const getEdgePath = (edge: any): string => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return '';

    const sourceX = sourceNode.position.x + (sourceNode.width || 150) / 2;
    const sourceY = sourceNode.position.y + (sourceNode.height || 50);
    const targetX = targetNode.position.x + (targetNode.width || 150) / 2;
    const targetY = targetNode.position.y;

    // Create a bezier curve path
    const midY = (sourceY + targetY) / 2;
    return `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
  };

  const getPointOnPath = (path: string, progress: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };

    // Create a temporary path element to calculate position
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', path);
    svgRef.current.appendChild(pathElement);

    const pathLength = pathElement.getTotalLength();
    const point = pathElement.getPointAtLength(pathLength * progress);

    svgRef.current.removeChild(pathElement);

    return { x: point.x, y: point.y };
  };


  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0'
      }}
    >
      <defs>
        {/* Glow filter for particles */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Gradient for data flow lines */}
        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Render data flow paths */}
      {particles.map(particle => {
        const edge = edges.find(e =>
          e.source === particle.sourceNodeId &&
          e.target === particle.targetNodeId
        );

        if (!edge) return null;

        const path = getEdgePath(edge);
        const point = getPointOnPath(path, particle.progress);

        return (
          <g key={particle.id}>
            {/* Flow line */}
            <path
              d={path}
              fill="none"
              stroke="url(#flowGradient)"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity={0.3}
              className="animate-pulse"
            />

            {/* Data particle */}
            <g transform={`translate(${point.x}, ${point.y})`}>
              {/* Outer glow */}
              <circle
                r="12"
                fill="#3b82f6"
                opacity="0.2"
                filter="url(#glow)"
                className="animate-ping"
              />

              {/* Inner particle */}
              <circle
                r="6"
                fill="#3b82f6"
                opacity="0.8"
              />

              {/* Data preview tooltip */}
              {particle.progress > 0.3 && particle.progress < 0.7 && (
                <g transform="translate(15, -15)">
                  <rect
                    x="0"
                    y="0"
                    width="120"
                    height="30"
                    rx="4"
                    fill="rgba(0, 0, 0, 0.8)"
                    stroke="#3b82f6"
                    strokeWidth="1"
                  />
                  <text
                    x="10"
                    y="20"
                    fill="white"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {JSON.stringify(particle.data).substring(0, 15)}...
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}

      {/* Node execution status indicators */}
      {nodes.map(node => {
        const isCurrentNode = currentNodeId === node.id;
        const hasBreakpoint = breakpoints.has(node.id);

        if (!isCurrentNode && !hasBreakpoint) return null;

        return (
          <g
            key={`status-${node.id}`}
            transform={`translate(${node.position.x}, ${node.position.y})`}
          >
            {/* Current execution indicator */}
            {isCurrentNode && (
              <>
                <rect
                  x="-4"
                  y="-4"
                  width={(node.width || 150) + 8}
                  height={(node.height || 50) + 8}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  rx="8"
                  strokeDasharray="8,4"
                  className="animate-pulse"
                />
                <g transform={`translate(${(node.width || 150) - 20}, -20)`}>
                  <circle r="10" fill="#10b981" />
                  <path
                    d="M -4 0 L 3 0 L 0 -4 Z L 0 4 Z"
                    fill="white"
                    transform="rotate(90) translate(0, 1)"
                  />
                </g>
              </>
            )}

            {/* Breakpoint indicator */}
            {hasBreakpoint && (
              <g transform={`translate(-20, ${(node.height || 50) / 2})`}>
                <circle r="8" fill="#ef4444" />
                <rect x="-3" y="-3" width="6" height="6" fill="white" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default DataFlowVisualization;