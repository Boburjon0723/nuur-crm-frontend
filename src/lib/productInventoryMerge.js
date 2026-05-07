/**
 * Do‘kon (ERP) zaxirasi — `erp_store_inventory` (CRM ombori emas).
 */
export function mergeErpStoreInventoryRow(product) {
    if (!product || typeof product !== 'object') return product
    const inv = product.erp_store_inventory
    const row = Array.isArray(inv) ? inv[0] : inv
    const next = { ...product }
    if (row && typeof row === 'object') {
        next.stock = row.quantity ?? 0
        next.stock_by_color = row.stock_by_color ?? null
        next.inventory_status = row.status ?? null
    } else {
        next.stock = 0
        next.stock_by_color = null
        next.inventory_status = null
    }
    delete next.erp_store_inventory
    return next
}

/**
 * CRM: `products` + embed `product_inventory`.
 */
export function mergeProductInventoryRow(product) {
  if (!product || typeof product !== 'object') return product
  
  // Handle Prisma format: product.inventory = [{ colorKey, stock }, ...]
  if (Array.isArray(product.inventory)) {
    const next = { ...product }
    const map = {}
    let total = 0
    product.inventory.forEach(item => {
      const q = Number(item.stock) || 0
      map[item.colorKey || 'default'] = q
      total += q
    })
    next.stock = total
    next.stock_by_color = map
    next.inventory_status = deriveInventoryStatusFromQty(total)
    return next
  }

  // Legacy Supabase format
  const inv = product.product_inventory
  const row = Array.isArray(inv) ? inv[0] : inv
  const next = { ...product }
  if (row && typeof row === 'object') {
    next.stock = row.quantity ?? 0
    next.stock_by_color = row.stock_by_color ?? null
    next.inventory_status = row.status ?? null
  } else {
    next.stock = 0
    next.stock_by_color = null
    next.inventory_status = null
  }
  delete next.product_inventory
  return next
}

export function deriveInventoryStatusFromQty(qty) {
  const q = Math.max(0, Math.floor(Number(qty) || 0))
  if (q <= 0) return 'tugagan'
  if (q <= 5) return 'kam_qoldi'
  return 'sotuvda'
}
