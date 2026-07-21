'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface CostData {
  fob_total: number
  fob_total_max?: number
  flete_min: number
  flete_max: number
  seguro: number
  seguro_max?: number
  cif_min: number
  cif_max: number
  dai_rate: number
  dai_min: number
  dai_max: number
  iva_min: number
  iva_max: number
  gastos_locales: number
  landed_cost_min: number
  landed_cost_max: number
  costo_unitario_min: number
  costo_unitario_max: number
  dacg_aplica: boolean
  advertencias?: { tipo: string; nivel: string; mensaje: string }[]
  precios_venta: {
    margen_35: { min: number; max: number }
    margen_50: { min: number; max: number }
    margen_70: { min: number; max: number }
  }
}

interface RiskData {
  nivel: 'bajo' | 'medio' | 'alto'
  score: number
  factores: { factor: string; impacto: string; detalle: string }[]
  recomendaciones: string[]
}

interface PrecioTier {
  min: number
  max: number | null
  precio: number
  precio_usd?: number
}

interface CostBreakdownProps {
  costs: CostData
  risk: RiskData
  hsCode: string
  productName: string
  quantity: number
  product?: Record<string, unknown>
  freight?: Record<string, unknown>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n)

const fmtRange = (min: number, max: number) =>
  min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`

function Row({
  label,
  value,
  highlight,
  detail,
}: {
  label: string
  value: string
  highlight?: boolean
  detail?: string
}) {
  return (
    <div className={clsx('py-2', highlight ? 'border-t border-border' : '')}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-secondary">{label}</span>
        <span
          className={clsx(
            'font-mono text-sm font-bold',
            highlight ? 'text-primary' : 'text-text-primary'
          )}
        >
          {value}
        </span>
      </div>
      {detail && (
        <p className="mt-0.5 font-mono text-[10px] text-muted">{detail}</p>
      )}
    </div>
  )
}

const RISK_COLORS = {
  bajo: 'text-success border-success',
  medio: 'text-secondary border-secondary',
  alto: 'text-danger border-danger',
}

function buildFobDetail(
  costs: CostData,
  quantity: number,
  product?: Record<string, unknown>,
  freight?: Record<string, unknown>
): string {
  const precioMin = costs.costo_unitario_min
    ? costs.fob_total / quantity
    : null
  const precioMax = costs.fob_total_max
    ? costs.fob_total_max / quantity
    : null

  const moneda = product?.moneda_original as string | undefined
  const tasa = product?.tipo_cambio_aplicado as number | undefined
  const tabla = freight?.precio_tabla as PrecioTier[] | undefined

  // Detectar tier aplicado
  let tierLabel = ''
  if (tabla && tabla.length > 1) {
    const tierAplicado = tabla.find((t) =>
      quantity >= t.min && (t.max === null || quantity <= t.max)
    )
    if (tierAplicado) {
      const rangoStr = tierAplicado.max
        ? `${tierAplicado.min}–${tierAplicado.max} uds`
        : `${tierAplicado.min}+ uds`
      tierLabel = ` · tier ${rangoStr}`
    }
  }

  // Conversión de moneda
  let monedaLabel = ''
  if (moneda && moneda !== 'USD' && tasa) {
    const precioOrigMin = costs.fob_total / quantity / (1 / tasa)
    monedaLabel = ` · convertido de ${moneda} (1 USD = ${tasa} ${moneda})`
  }

  // Precio unitario
  if (precioMin !== null && precioMax !== null && Math.abs(precioMin - precioMax) > 0.01) {
    return `→ ${quantity} uds × ${fmt(precioMin)}–${fmt(precioMax)}/u${tierLabel}${monedaLabel}`
  } else if (precioMin !== null) {
    return `→ ${quantity} uds × ${fmt(precioMin)}/u${tierLabel}${monedaLabel}`
  }

  return ''
}

export default function CostBreakdown({
  costs,
  risk,
  hsCode,
  productName,
  quantity,
  product,
  freight,
}: CostBreakdownProps) {
  const fobDetail = buildFobDetail(costs, quantity, product, freight)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-sans text-xs font-bold uppercase tracking-widest text-text-secondary">
          Producto
        </h3>
        <p className="font-sans text-sm font-semibold text-text-primary">{productName}</p>
        <p className="font-mono text-xs text-text-secondary">
          HS: {hsCode} · Qty: {quantity.toLocaleString()} uds
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="mb-3 font-sans text-xs font-bold uppercase tracking-widest text-text-secondary">
          Desglose de Costos
        </h3>
        <div className="divide-y divide-border/50">
          <Row
            label="FOB Total"
            value={fmtRange(costs.fob_total, costs.fob_total_max ?? costs.fob_total)}
            detail={fobDetail}
          />
          <Row label="Flete Marítimo" value={fmtRange(costs.flete_min, costs.flete_max)} />
          <Row
            label="Seguro (1.5% FOB)"
            value={fmtRange(costs.seguro, costs.seguro_max ?? costs.seguro)}
          />
          <Row
            label="CIF (Total hasta SV)"
            value={fmtRange(costs.cif_min, costs.cif_max)}
            highlight
          />
          <Row
            label={`DAI (${(costs.dai_rate * 100).toFixed(0)}%)`}
            value={fmtRange(costs.dai_min, costs.dai_max)}
          />
          <Row label="IVA (13%)" value={fmtRange(costs.iva_min, costs.iva_max)} />
          <Row label="Gastos Locales" value={fmt(costs.gastos_locales)} />
          <Row
            label="LANDED COST TOTAL"
            value={fmtRange(costs.landed_cost_min, costs.landed_cost_max)}
            highlight
          />
          <Row
            label="Costo Unitario"
            value={fmtRange(costs.costo_unitario_min, costs.costo_unitario_max)}
          />
        </div>
      </div>

      {costs.advertencias && costs.advertencias.length > 0 && (
        <div className="space-y-2">
          {costs.advertencias.map((adv, i) => (
            <div
              key={i}
              className={clsx(
                'rounded-xl border p-3',
                adv.nivel === 'alto'
                  ? 'border-danger/50 bg-danger/10'
                  : 'border-secondary/50 bg-secondary/10'
              )}
            >
              <p className={clsx(
                'font-mono text-xs',
                adv.nivel === 'alto' ? 'text-danger' : 'text-secondary'
              )}>
                ⚠ {adv.mensaje}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="mb-3 font-sans text-xs font-bold uppercase tracking-widest text-text-secondary">
          Precios de Venta Sugeridos
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Margen 35%', data: costs.precios_venta.margen_35 },
            { label: 'Margen 50%', data: costs.precios_venta.margen_50 },
            { label: 'Margen 70%', data: costs.precios_venta.margen_70 },
          ].map(({ label, data }) => (
            <div key={label} className="flex justify-between">
              <span className="font-mono text-xs text-text-secondary">{label}</span>
              <span className="font-mono text-sm font-bold text-success">
                {fmtRange(data.min, data.max)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={clsx('rounded-xl border p-4', RISK_COLORS[risk.nivel])}>
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-xs font-bold uppercase tracking-widest">
            Riesgo de Importación
          </h3>
          <span className="font-mono text-2xl font-bold">{risk.score}/100</span>
        </div>
        <p className="mt-1 font-sans text-sm font-bold uppercase">{risk.nivel}</p>
        {risk.recomendaciones.length > 0 && (
          <ul className="mt-3 space-y-1">
            {risk.recomendaciones.slice(0, 3).map((r, i) => (
              <li key={i} className="font-mono text-xs opacity-80">
                → {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {costs.dacg_aplica && (
        <div className="rounded-xl border border-secondary/50 bg-secondary/10 p-3">
          <p className="font-mono text-xs text-secondary">
            ⚠ FOB supera $5,714.28 — requiere revisión obligatoria DGA (DACG)
          </p>
        </div>
      )}
    </div>
  )
}