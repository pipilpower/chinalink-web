const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface SSEEvent {
  agent: string
  status: 'running' | 'complete' | 'partial' | 'error'
  data?: Record<string, unknown>
  message?: string
  fields_needed?: string[]
}

export async function streamEstimate(
  url: string,
  quantity: number,
  onEvent: (event: SSEEvent) => void,
  onError: (error: string) => void,
  overrides?: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, quantity, overrides }),
    })

    if (!response.ok) {
      onError(`HTTP ${response.status}: ${response.statusText}`)
      return
    }

    if (!response.body) {
      onError('No response body')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''

      for (const chunk of lines) {
        const line = chunk.trim()
        if (!line.startsWith('data:')) continue
        const jsonStr = line.slice(5).trim()
        if (!jsonStr) continue

        try {
          const event = JSON.parse(jsonStr) as SSEEvent
          onEvent(event)
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unknown error')
  }
}
