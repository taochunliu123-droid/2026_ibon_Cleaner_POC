'use client'

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface StatusIndicatorProps {
  state: RobotState
}

export default function StatusIndicator({ state }: StatusIndicatorProps) {
  const colors = {
    idle: 'bg-gray-400',
    listening: 'bg-robot-blue',
    thinking: 'bg-yellow-400',
    speaking: 'bg-green-400'
  }

  return (
    <div className="relative">
      <div className={`
        w-3 h-3 rounded-full ${colors[state]}
        ${state !== 'idle' ? 'status-indicator' : ''}
      `} />
      {state !== 'idle' && (
        <div className={`
          absolute inset-0 w-3 h-3 rounded-full ${colors[state]} 
          animate-ping opacity-75
        `} />
      )}
    </div>
  )
}
