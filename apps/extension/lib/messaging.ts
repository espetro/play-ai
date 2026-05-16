export type MessageType =
  | { type: 'GET_STATE' }
  | { type: 'SET_CONFIG'; payload: any }
  | { type: 'SEND_MESSAGE'; payload: { videoId: string; content: string } }
  | { type: 'CLEAR_CHAT'; payload: { videoId: string } }
  | { type: 'STATE_UPDATE'; patch: any }
  | { type: 'TEST_CONNECTION'; payload: { provider: 'anthropic' | 'openai'; baseUrl: string; apiKey: string } }

export async function sendMessage<T = unknown>(
  message: MessageType
): Promise<T> {
  return chrome.runtime.sendMessage(message)
}

export function onMessage(
  callback: (message: MessageType, sender: chrome.runtime.MessageSender) => Promise<any>
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    callback(message, sender).then(sendResponse).catch(console.error)
    return true
  })
}
