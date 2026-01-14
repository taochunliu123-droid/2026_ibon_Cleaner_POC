'use client'

import { motion } from 'framer-motion'

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface RobotAvatarProps {
  state: RobotState
}

export default function RobotAvatar({ state }: RobotAvatarProps) {
  // 根據狀態定義眼睛動畫
  const eyeAnimation = {
    idle: {
      scale: [1, 1.05, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    listening: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
    },
    thinking: {
      x: [-3, 3, -3],
      transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
    },
    speaking: {
      scale: 1,
      transition: { duration: 0.1 }
    }
  }

  // 嘴巴動畫
  const mouthAnimation = {
    idle: {
      scaleY: 1,
      height: 15,
    },
    listening: {
      scaleY: 1,
      height: 12,
    },
    thinking: {
      scaleY: 1,
      height: 8,
    },
    speaking: {
      scaleY: [1, 0.3, 1, 0.5, 1],
      height: 20,
      transition: { duration: 0.3, repeat: Infinity, ease: "easeInOut" }
    }
  }

  // 整體身體呼吸動畫
  const bodyAnimation = {
    idle: {
      y: [0, -5, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    listening: {
      y: 0,
      scale: [1, 1.02, 1],
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
    },
    thinking: {
      y: [0, -3, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    },
    speaking: {
      y: 0,
      transition: { duration: 0.1 }
    }
  }

  return (
    <motion.div 
      className="relative"
      animate={bodyAnimation[state]}
    >
      {/* 外發光效果 */}
      <div className={`absolute inset-0 blur-3xl rounded-full transition-all duration-500 ${
        state === 'listening' ? 'bg-robot-blue/30 scale-150' :
        state === 'speaking' ? 'bg-green-400/20 scale-130' :
        state === 'thinking' ? 'bg-yellow-400/20 scale-120' :
        'bg-robot-blue/10 scale-100'
      }`} />

      {/* 機器人 SVG */}
      <svg 
        width="220" 
        height="260" 
        viewBox="0 0 220 260" 
        className="relative z-10"
      >
        {/* 天線 */}
        <motion.g
          animate={state === 'listening' ? {
            y: [0, -3, 0],
            transition: { duration: 0.5, repeat: Infinity }
          } : {}}
        >
          <line 
            x1="110" y1="30" 
            x2="110" y2="10" 
            stroke="#ffffff" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          <motion.circle 
            cx="110" 
            cy="8" 
            r="6" 
            fill={state === 'listening' ? '#00D4FF' : '#ffffff'}
            className={state === 'listening' ? 'listening-indicator' : ''}
            animate={state === 'listening' ? {
              fill: ['#00D4FF', '#00FF88', '#00D4FF'],
              transition: { duration: 0.8, repeat: Infinity }
            } : {}}
          />
        </motion.g>

        {/* 頭部 */}
        <rect 
          x="35" y="30" 
          width="150" height="100" 
          rx="25" 
          fill="#f0f0f0"
          stroke="#e0e0e0"
          strokeWidth="2"
        />
        
        {/* 頭部內部螢幕區 */}
        <rect 
          x="50" y="45" 
          width="120" height="70" 
          rx="15" 
          fill="#1a1a2e"
        />

        {/* 左眼 */}
        <motion.ellipse 
          cx="80" 
          cy="80" 
          rx="18" 
          ry="18" 
          fill="#00D4FF"
          animate={eyeAnimation[state]}
          style={{ 
            filter: 'drop-shadow(0 0 10px #00D4FF)',
            transformOrigin: 'center'
          }}
        />

        {/* 右眼 */}
        <motion.ellipse 
          cx="140" 
          cy="80" 
          rx="18" 
          ry="18" 
          fill="#00D4FF"
          animate={eyeAnimation[state]}
          style={{ 
            filter: 'drop-shadow(0 0 10px #00D4FF)',
            transformOrigin: 'center'
          }}
        />

        {/* 眼睛高光 */}
        <circle cx="86" cy="74" r="5" fill="rgba(255,255,255,0.6)" />
        <circle cx="146" cy="74" r="5" fill="rgba(255,255,255,0.6)" />

        {/* 嘴巴 */}
        <motion.rect 
          x="95" 
          y="98" 
          width="30" 
          rx="5"
          fill="#00D4FF"
          animate={mouthAnimation[state]}
          style={{ 
            filter: 'drop-shadow(0 0 5px #00D4FF)',
            transformOrigin: 'center'
          }}
        />

        {/* 身體 */}
        <rect 
          x="55" y="140" 
          width="110" height="90" 
          rx="20" 
          fill="#f0f0f0"
          stroke="#e0e0e0"
          strokeWidth="2"
        />

        {/* 身體中央面板 */}
        <rect 
          x="70" y="155" 
          width="80" height="60" 
          rx="10" 
          fill="#ffffff"
          stroke="#e8e8e8"
          strokeWidth="1"
        />

        {/* 播放/狀態圖標區 */}
        <g transform="translate(85, 165)">
          {state === 'idle' && (
            <>
              <rect x="5" y="5" width="40" height="40" rx="8" fill="#FF8C00" />
              <polygon points="20,12 20,38 38,25" fill="white" />
            </>
          )}
          {state === 'listening' && (
            <>
              <rect x="5" y="5" width="40" height="40" rx="8" fill="#00D4FF" />
              {/* 音波圖標 */}
              <motion.g
                animate={{ opacity: [0.5, 1, 0.5], transition: { duration: 0.5, repeat: Infinity } }}
              >
                <rect x="15" y="15" width="4" height="20" rx="2" fill="white" />
                <rect x="23" y="10" width="4" height="30" rx="2" fill="white" />
                <rect x="31" y="18" width="4" height="14" rx="2" fill="white" />
              </motion.g>
            </>
          )}
          {state === 'thinking' && (
            <>
              <rect x="5" y="5" width="40" height="40" rx="8" fill="#FFD700" />
              {/* 思考圖標 */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: '25px 25px' }}
              >
                <circle cx="25" cy="25" r="12" fill="none" stroke="white" strokeWidth="3" strokeDasharray="20 10" />
              </motion.g>
            </>
          )}
          {state === 'speaking' && (
            <>
              <rect x="5" y="5" width="40" height="40" rx="8" fill="#00FF88" />
              {/* 說話圖標 */}
              <motion.g
                animate={{ scale: [1, 1.1, 1], transition: { duration: 0.3, repeat: Infinity } }}
                style={{ transformOrigin: '25px 25px' }}
              >
                <circle cx="25" cy="25" r="8" fill="white" />
                <circle cx="25" cy="25" r="12" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                <circle cx="25" cy="25" r="16" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
              </motion.g>
            </>
          )}
        </g>

        {/* 左手 */}
        <motion.g
          animate={state === 'speaking' ? {
            rotate: [0, 5, 0, -5, 0],
            transition: { duration: 0.5, repeat: Infinity }
          } : {}}
          style={{ transformOrigin: '45px 170px' }}
        >
          <rect x="30" y="155" width="20" height="50" rx="10" fill="#f0f0f0" stroke="#e0e0e0" strokeWidth="2" />
        </motion.g>

        {/* 右手 */}
        <motion.g
          animate={state === 'listening' ? {
            rotate: [0, -10, 0],
            transition: { duration: 1, repeat: Infinity }
          } : {}}
          style={{ transformOrigin: '175px 170px' }}
        >
          <rect x="170" y="155" width="20" height="50" rx="10" fill="#f0f0f0" stroke="#e0e0e0" strokeWidth="2" />
        </motion.g>

        {/* 底座 */}
        <ellipse cx="110" cy="240" rx="60" ry="15" fill="#e0e0e0" />
        <ellipse cx="110" cy="238" rx="55" ry="12" fill="#f0f0f0" />
      </svg>

      {/* 狀態文字標籤 */}
      <motion.div 
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-medium px-3 py-1 rounded-full"
        animate={{
          backgroundColor: state === 'listening' ? 'rgba(0, 212, 255, 0.2)' :
                          state === 'thinking' ? 'rgba(255, 215, 0, 0.2)' :
                          state === 'speaking' ? 'rgba(0, 255, 136, 0.2)' :
                          'rgba(255, 255, 255, 0.1)',
          color: state === 'listening' ? '#00D4FF' :
                 state === 'thinking' ? '#FFD700' :
                 state === 'speaking' ? '#00FF88' :
                 '#888888'
        }}
      >
        {state === 'idle' && '準備就緒'}
        {state === 'listening' && '🎤 聽您說...'}
        {state === 'thinking' && '🤔 思考中...'}
        {state === 'speaking' && '🔊 回覆中...'}
      </motion.div>
    </motion.div>
  )
}
