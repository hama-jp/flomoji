import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSimpleBezierPath, getSmoothStepPath, useReactFlow, EdgeProps } from '@xyflow/react';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  source,
  target,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent, id: string) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
            background: '#ffcc00',
            padding: 10,
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
          className="nodrag nopan"
        >
          <button className="edgebutton" onClick={(event) => onEdgeClick(event, id)}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;