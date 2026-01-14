'use client'

import { motion } from 'framer-motion'
import { useCallback, useRef } from 'react'

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface VoiceButtonProps {
  state: RobotState
  onPress: () => void
  onRelease: () => void
  disabled: boolean
}

export default function VoiceButton({ state, onPress, onRelease, disabled }: VoiceButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isIdle = state === 'idle'

  // 統一處理點擊/觸控
  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    // 如果正在聆聽，停止
    if (isListening) {
      onRelease()
      return
    }
    
    // 如果待機中，開始聆聽
    if (isIdle) {
      onPress()
    }
  }, [disabled, isListening, isIdle, onPress, onRelease])

  // 觸控開始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // 防止觸發 mouse 事件
    if (disabled || !isIdle) return
    onPress()
  }, [disabled, isIdle, onPress])

  return (
    <div className="relative">
      {/* 波紋效果 - 聆聽時顯示 */}
      {isListening && (
        <>
          <span className="voice-ripple absolute inset-0 rounded-full bg-robot-blue/30" />
          <span className="voice-ripple absolute inset-0 rounded-full bg-robot-blue/30" />
          <span className="voice-ripple absolute inset-0 rounded-full bg-robot-blue/30" />
        </>
      )}

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        disabled={isThinking || isSpeaking || disabled}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
        className={`
          relative z-10 select-none
          w-24 h-24 rounded-full
          flex items-center justify-center
          transition-all duration-300
          outline-none focus:outline-none
          ${isListening 
            ? 'bg-robot-blue shadow-lg shadow-robot-blue/50' 
            : isThinking
            ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
            : isSpeaking
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : disabled
            ? 'bg-gray-500/30 cursor-not-allowed'
            : 'bg-white/20 hover:bg-white/30 active:bg-robot-blue active:scale-95'
          }
          ${(isThinking || isSpeaking || disabled) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* 圖標 */}
        {isListening ? (
          // 聆聽中 - 音波動畫
          <motion.div 
            className="flex items-end gap-1 h-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-white rounded-full"
                animate={{
                  height: [8, 24, 8],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        ) : isThinking ? (
          // 思考中 - 旋轉
          <motion.svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <circle 
              cx="12" cy="12" r="10" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeDasharray="40 20"
            />
          </motion.svg>
        ) : isSpeaking ? (
          // 說話中 - 音量圖標
          <motion.svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="white"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </motion.svg>
        ) : (
          // 待機 - 麥克風
          <svg 
            width="36" 
            height="36" 
            viewBox="0 0 24 24" 
            fill="white"
          >
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        )}
      </motion.button>

      {/* 按鈕標籤 */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className={`
          text-sm font-medium px-3 py-1.5 rounded-full
          ${isListening ? 'text-robot-blue bg-robot-blue/10' : 
            isThinking ? 'text-yellow-400 bg-yellow-400/10' :
            isSpeaking ? 'text-green-400 bg-green-400/10' :
            'text-gray-400'}
        `}>
          {isListening ? '🎤 聆聽中...' :
           isThinking ? '⏳ 處理中...' :
           isSpeaking ? '🔊 播放中...' :
           '點擊說話'}
        </span>
      </div>
    </div>
  )
}
