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
  const [threadId, setThreadId] = useState<string | null>(null)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const robotStateRef = useRef<RobotState>('idle')
  
  useEffect(() => {
    robotStateRef.current = robotState
  }, [robotState])

  // 自動滾動
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 請求麥克風權限
  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      })
      streamRef.current = stream
      setMicPermission('granted')
      setErrorMessage(null)
      return stream
    } catch (error) {
      console.error('Microphone permission error:', error)
      setMicPermission('denied')
      setErrorMessage('請允許麥克風權限才能使用語音功能')
      return null
    }
  }, [])

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

  // 使用 Whisper API 轉錄音訊
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setRobotState('thinking')
    
    try {
      // 建立 FormData
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      const text = data.text?.trim()

      if (text) {
        await sendToAssistant(text)
      } else {
        setErrorMessage('沒有識別到語音內容，請再試一次')
        setRobotState('idle')
      }

    } catch (error) {
      console.error('Transcription error:', error)
      setErrorMessage('語音識別失敗，請再試一次')
      setRobotState('idle')
    }
  }, [sendToAssistant])

  // 開始錄音
  const startListening = useCallback(async () => {
    if (robotStateRef.current !== 'idle') return

    setErrorMessage(null)

    // 取得或請求麥克風權限
    let stream = streamRef.current
    if (!stream || !stream.active) {
      stream = await requestMicPermission()
      if (!stream) return
    }

    try {
      // 重置錄音數據
      audioChunksRef.current = []
      setRecordingTime(0)

      // 決定支援的格式
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          
          // 檢查錄音長度
          if (audioBlob.size < 1000) {
            setErrorMessage('錄音時間太短，請說長一點')
            setRobotState('idle')
            return
          }

          await transcribeAudio(audioBlob)
        } else {
          setRobotState('idle')
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setErrorMessage('錄音發生錯誤')
        setRobotState('idle')
      }

      // 開始錄音
      mediaRecorder.start(100) // 每 100ms 收集一次數據
      setRobotState('listening')

      // 計時器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // 最長 30 秒自動停止
          if (prev >= 30) {
            stopListening()
            return prev
          }
          return prev + 1
        })
      }, 1000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      setErrorMessage('無法啟動錄音')
      setRobotState('idle')
    }
  }, [requestMicPermission, transcribeAudio])

  // 停止錄音
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 處理按鈕點擊
  const handleVoiceButtonPress = useCallback(() => {
    if (robotStateRef.current === 'listening') {
      stopListening()
    } else if (robotStateRef.current === 'idle') {
      startListening()
    }
  }, [startListening, stopListening])

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <audio ref={audioRef} playsInline />

      {/* 頂部狀態列 */}
      <header className="flex-none px-4 py-3 flex items-center justify-between bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <StatusIndicator state={robotState} />
          <span className="text-sm text-gray-300">
            {robotState === 'idle' && '待機中'}
            {robotState === 'listening' && `錄音中 ${recordingTime}s`}
            {robotState === 'thinking' && '處理中...'}
            {robotState === 'speaking' && '回覆中...'}
          </span>
        </div>
        
        {micPermission === 'granted' && (
          <span className="text-xs text-green-400">🎤 已授權</span>
        )}
      </header>

      {/* 錯誤訊息 */}
      {errorMessage && (
        <div className="mx-4 mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
          {errorMessage}
          <button 
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-red-400 hover:text-red-300"
          >
            ✕
          </button>
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
            <p className="text-sm mb-4">點擊麥克風按鈕開始錄音，再次點擊停止</p>
            
            {micPermission === 'prompt' && (
              <button
                onClick={requestMicPermission}
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
            onPress={handleVoiceButtonPress}
            onRelease={() => {}}
            disabled={robotState === 'thinking' || robotState === 'speaking'}
          />
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          {robotState === 'listening' 
            ? '點擊按鈕停止錄音' 
            : micPermission === 'denied' 
            ? '請先授權麥克風權限' 
            : '點擊按鈕開始錄音'}
        </p>
      </footer>
    </main>
  )
}
