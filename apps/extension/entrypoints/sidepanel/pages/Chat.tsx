import React, { useEffect, useState } from 'react'
import { type Message, ChatMessage as ChatMessageComponent } from '~/components/chat'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { ModelPickerButton } from '~/components/chat/ModelPickerButton'
import { TranscriptBadge } from '~/components/chat/TranscriptBadge'
import { sendMessage } from '../../../lib/messaging'
import { getConfig, type AppConfig, type ChatMessage } from '../../../lib/storage'

export default function Chat() {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [transcriptStatus, setTranscriptStatus] = useState<
    'loading' | 'available' | 'unavailable'
  >('loading')
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

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
                  setTranscriptStatus('loading')
                  checkTranscript(tabs[0].id!, vid)
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
              m.id === msg.id ? { ...m, content: msg.content } : m
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

  const checkTranscript = (tabId: number, videoId: string) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const player = (window as any).ytInitialPlayerResponse
          return !!player?.captions?.playerCaptionsTracklistRenderer
            ?.captionTracks?.length
        },
      },
      (results) => {
        setTranscriptStatus(
          results?.[0]?.result ? 'available' : 'unavailable'
        )
      }
    )
  }

  const handleModelChange = async (model: string) => {
    if (!config) return

    const updated: AppConfig = { ...config, model }
    await sendMessage({
      type: 'SET_CONFIG',
      payload: updated,
    })
    setConfig(updated)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoId || !inputValue.trim()) return

    setIsLoading(true)
    try {
      await sendMessage({
        type: 'SEND_MESSAGE',
        payload: { videoId, content: inputValue },
      })
      setInputValue('')
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
          <p className="text-sm text-muted-foreground mb-2">No video detected</p>
          <p className="text-xs text-muted-foreground">
            Navigate to a YouTube video to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs text-muted-foreground">play-ai</span>
        <TranscriptBadge status={transcriptStatus} />
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <ModelPickerButton config={config} onModelChange={handleModelChange} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-9 text-sm"
          />
          <Button
            size="sm"
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="h-9"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
