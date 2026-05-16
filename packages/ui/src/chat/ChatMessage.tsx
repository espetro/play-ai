import React from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-2 ${
          isAssistant
            ? 'bg-gray-200 text-gray-900'
            : 'bg-blue-500 text-white'
        }`}
      >
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  )
}
