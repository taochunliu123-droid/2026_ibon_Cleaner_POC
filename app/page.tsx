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
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // 使用 ref 追蹤狀態
  const robotStateRef = useRef<RobotState>('idle')
  const isWakeWordModeRef = useRef(false)
  
  useEffect(() => {
    robotStateRef.current = robotState
  }, [robotState])
  
  useEffect(() => {
    isWakeWordModeRef.current = isWakeWordMode
  }, [isWakeWordMode])

  // 檢查瀏覽器支援
  const checkBrowserSupport = useCallback(() => {
    if (typeof window === 'undefined') return false
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    return !!SpeechRecognition
  }, [])

  // 請求麥克風權限
  const requestMicPermission = useCallback(async () => {
    try {
      // 使用 getUserMedia 觸發權限請求
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // 取得權限後立即停止，只是為了觸發權限
      stream.getTracks().forEach(track => track.stop())
      setMicPermission('granted')
      setErrorMessage(null)
      return true
    } catch (error) {
      console.error('Microphone permission error:', error)
      setMicPermission('denied')
      setErrorMessage('請允許麥克風權限才能使用語音功能')
      return false
    }
  }, [])

  // 自動滾動
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 發送訊息給 AI
  const sendToAssistant = useCallback(async (userMessage: string) => {
    setRobotState('thinking')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, threadId })
      })

      if (!response.ok) throw new Error('Chat failed')

      const data = await response.json()
      
      if (data.threadId) {
        setThreadId(data.threadId)
      }

      const assistantMessage = data.message
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])

      // 播放 TTS
      setRobotState('speaking')
      
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: assistantMessage })
      })

      if (ttsResponse.ok && audioRef.current) {
        const audioBlob = await ttsResponse.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => {
          setRobotState('idle')
          URL.revokeObjectURL(audioUrl)
        }
        await audioRef.current.play()
      } else {
        setRobotState('idle')
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我遇到了一些問題，請再試一次。' }])
      setRobotState('idle')
    }
  }, [threadId])

  // 開始語音識別 - iOS 需要在點擊事件中直接創建並啟動
  const startListening = useCallback(async () => {
    if (robotStateRef.current !== 'idle') return

    // 檢查瀏覽器支援
    if (!checkBrowserSupport()) {
      setErrorMessage('您的瀏覽器不支援語音識別功能')
      return
    }

    // 先請求麥克風權限
    if (micPermission !== 'granted') {
      const granted = await requestMicPermission()
      if (!granted) return
    }

    setRobotState('listening')
    setCurrentTranscript('')
    setErrorMessage(null)

    try {
      // 每次都創建新的 SpeechRecognition 實例 (iOS 需要)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      // iOS Safari 設定
      recognition.continuous = false  // iOS 不支援 continuous
      recognition.interimResults = true
      recognition.lang = 'zh-TW'
      recognition.maxAlternatives = 1

      let finalResult = ''

      recognition.onresult = (event) => {
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalResult += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setCurrentTranscript(interimTranscript || finalResult)

        if (finalResult) {
          recognition.stop()
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        
        if (event.error === 'not-allowed') {
          setErrorMessage('麥克風權限被拒絕，請在瀏覽器設定中允許')
          setMicPermission('denied')
        } else if (event.error === 'no-speech') {
          setErrorMessage('沒有偵測到語音，請再試一次')
        } else {
          setErrorMessage(`語音識別錯誤: ${event.error}`)
        }
        
        setRobotState('idle')
      }

      recognition.onend = () => {
        if (finalResult.trim()) {
          sendToAssistant(finalResult.trim())
        } else {
          if (robotStateRef.current === 'listening') {
            setRobotState('idle')
          }
        }
      }

      // 直接在用戶手勢中啟動 (iOS 要求)
      recognition.start()

    } catch (error) {
      console.error('Failed to start recognition:', error)
      setErrorMessage('無法啟動語音識別，請重新整理頁面')
      setRobotState('idle')
    }
  }, [micPermission, checkBrowserSupport, requestMicPermission, sendToAssistant])

  // 停止語音識別
  const stopListening = useCallback(() => {
    // 這裡不需要做什麼，因為每次都是新實例
  }, [])

  // 喚醒詞模式開關
  const toggleWakeWordMode = useCallback(() => {
    if (isWakeWordModeRef.current) {
      setIsWakeWordMode(false)
    } else {
      setIsWakeWordMode(true)
      // iOS 上喚醒詞模式不太實用，給個提示
      setErrorMessage('iOS 上建議使用按鈕觸發模式')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }, [])

  // 手動請求權限按鈕
  const handleRequestPermission = useCallback(async () => {
    await requestMicPermission()
  }, [requestMicPermission])

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <audio ref={audioRef} playsInline />

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
        
        {/* 麥克風權限狀態 */}
        <div className="flex items-center gap-2">
          {micPermission === 'denied' && (
            <button
              onClick={handleRequestPermission}
              className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full"
            >
              🔇 重新授權
            </button>
          )}
          {micPermission === 'granted' && (
            <span className="text-xs text-green-400">🎤 已授權</span>
          )}
        </div>
      </header>

      {/* 錯誤訊息 */}
      {errorMessage && (
        <div className="mx-4 mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
          {errorMessage}
        </div>
      )}

      {/* 機器人動畫區 */}
      <section className="flex-none h-[32vh] flex items-center justify-center">
        <RobotAvatar state={robotState} />
      </section>

      {/* 對話區 */}
      <section 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-4">
            <p className="text-lg mb-2">👋 你好！我是智慧客服助理</p>
            <p className="text-sm mb-4">點擊下方麥克風按鈕開始對話</p>
            
            {micPermission === 'prompt' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-robot-blue/20 text-robot-blue rounded-full text-sm hover:bg-robot-blue/30 transition-colors"
              >
                🎤 點擊授權麥克風
              </button>
            )}
          </div>
        )}
        
        {messages.map((msg, index) => (
          <ChatBubble 
            key={index} 
            role={msg.role} 
            content={msg.content} 
          />
        ))}

        {/* 即時轉錄 */}
        {currentTranscript && robotState === 'listening' && (
          <div className="text-center text-robot-blue/70 text-sm italic py-2">
            &quot;{currentTranscript}&quot;
          </div>
        )}

        {/* 思考中 */}
        {robotState === 'thinking' && (
          <div className="flex justify-center gap-1 py-2">
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
            disabled={robotState !== 'idle' || micPermission === 'denied'}
          />
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          {micPermission === 'denied' 
            ? '請先授權麥克風權限' 
            : '點擊按鈕開始說話'}
        </p>
      </footer>
    </main>
  )
}
