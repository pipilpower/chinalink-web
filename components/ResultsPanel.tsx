'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CostBreakdown from './CostBreakdown'

interface ResultsPanelProps {
  result: Record<string, unknown>
  quantity: number
}

export default function ResultsPanel({ result, quantity }: ResultsPanelProps) {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    empresa: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

  const costs = result.costs as any
  const risk = result.risk as any
  const product = result.product as any
  const hs = result.hs as any

  const buildWhatsappMessage = () => {
    const fmtRange = (min: number, max: number) =>
      min === max ? `$${min}` : `$${min} – $${max}`

    return `Hola Chinalink, me interesa importar el siguiente producto:

Producto: ${product?.nombre_producto ?? ''}
URL: ${product?.url ?? ''}
Cantidad: ${quantity} unidades
Costo aterrizado estimado: ${fmtRange(costs?.landed_cost_min, costs?.landed_cost_max)} USD
Costo unitario estimado: ${fmtRange(costs?.costo_unitario_min, costs?.costo_unitario_max)} USD

Mis datos:
Nombre: ${formData.nombre}
Email: ${formData.email}
WhatsApp: ${formData.whatsapp}
Empresa: ${formData.empresa}`
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeadError(null)

    if (!formData.nombre.trim() || !formData.email.trim()) {
      setLeadError('Nombre y email son requeridos')
      return
    }

    setSubmitting(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

      await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          url_producto: product?.url,
          cantidad: quantity,
          raw_result: result,
        }),
      })
    } catch (err) {
      // No bloquear el flujo por un fallo de Supabase — WhatsApp igual debe abrirse
    }

    const mensaje = buildWhatsappMessage()
    window.open(`https://wa.me/50378216321?text=${encodeURIComponent(mensaje)}`, '_blank')

    setSubmitting(false)
    setLeadSubmitted(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="h-full overflow-y-auto scrollbar-thin"
    >
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
          <h2 className="font-sans text-lg font-bold uppercase tracking-widest text-text-primary">
            Análisis Completo
          </h2>
        </div>

        <CostBreakdown
          costs={costs}
          risk={risk}
          hsCode={hs?.hs_code_principal ?? '—'}
          productName={product?.nombre_producto ?? 'Producto'}
          quantity={quantity}
          product={product}
          freight={result.freight as Record<string, unknown>}
        />

        <div className="border-t border-border pt-6">
          <AnimatePresence mode="wait">
            {!showLeadForm && !leadSubmitted && (
              <motion.div
                key="cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <p className="font-sans text-sm text-text-secondary">
                  ¿Quieres que Chinalink gestione esta importación por ti?
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLeadForm(true)}
                  className="w-full rounded-xl bg-secondary px-6 py-4 font-sans text-sm font-bold uppercase tracking-widest text-white transition-all"
                  style={{ boxShadow: '0 0 20px rgba(255,107,43,0.4)' }}
                >
                  QUIERO IMPORTARLO CON CHINALINK
                </motion.button>
              </motion.div>
            )}

            {showLeadForm && !leadSubmitted && (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onSubmit={handleLeadSubmit}
                className="space-y-4"
              >
                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-text-primary">
                  Cuéntanos sobre ti
                </h3>

                {[
                  { name: 'nombre', label: 'Nombre completo', required: true },
                  { name: 'email', label: 'Email', required: true, type: 'email' },
                  { name: 'whatsapp', label: 'WhatsApp (con código de país)', required: false },
                  { name: 'empresa', label: 'Empresa (opcional)', required: false },
                ].map(({ name, label, required, type }) => (
                  <div key={name}>
                    <label className="mb-1 block font-mono text-xs text-text-secondary">
                      {label}
                    </label>
                    <input
                      type={type ?? 'text'}
                      required={required}
                      value={formData[name as keyof typeof formData]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [name]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-colors focus:border-primary"
                    />
                  </div>
                ))}

                {leadError && (
                  <p className="font-mono text-xs text-danger">{leadError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-secondary px-6 py-3 font-sans text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'ENVIAR'}
                </motion.button>
              </motion.form>
            )}

            {leadSubmitted && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-success/50 bg-success/10 p-6 text-center"
              >
                <div className="mb-2 text-3xl">✓</div>
                <h3 className="font-sans font-bold text-success">¡Recibido!</h3>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  Te contactaremos por WhatsApp a la brevedad.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
