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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // 錄音相關 - 使用一個 ref 物件來管理所有錄音狀態
  const recordingRef = useRef<{
    mediaRecorder: MediaRecorder | null
    stream: MediaStream | null
    audioContext: AudioContext | null
    analyser: AnalyserNode | null
    source: MediaStreamAudioSourceNode | null
    chunks: Blob[]
    timer: NodeJS.Timeout | null
    silenceTimer: NodeJS.Timeout | null
    lastSoundTime: number
    isRecording: boolean
  }>({
    mediaRecorder: null,
    stream: null,
    audioContext: null,
    analyser: null,
    source: null,
    chunks: [],
    timer: null,
    silenceTimer: null,
    lastSoundTime: Date.now(),
    isRecording: false
  })

  // 自動滾動
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // iOS 音訊解鎖
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return
    
    if (audioRef.current) {
      audioRef.current.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/OAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      audioRef.current.play().then(() => {
        setAudioUnlocked(true)
      }).catch(() => {})
    }
  }, [audioUnlocked])

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
        audioRef.current.onerror = () => {
          setRobotState('idle')
        }
        
        try {
          await audioRef.current.play()
        } catch (e) {
          setErrorMessage('音訊播放失敗，請點擊畫面後再試')
          setRobotState('idle')
        }
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

  // 完全清理錄音資源
  const cleanupRecording = useCallback(() => {
    const rec = recordingRef.current
    
    // 清理定時器
    if (rec.timer) {
      clearInterval(rec.timer)
      rec.timer = null
    }
    if (rec.silenceTimer) {
      clearInterval(rec.silenceTimer)
      rec.silenceTimer = null
    }
    
    // 斷開音訊節點
    if (rec.source) {
      try { rec.source.disconnect() } catch (e) {}
      rec.source = null
    }
    rec.analyser = null
    
    // 關閉 AudioContext
    if (rec.audioContext && rec.audioContext.state !== 'closed') {
      try { rec.audioContext.close() } catch (e) {}
      rec.audioContext = null
    }
    
    // 停止 MediaStream
    if (rec.stream) {
      rec.stream.getTracks().forEach(track => {
        track.stop()
      })
      rec.stream = null
    }
    
    rec.mediaRecorder = null
    rec.chunks = []
    rec.isRecording = false
  }, [])

  // 停止錄音
  const stopListening = useCallback(() => {
    const rec = recordingRef.current
    
    if (rec.timer) {
      clearInterval(rec.timer)
      rec.timer = null
    }
    if (rec.silenceTimer) {
      clearInterval(rec.silenceTimer)
      rec.silenceTimer = null
    }
    
    if (rec.mediaRecorder && rec.mediaRecorder.state === 'recording') {
      rec.isRecording = false
      rec.mediaRecorder.stop()
    } else {
      // 如果沒有在錄音，直接重置狀態
      cleanupRecording()
      setRobotState('idle')
    }
  }, [cleanupRecording])

  // 開始錄音
  const startListening = useCallback(async () => {
    // 先完全清理之前的錄音
    cleanupRecording()
    
    setErrorMessage(null)
    unlockAudio()

    const rec = recordingRef.current

    try {
      // 獲取新的 MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      rec.stream = stream
      setMicPermission('granted')
      
      // 重置錄音數據
      rec.chunks = []
      rec.lastSoundTime = Date.now()
      setRecordingTime(0)

      // 創建新的 AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      rec.audioContext = new AudioContextClass()
      
      // 確保 AudioContext 在運行
      if (rec.audioContext.state === 'suspended') {
        await rec.audioContext.resume()
      }
      
      // 創建音訊分析器
      rec.source = rec.audioContext.createMediaStreamSource(stream)
      rec.analyser = rec.audioContext.createAnalyser()
      rec.analyser.fftSize = 256
      rec.source.connect(rec.analyser)

      // 決定支援的格式
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      rec.mediaRecorder = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          rec.chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const chunks = [...rec.chunks] // 複製一份
        const currentMimeType = mimeType
        
        // 立即清理資源
        cleanupRecording()

        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: currentMimeType })
          
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

      mediaRecorder.onerror = () => {
        cleanupRecording()
        setErrorMessage('錄音發生錯誤')
        setRobotState('idle')
      }

      // 開始錄音
      mediaRecorder.start(100)
      rec.isRecording = true
      setRobotState('listening')

      // 計時器
      rec.timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopListening()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      // 靜音檢測
      rec.silenceTimer = setInterval(() => {
        if (!rec.analyser || !rec.isRecording) return

        const dataArray = new Uint8Array(rec.analyser.frequencyBinCount)
        rec.analyser.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        
        if (average > 10) {
          rec.lastSoundTime = Date.now()
        } else {
          const silenceDuration = Date.now() - rec.lastSoundTime
          if (silenceDuration > 1500 && rec.isRecording) {
            stopListening()
          }
        }
      }, 100)

    } catch (error) {
      console.error('Failed to start recording:', error)
      cleanupRecording()
      
      if ((error as Error).name === 'NotAllowedError') {
        setMicPermission('denied')
        setErrorMessage('請允許麥克風權限')
      } else {
        setErrorMessage('無法啟動錄音: ' + (error as Error).message)
      }
      setRobotState('idle')
    }
  }, [unlockAudio, transcribeAudio, stopListening, cleanupRecording])

  // 處理按鈕點擊
  const handleVoiceButtonPress = useCallback(() => {
    unlockAudio()
    
    if (robotState === 'listening') {
      stopListening()
    } else if (robotState === 'idle') {
      startListening()
    }
  }, [robotState, startListening, stopListening, unlockAudio])

  // 點擊頁面解鎖音訊
  const handlePageClick = useCallback(() => {
    unlockAudio()
  }, [unlockAudio])

  // 請求權限按鈕
  const handleRequestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setMicPermission('granted')
      unlockAudio()
    } catch (e) {
      setMicPermission('denied')
      setErrorMessage('麥克風權限被拒絕')
    }
  }, [unlockAudio])

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      cleanupRecording()
    }
  }, [cleanupRecording])

  return (
    <main className="h-screen flex flex-col overflow-hidden" onClick={handlePageClick}>
      <audio ref={audioRef} playsInline preload="auto" />

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
        
        <div className="flex items-center gap-2">
          {micPermission === 'granted' && (
            <span className="text-xs text-green-400">🎤</span>
          )}
          {audioUnlocked && (
            <span className="text-xs text-blue-400">🔊</span>
          )}
        </div>
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
            <p className="text-sm mb-4">點擊麥克風按鈕開始說話，說完會自動停止</p>
            
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
            ? '說完後會自動停止' 
            : micPermission === 'denied' 
            ? '請先授權麥克風權限' 
            : '點擊按鈕開始說話'}
        </p>
      </footer>
    </main>
  )
}
