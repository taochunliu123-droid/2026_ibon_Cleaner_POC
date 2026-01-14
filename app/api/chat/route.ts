import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!

export async function POST(request: NextRequest) {
  try {
    const { message, threadId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 創建或使用現有的 thread
    let currentThreadId = threadId
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create()
      currentThreadId = thread.id
    }

    // 添加用戶訊息到 thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message,
    })

    // 執行 Assistant
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
    })

    // 等待執行完成
    let runStatus = await openai.beta.threads.runs.retrieve(
      currentThreadId,
      run.id
    )

    // 輪詢檢查狀態
    const maxAttempts = 60 // 最多等待 60 秒
    let attempts = 0
    
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id
      )
      attempts++
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Response timeout')
    }

    // 獲取回應訊息
    const messages = await openai.beta.threads.messages.list(currentThreadId)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant')

    if (!assistantMessage) {
      throw new Error('No assistant message found')
    }

    // 提取文字內容
    let responseText = ''
    for (const content of assistantMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value
      }
    }

    return NextResponse.json({
      message: responseText,
      threadId: currentThreadId,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
