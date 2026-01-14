import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'nova' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // 限制文字長度避免費用過高
    const truncatedText = text.slice(0, 4000)

    // 呼叫 OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // 使用標準模型，較快速
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: truncatedText,
      speed: 1.0, // 正常語速
    })

    // 將回應轉換為 ArrayBuffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // 返回音訊檔案
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 }
    )
  }
}
