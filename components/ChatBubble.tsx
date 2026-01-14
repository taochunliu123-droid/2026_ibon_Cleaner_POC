'use client'

import { motion } from 'framer-motion'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          chat-bubble max-w-[85%] px-4 py-3 rounded-2xl
          ${isUser 
            ? 'bg-robot-blue text-black rounded-br-md' 
            : 'bg-white/10 text-white rounded-bl-md border border-white/10'
          }
        `}
      >
        {/* 角色標籤 */}
        <div className={`text-xs mb-1 ${isUser ? 'text-black/60' : 'text-gray-400'}`}>
          {isUser ? '您' : '🤖 助理'}
        </div>
        
        {/* 內容 */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </motion.div>
  )
}
