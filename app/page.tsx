'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import RobotAvatar from '@/components/RobotAvatar'
import ChatBubble from '@/components/ChatBubble'
import VoiceButton from '@/components/VoiceButton'
import StatusIndicator from '@/components/StatusIndicator'

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [robotState, setRobotState] = useState<RobotState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isWakeWordMode, setIsWakeWordMode] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 初始化語音識別
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'zh-TW'
        recognitionRef.current = recognition
      }
    }
  }, [])

  // 自動滾動到最新訊息
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 播放 TTS 語音
  const playTTS = async (text: string) => {
    try {
      setRobotState('speaking')
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) throw new Error('TTS failed')

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => {
          setRobotState('idle')
          URL.revokeObjectURL(audioUrl)
          // 如果在喚醒詞模式，繼續監聽
          if (isWakeWordMode) {
            startWakeWordListening()
          }
        }
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('TTS error:', error)
      setRobotState('idle')
    }
  }

  // 發送訊息給 AI
  const sendToAssistant = async (userMessage: string) => {
    setRobotState('thinking')
    
    // 添加用戶訊息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          threadId 
        })
      })

      if (!response.ok) throw new Error('Chat failed')

      const data = await response.json()
      
      // 保存 thread ID
      if (data.threadId) {
        setThreadId(data.threadId)
      }

      // 添加 AI 回應
      const assistantMessage = data.message
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])

      // 播放語音
      await playTTS(assistantMessage)

    } catch (error) {
      console.error('Chat error:', error)
      const errorMsg = '抱歉，我遇到了一些問題，請再試一次。'
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
      await playTTS(errorMsg)
    }
  }

  // 開始按鈕式語音識別
  const startListening = useCallback(() => {
    if (!recognitionRef.current || robotState !== 'idle') return

    setRobotState('listening')
    setCurrentTranscript('')

    const recognition = recognitionRef.current
    
    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setCurrentTranscript(interimTranscript || finalTranscript)

      if (finalTranscript) {
        recognition.stop()
        sendToAssistant(finalTranscript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setRobotState('idle')
    }

    recognition.onend = () => {
      if (robotState === 'listening') {
        // 如果沒有結果就結束
        setRobotState('idle')
      }
    }

    recognition.start()
  }, [robotState])

  // 停止語音識別
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // 喚醒詞監聽模式
  const startWakeWordListening = useCallback(() => {
    if (!recognitionRef.current || robotState === 'speaking' || robotState === 'thinking') return

    const recognition = recognitionRef.current
    recognition.continuous = true

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase()
        
        // 檢測喚醒詞
        if (transcript.includes('你好') || transcript.includes('哈囉') || transcript.includes('嗨')) {
          recognition.stop()
          setIsWakeWordMode(false)
          
          // 播放喚醒回應
          const greeting = '你好！有什麼我可以幫助你的嗎？'
          setMessages(prev => [...prev, { role: 'assistant', content: greeting }])
          playTTS(greeting)
          return
        }

        // 如果不是喚醒詞但已經在對話中，處理一般訊息
        if (event.results[i].isFinal && !isWakeWordMode) {
          const finalTranscript = event.results[i][0].transcript
          if (finalTranscript.trim()) {
            recognition.stop()
            sendToAssistant(finalTranscript)
          }
        }
      }
    }

    recognition.onerror = (event) => {
      console.error('Wake word error:', event.error)
      // 5秒後重新開始監聽
      setTimeout(() => {
        if (isWakeWordMode) startWakeWordListening()
      }, 5000)
    }

    recognition.onend = () => {
      // 持續監聽
      if (isWakeWordMode && robotState === 'idle') {
        setTimeout(() => startWakeWordListening(), 100)
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('Failed to start recognition:', e)
    }
  }, [robotState, isWakeWordMode])

  // 切換喚醒詞模式
  const toggleWakeWordMode = () => {
    if (isWakeWordMode) {
      setIsWakeWordMode(false)
      stopListening()
    } else {
      setIsWakeWordMode(true)
      startWakeWordListening()
    }
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* 隱藏的音訊元素 */}
      <audio ref={audioRef} />

      {/* 頂部狀態列 */}
      <header className="flex-none px-4 py-3 flex items-center justify-between bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <StatusIndicator state={robotState} />
          <span className="text-sm text-gray-300">
            {robotState === 'idle' && '待機中'}
            {robotState === 'listening' && '聆聽中...'}
            {robotState === 'thinking' && '思考中...'}
            {robotState === 'speaking' && '回覆中...'}
          </span>
        </div>
        
        {/* 喚醒詞模式開關 */}
        <button
          onClick={toggleWakeWordMode}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            isWakeWordMode 
              ? 'bg-robot-blue text-black' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          {isWakeWordMode ? '🎤 喚醒詞開啟' : '喚醒詞關閉'}
        </button>
      </header>

      {/* 機器人動畫區 */}
      <section className="flex-none h-[35vh] flex items-center justify-center">
        <RobotAvatar state={robotState} />
      </section>

      {/* 對話區 */}
      <section 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 你好！我是智慧客服助理</p>
            <p className="text-sm">點擊下方麥克風按鈕，或說「你好」開始對話</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <ChatBubble 
            key={index} 
            role={msg.role} 
            content={msg.content} 
          />
        ))}

        {/* 即時轉錄顯示 */}
        {currentTranscript && robotState === 'listening' && (
          <div className="text-center text-robot-blue/70 text-sm italic">
            "{currentTranscript}"
          </div>
        )}

        {/* 思考中提示 */}
        {robotState === 'thinking' && (
          <div className="flex justify-center gap-1">
            <span className="thinking-dot w-2 h-2 bg-robot-blue rounded-full"></span>
            <span className="thinking-dot w-2 h-2 bg-robot-blue rounded-full"></span>
            <span className="thinking-dot w-2 h-2 bg-robot-blue rounded-full"></span>
          </div>
        )}
      </section>

      {/* 底部控制區 */}
      <footer className="flex-none px-4 py-6 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <VoiceButton 
            state={robotState}
            onPress={startListening}
            onRelease={stopListening}
            disabled={robotState !== 'idle'}
          />
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-3">
          {isWakeWordMode ? '說「你好」或「嗨」來喚醒我' : '按住按鈕說話'}
        </p>
      </footer>
    </main>
  )
}
