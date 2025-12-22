import { Handle, Position } from '@xyflow/react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useRef, useEffect, useState } from 'react'
import NodeShape from './NodeShape'
import Tooltip from '../Tooltip'

export default function MysteryNode({ id, data }) {
  const isEmpty = data.label === '???'
  const isCorrect = data.isCorrect
  const guessStatus = data.guessStatus
  const isMysteryNode = data.isMysteryNode // Whether this is a mystery/wasMystery node
  const isDraggable = !isEmpty && isMysteryNode // Only mystery nodes are draggable
  const onNodeClick = data.onNodeClick
  const isSelected = data.isSelected

  const clickTimeoutRef = useRef(null)
  const draggedRef = useRef(false)
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

  // Track when dragging starts
  useEffect(() => {
    if (isDragging) {
      draggedRef.current = true
      // Cancel any pending click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
    }
  }, [isDragging])

  // Combine refs for both droppable and draggable
  const setNodeRef = (element) => {
    setDroppableRef(element)
    setDraggableRef(element)
  }

  const handleClick = (e) => {
    // Only handle clicks for mystery nodes
    if (!isMysteryNode) return

    // Set a timer for the click - if drag starts within 200ms, cancel it
    draggedRef.current = false

    clickTimeoutRef.current = setTimeout(() => {
      if (!draggedRef.current && onNodeClick) {
        onNodeClick(id, data.label)
      }
      clickTimeoutRef.current = null
    }, 200)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

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
    bgColor = 'bg-stone-700'
    textColor = 'text-white'
    borderStyle = '2px solid #57534e'
  }

  // Determine shape - mystery nodes are always rectangles
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
        className={`${isOver ? 'opacity-70' : ''} ${isDraggable ? 'cursor-pointer lg:cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-50' : ''} ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
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
