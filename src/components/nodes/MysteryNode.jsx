import { Handle, Position } from '@xyflow/react'
import { useDroppable, useDraggable } from '@dnd-kit/core'

export default function MysteryNode({ id, data }) {
  const isEmpty = data.label === '???'
  const isCorrect = data.isCorrect
  const guessStatus = data.guessStatus
  const isDraggable = !isEmpty

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id })
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

  let bgColor = 'bg-stone-600'
  let textColor = 'text-white'
  let borderStyle = '2px dashed #000'

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
  } else if (!isEmpty) {
    bgColor = 'bg-stone-400'
    textColor = 'text-black'
  }

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        ref={setNodeRef}
        {...(isDraggable ? listeners : {})}
        {...(isDraggable ? attributes : {})}
        className={`px-3 mx-1 py-2.5 rounded text-center min-w-[142px] text-xs ${bgColor} ${textColor} ${isOver ? 'opacity-70' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50' : ''}`}
        style={{ border: borderStyle }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}
