import React, { useEffect, useState } from 'react'
import { ChatShell, type Message } from '@play-ai/ui/chat'
import { sendMessage } from '../../../lib/messaging'
import { extractVideoId } from '../../../lib/youtube'
import type { ChatMessage } from '../../../lib/storage'

export default function Chat() {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'sidepanel' })

    const checkVideo = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              func: () => window.location.search,
            },
            (results) => {
              if (results?.[0]?.result) {
                const urlParams = new URLSearchParams(results[0].result)
                const vid = urlParams.get('v')
                if (vid && vid.length === 11) {
                  setVideoId(vid)
                }
              }
            }
          )
        }
      })
    }

    checkVideo()
    const interval = setInterval(checkVideo, 2000)

    const handleMessage = (message: any) => {
      if (message.type === 'MESSAGE_UPDATE' && message.videoId === videoId) {
        const msg = message.message as ChatMessage
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === msg.id)
          if (existing) {
            return prev.map((m) =>
              m.id === msg.id
                ? { ...m, content: msg.content }
                : m
            )
          }
          return [...prev, msg]
        })
      }
    }

    port.onMessage.addListener(handleMessage)

    return () => {
      clearInterval(interval)
      port.disconnect()
    }
  }, [videoId])

  const handleSendMessage = async (content: string) => {
    if (!videoId) return

    setIsLoading(true)
    try {
      await sendMessage({
        type: 'SEND_MESSAGE',
        payload: { videoId, content },
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <div>
          <p className="text-sm text-gray-600 mb-2">No video detected</p>
          <p className="text-xs text-gray-500">
            Navigate to a YouTube video to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <ChatShell
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}
