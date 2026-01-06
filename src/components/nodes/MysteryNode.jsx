import { Handle, Position } from '@xyflow/react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import NodeShape from './NodeShape'
import Tooltip from '../Tooltip'

export default function MysteryNode({ id, data }) {
  const isEmpty = data.label === '???'
  const isCorrect = data.isCorrect
  const guessStatus = data.guessStatus
  const isMysteryNode = data.isMysteryNode // Whether this is a mystery/wasMystery node
  const isDraggable = !isEmpty && isMysteryNode // Only filled mystery nodes are draggable
  const onNodeClick = data.onNodeClick
  const isSelected = data.isSelected
  const justRevealed = data.justRevealed

  const [hideTooltip, setHideTooltip] = useState(false)

  // Only make mystery nodes droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: !isMysteryNode // Disable dropping on non-mystery nodes
  })
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging
  } = useDraggable({
    id: `node-${id}`,
    data: { nodeId: id, label: data.label },
    disabled: !isDraggable
  })

  // Combine refs for both droppable and draggable
  const setNodeRef = (element) => {
    setDroppableRef(element)
    setDraggableRef(element)
  }

  const handleClick = () => {
    // Delay-based activation ensures onClick only fires for quick clicks
    // Long holds trigger drag instead
    if (onNodeClick) {
      onNodeClick(id, data.label, isMysteryNode)
    }
  }

  let bgColor = 'bg-stone-600'
  let textColor = 'text-white'
  let borderStyle = isMysteryNode ? '2px dashed #000' : '2px solid #000' // Solid border for non-mystery nodes

  if (guessStatus === 'correct') {
    bgColor = 'bg-green-200'
    textColor = 'text-black'
    borderStyle = '2px solid #15803d'
  } else if (guessStatus === 'wrong-position') {
    bgColor = 'bg-yellow-200'
    textColor = 'text-black'
    borderStyle = '2px dashed #ca8a04'
  } else if (guessStatus === 'incorrect') {
    bgColor = 'bg-red-200'
    textColor = 'text-black'
    borderStyle = '2px dashed #dc2626'
  } else if (!isEmpty && isMysteryNode) {
    bgColor = 'bg-stone-400'
    textColor = 'text-black'
  } else if (!isEmpty && !isMysteryNode) {
    // Regular non-mystery nodes
    bgColor = 'bg-stone-100'
    textColor = 'text-black'
    borderStyle = '2px solid #d6d3d1'
  }

  // Mystery nodes (???) are always rectangles until guessed
  const nodeShape = isEmpty ? 'rectangle' : (data.componentInfo?.shape || 'rectangle')

  // Get tooltip info (only show for non-empty, non-mystery nodes)
  const showTooltip = !isEmpty && data.componentInfo?.description
  const tooltipDescription = data.componentInfo?.description
  const tooltipLink = data.componentInfo?.link

  const handleMouseDown = () => {
    setHideTooltip(true)
  }

  const handleMouseEnter = () => {
    setHideTooltip(false)
  }

  const nodeContent = (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        ref={setNodeRef}
        {...(isDraggable ? listeners : {})}
        {...(isDraggable ? attributes : {})}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        className={`nopan ${isOver ? 'opacity-70' : ''} ${isDraggable ? 'cursor-pointer lg:cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-50' : ''} ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
        style={justRevealed ? {
          animation: 'revealNode 0.5s ease-out',
        } : {}}
      >
        <NodeShape
          shape={nodeShape}
          bgColor={bgColor}
          textColor={textColor}
          borderStyle={borderStyle}
        >
          {data.label}
        </NodeShape>
      </div>
      <Handle type="source" position={Position.Bottom} />
      <style>{`
        @keyframes revealNode {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )

  // Wrap in tooltip if available
  if (showTooltip) {
    return (
      <Tooltip description={tooltipDescription} link={tooltipLink} isDragging={isDragging || hideTooltip}>
        {nodeContent}
      </Tooltip>
    )
  }

  return nodeContent
}
