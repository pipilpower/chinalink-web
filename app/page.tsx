'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import URLInput from '@/components/URLInput'
import AgentVisualizer, { AgentState } from '@/components/AgentVisualizer'
import ResultsPanel from '@/components/ResultsPanel'
import { streamEstimate, SSEEvent } from '@/lib/sse'

const INITIAL_AGENTS: Record<string, AgentState> = {
  scraper: { status: 'idle' },
  hs_classifier: { status: 'idle' },
  freight_estimator: { status: 'idle' },
  cost_engine: { status: 'idle' },
  risk_assessor: { status: 'idle' },
}

interface PartialFields {
  fields_needed: string[]
  product_data: Record<string, unknown>
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [agents, setAgents] = useState<Record<string, AgentState>>(INITIAL_AGENTS)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [quantity, setQuantity] = useState(100)
  const [partialFields, setPartialFields] = useState<PartialFields | null>(null)
  const [partialOverrides, setPartialOverrides] = useState<Record<string, unknown>>({})
  const [currentUrl, setCurrentUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const updateAgent = useCallback((id: string, update: Partial<AgentState>) => {
    setAgents((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...update },
    }))
  }, [])

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      if (event.agent === 'complete') {
        setResult(event.data as Record<string, unknown>)
        setIsLoading(false)
        return
      }

      if (event.agent === 'scraper' && event.status === 'partial') {
        setPartialFields({
          fields_needed: event.fields_needed ?? [],
          product_data: event.data ?? {},
        })
        updateAgent('scraper', { status: 'partial', message: event.message, data: event.data })
        setIsLoading(false)
        return
      }

      if (event.agent === 'scraper' && event.status === 'blocked') {
        setError(event.message ?? 'Este proveedor bloqueó el acceso automatizado.')
        updateAgent('scraper', { status: 'blocked', message: event.message })
        setIsLoading(false)
        return
      }

      if (event.agent === 'system' && event.status === 'error') {
        setError(event.message ?? 'Error desconocido')
        setIsLoading(false)
        return
      }

      updateAgent(event.agent, {
        status: event.status,
        message: event.message,
        data: event.data,
      })
    },
    [updateAgent]
  )

  const runEstimate = useCallback(
    async (url: string, qty: number, overrides?: Record<string, unknown>) => {
      setCurrentUrl(url)
      setQuantity(qty)
      setError(null)
      setResult(null)
      setPartialFields(null)
      setAgents(INITIAL_AGENTS)
      setIsLoading(true)

      await streamEstimate(
        url,
        qty,
        handleEvent,
        (err) => {
          setError(err)
          setIsLoading(false)
        },
        overrides
      )
    },
    [handleEvent]
  )

  const handleSubmit = (url: string, qty: number, overrides?: Record<string, unknown>) => {
    runEstimate(url, qty, overrides)
  }

  const handlePartialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runEstimate(currentUrl, quantity, { ...partialOverrides })
  }

  const isActive = isLoading || result !== null || partialFields !== null

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Red Neuronal de Inteligencia Comercial
        </div>
        <h1 className="font-sans text-4xl font-extrabold uppercase tracking-tight text-text-primary md:text-5xl">
          CHINA<span className="text-primary">LINK</span>
        </h1>
        <p className="mt-3 font-sans text-sm text-text-secondary">
          Estimador agéntico de costos de importación China → El Salvador
        </p>
      </motion.div>

      {!isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex w-full max-w-2xl flex-col items-center gap-8"
        >
          <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
        </motion.div>
      )}

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex w-full max-w-6xl flex-col gap-8 lg:flex-row"
          >
            <div className="flex flex-1 flex-col items-center gap-6">
              {isActive && (
                <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
              )}

              <AgentVisualizer agents={agents} />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-lg rounded-xl border border-danger/50 bg-danger/10 p-4"
                >
                  <p className="font-mono text-sm text-danger">Error: {error}</p>
                  <button
                    onClick={() => {
                      setError(null)
                      setAgents(INITIAL_AGENTS)
                      setIsLoading(false)
                    }}
                    className="mt-2 font-mono text-xs text-text-secondary underline"
                  >
                    Intentar de nuevo
                  </button>
                </motion.div>
              )}

              {partialFields && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-lg rounded-xl border border-secondary/50 bg-secondary/10 p-6"
                >
                  <h3 className="mb-4 font-sans text-sm font-bold uppercase tracking-widest text-secondary">
                    Datos faltantes — completa manualmente
                  </h3>
                  <form onSubmit={handlePartialSubmit} className="space-y-3">
                    {partialFields.fields_needed.map((field) => (
                      <div key={field}>
                        <label className="mb-1 block font-mono text-xs text-text-secondary">
                          {field}
                        </label>
                        <input
                          type={field.includes('precio') || field.includes('peso') || field.includes('cm') || field.includes('moq') ? 'number' : 'text'}
                          step="any"
                          onChange={(e) =>
                            setPartialOverrides((prev) => ({
                              ...prev,
                              [field]: field.includes('precio') || field.includes('peso') || field.includes('cm') || field.includes('moq')
                                ? parseFloat(e.target.value)
                                : e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-surface px-4 py-2 font-mono text-sm text-text-primary outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-secondary py-3 font-sans text-sm font-bold uppercase tracking-widest text-white"
                    >
                      CONTINUAR ANÁLISIS
                    </button>
                  </form>
                </motion.div>
              )}
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full rounded-2xl border border-border bg-surface lg:w-[440px]"
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
              >
                <ResultsPanel result={result} quantity={quantity} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
