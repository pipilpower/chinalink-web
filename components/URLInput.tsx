'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface URLInputProps {
  onSubmit: (url: string, quantity: number, overrides?: Record<string, unknown>) => void
  isLoading: boolean
}

export default function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState('')
  const [quantity, setQuantity] = useState(100)
  const [error, setError] = useState('')
  const [showPrecio, setShowPrecio] = useState(false)
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Ingresa la URL del producto')
      return
    }
    try {
      new URL(url.trim())
    } catch {
      setError('URL inválida. Asegúrate de incluir https://')
      return
    }
    if (quantity < 1 || quantity > 100000) {
      setError('La cantidad debe estar entre 1 y 100,000 unidades')
      return
    }

    // Construir overrides si el usuario ingresó precio manual
    const overrides: Record<string, unknown> = {}
    if (showPrecio && precioMin) {
      const min = parseFloat(precioMin)
      if (isNaN(min) || min <= 0) {
        setError('Precio mínimo inválido')
        return
      }
      overrides.precio_usd_min = min
      overrides.moneda_original = 'USD'

      if (precioMax) {
        const max = parseFloat(precioMax)
        if (isNaN(max) || max < min) {
          setError('El precio máximo debe ser mayor al mínimo')
          return
        }
        overrides.precio_usd_max = max
      } else {
        overrides.precio_usd_max = min
      }
    }

    onSubmit(url.trim(), quantity, Object.keys(overrides).length > 0 ? overrides : undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
      <div>
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-text-secondary">
          URL del Producto
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://es.made-in-china.com/producto/..."
          disabled={isLoading}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-text-primary placeholder-muted outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <p className="font-mono text-xs text-muted">
          Chinalink extrae datos directamente de la página del proveedor.{' '}
          Made-in-China permite este acceso — Alibaba lo bloquea.
        </p>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-text-secondary">
          Cantidad (unidades)
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          min={1}
          max={100000}
          disabled={isLoading}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Precio manual opcional */}
      <div>
        <button
          type="button"
          onClick={() => setShowPrecio(!showPrecio)}
          className="font-mono text-xs text-muted transition-colors hover:text-primary"
        >
          {showPrecio ? '− Ocultar precio manual' : '+ Ingresar precio manualmente (opcional)'}
        </button>

        <AnimatePresence>
          {showPrecio && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="rounded-xl border border-border/50 bg-surface/30 p-4 space-y-3">
                <p className="font-mono text-[10px] text-muted">
                  Si conoces el precio unitario FOB en USD, ingrésalo aquí. Tiene prioridad sobre el precio extraído de la página.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-text-secondary">
                      Precio mínimo (USD)
                    </label>
                    <input
                      type="number"
                      value={precioMin}
                      onChange={(e) => setPrecioMin(e.target.value)}
                      placeholder="ej. 24.50"
                      step="0.01"
                      min="0"
                      disabled={isLoading}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-text-secondary">
                      Precio máximo (USD)
                    </label>
                    <input
                      type="number"
                      value={precioMax}
                      onChange={(e) => setPrecioMax(e.target.value)}
                      placeholder="opcional"
                      step="0.01"
                      min="0"
                      disabled={isLoading}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-xs text-danger"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-xl bg-primary px-6 py-4 font-sans text-sm font-bold uppercase tracking-widest text-bg transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ boxShadow: isLoading ? 'none' : '0 0 20px rgba(0,212,255,0.4)' }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block h-4 w-4 rounded-full border-2 border-bg border-t-transparent"
            />
            Analizando...
          </span>
        ) : (
          'CALCULAR COSTO DE IMPORTACIÓN'
        )}
      </motion.button>
    </form>
  )
}