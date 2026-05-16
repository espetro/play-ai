import { streamText } from 'ai'
import { buildProvider, ANTHROPIC_MODELS, OPENAI_MODELS } from '@play-ai/ai'
import {
  getState,
  setState,
  getConfig,
  setConfig,
  getMessages,
  setMessages,
  addMessage,
  clearMessages,
  type AppConfig,
  type ChatMessage,
} from '../lib/storage'
import type { MessageType } from '../lib/messaging'

const activePorts = new Set<chrome.runtime.Port>()

export default defineBackground({
  main() {
    setupInstall()
    setupMessaging()
    setupPorts()
  },
})

function setupInstall() {
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      const url = chrome.runtime.getURL('src/entrypoints/options/index.html')
      chrome.tabs.create({ url })
    }
  })
}

function setupPorts() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') {
      activePorts.add(port)
      port.onDisconnect.addListener(() => {
        activePorts.delete(port)
      })
      port.onMessage.addListener(async (message) => {
        if (message.type === 'GET_STATE') {
          const state = await getState()
          port.postMessage({ type: 'STATE', data: state })
        }
      })
    }
  })
}

function setupMessaging() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const typedMessage = message as MessageType

    if (typedMessage.type === 'GET_STATE') {
      getState().then(sendResponse)
    } else if (typedMessage.type === 'SET_CONFIG') {
      setConfig(typedMessage.payload).then(() => {
        broadcastState({ config: typedMessage.payload })
        sendResponse({ success: true })
      })
    } else if (typedMessage.type === 'SEND_MESSAGE') {
      handleSendMessage(typedMessage.payload, sender, sendResponse)
    } else if (typedMessage.type === 'CLEAR_CHAT') {
      clearMessages(typedMessage.payload.videoId).then(() => {
        broadcastState({})
        sendResponse({ success: true })
      })
    }

    return true
  })
}

async function handleSendMessage(
  payload: { videoId: string; content: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  const { videoId, content } = payload
  const config = await getConfig()

  if (!config) {
    sendResponse({ error: 'No config set' })
    return
  }

  const messages = await getMessages(videoId)
  const userMessage: ChatMessage = {
    id: Math.random().toString(36).substr(2, 9),
    role: 'user',
    content,
    timestamp: Date.now(),
  }

  await addMessage(videoId, userMessage)

  const provider = buildProvider(config)
  const models = config.provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS
  const modelId = (models.includes(config.model as any) ? config.model : models[0]) as string

  // Stream the response
  const assistantMessageId = Math.random().toString(36).substr(2, 9)
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  }

  let fullText = ''

  try {
    const stream = await streamText({
      model: (provider as (id: string) => any)(modelId),
      messages: [
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content },
      ],
      system: 'You are a helpful assistant answering questions about YouTube videos.',
    })

    for await (const chunk of stream.textStream) {
      fullText += chunk
      assistantMessage.content = fullText
      broadcastPartialMessage(videoId, assistantMessage)
    }

    await addMessage(videoId, assistantMessage)
    broadcastState({})
  } catch (error) {
    console.error('Stream error:', error)
    assistantMessage.content = 'Error streaming response'
    await addMessage(videoId, assistantMessage)
    broadcastState({})
  }

  sendResponse({ success: true })
}

async function broadcastState(patch: any) {
  await setState(patch)

  for (const port of activePorts) {
    port.postMessage({ type: 'STATE_UPDATE', patch })
  }

  const tabs = await chrome.tabs.query({
    url: '*://*.youtube.com/*',
  })
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'STATE_UPDATE', patch }).catch(() => {})
    }
  }
}

function broadcastPartialMessage(videoId: string, message: ChatMessage) {
  for (const port of activePorts) {
    port.postMessage({
      type: 'MESSAGE_UPDATE',
      videoId,
      message,
    })
  }

  chrome.tabs.query({ url: '*://*.youtube.com/*' }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'MESSAGE_UPDATE', videoId, message }
        ).catch(() => {})
      }
    }
  })
}
