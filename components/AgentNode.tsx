'use client'

// Types kept here for backward compatibility with any imports
export type AgentStatus = 'idle' | 'running' | 'complete' | 'partial' | 'error'

export interface AgentState {
  status: AgentStatus
  message?: string
  data?: Record<string, unknown>
}

export default function AgentNode() {
  return null
}
