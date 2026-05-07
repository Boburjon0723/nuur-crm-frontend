'use client';
import React from 'react';
import { 
  X, 
  ScanLine, 
  Save, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { 
  formatUsd, 
  computeOrderLineSubtotal, 
  labelColorCanonical,
  parseOrderItemQty,
} from '../utils';

export default function OrderFormDialog({
  t,
  isAdding,
  editId,
  orderFormPanelRef,
  handleSubmit,
  form,
  setForm,
  customers,
  tableConfig,
  setTableConfig,
  orderFormTableRows,
  firstCodeLineId,
  firstModelCodeRef,
  updateOrderLine,
  resolveOrderLine,
  applyVariantToLine,
  updateOrderLineColorQty,
  removeOrderLine,
  commitLineToSortOrder,
  addOrderLine,
  isSavingOrder,
  handleCancel,
  productColors,
  language,
  products
}) {
  if (!isAdding) return null;

  const formImageCellClass = "w-10 h-10 sm:w-12 sm:h-12";
  const [previewImageUrl, setPreviewImageUrl] = React.useState('');

  return (
    <div
      ref={orderFormPanelRef}
      className={`bg-[#0c0c14]/90 backdrop-blur-3xl p-6 lg:p-10 rounded-[2.5rem] mb-8 fade-in scroll-mt-24 shadow-3xl relative overflow-hidden ${
        editId
          ? 'border border-blue-500/50 shadow-blue-500/20 shadow-2xl ring-1 ring-blue-500/30'
          : 'border border-white/10'
      }`}
    >
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />
      <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 relative z-10">
        {editId ? t('orders.editOrder') : t('orders.newOrder')}
      </h3>
      {editId && (
        <p className="text-[11px] font-bold text-blue-400 mb-8 leading-relaxed border-l-4 border-blue-500/50 pl-4 py-2 bg-blue-500/10 rounded-r-2xl w-fit relative z-10">
          {t('orders.editOrderLinesHint')}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
          <div className="space-y-3 md:col-span-2 lg:col-span-3 border border-white/5 bg-white/[0.02] p-5 lg:p-6 rounded-[1.5rem]">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{t('orders.customer')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 group">
                <input
                  type="text"
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder:text-white/20 font-bold"
                  placeholder={t('orders.customerNamePlaceholder') || "Mijoz ismi (majburiy)"}
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  list="crm-customer-name-hints"
                  required
                  autoComplete="off"
                />
                <datalist id="crm-customer-name-hints">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <input
                  type="tel"
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder:text-white/20 font-mono font-bold"
                  placeholder={t('orders.customerPhonePlaceholder') || "Telefon raqami (ixtiyoriy)"}
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <input
                  type="text"
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder:text-white/20 font-bold"
                  placeholder={t('orders.deliveryAddress') || "Yetkazib berish manzili"}
                  value={form.customer_address || ''}
                  onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                />
              </div>
            </div>
          </div>


          <div className="space-y-4 md:col-span-2 lg:col-span-3 border border-white/5 bg-white/[0.02] p-5 lg:p-6 rounded-[1.5rem]">
            <label className="block text-[14px] font-black uppercase tracking-[0.2em] text-white">{t('common.products')}</label>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="uppercase tracking-widest font-bold text-[10px]">{t('orders.orderLinesIntro')}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                  <ScanLine size={12} />
                  {t('orders.barcodeHint')}
                </span>
              </div>
              <p className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 leading-snug uppercase tracking-widest font-bold">
                {t('orders.modelCodeFormatHint')}
              </p>
            </div>


            <div className="border border-white/10 rounded-3xl overflow-hidden bg-[#0c0c14] shadow-2xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-base min-w-[720px]">
                  <thead>
                    <tr className="bg-white/5 text-left text-[9px] uppercase tracking-[0.2em] text-white/30 font-black border-b border-white/10">
                      <th className="px-3 py-2 w-36">{t('orders.modelCode')}</th>
                      <th className="px-3 py-2 w-28" />
                      {tableConfig.showFormImageColumn && <th className="px-3 py-2 w-28">Rasm</th>}
                      <th className="px-3 py-2">{t('orders.lineProduct')}</th>
                      <th className="px-3 py-2 min-w-[8rem] max-w-[16rem]">{t('orders.lineItemNote')}</th>
                      {tableConfig.showFormColorColumn && <th className="px-3 py-2 min-w-[200px]">{t('orders.lineColor')}</th>}
                      <th className="px-3 py-2 w-24">{t('orders.lineUnitPrice')}</th>
                      <th className="px-3 py-2 w-24">
                        <span className="block">{t('orders.quantity')}</span>
                        <span className="block text-[9px] font-normal normal-case text-gray-400 leading-tight">
                          dona / kg
                        </span>
                      </th>
                      <th className="px-3 py-2 w-24">{t('orders.lineSubtotal')}</th>
                      <th className="px-3 py-2 w-10 text-center"><Plus size={14} className="inline opacity-40" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orderFormTableRows.map((row) => {
                      const formColumnCount = 8 + (tableConfig.showFormImageColumn ? 1 : 0) + (tableConfig.showFormColorColumn ? 1 : 0);
                      
                      if (row.type === 'catHeader') {
                        return (
                          <tr key={row.key} className="bg-emerald-500/10">
                            <td colSpan={formColumnCount} className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-400 border-t border-emerald-500/20">
                              {t('products.category')}: {row.label}
                            </td>
                          </tr>
                        );
                      }
                      
                      if (row.type === 'catSubtotal') {
                        const subtotalLeftCols = 6 + (tableConfig.showFormImageColumn ? 1 : 0) + (tableConfig.showFormColorColumn ? 1 : 0);
                        return (
                          <tr key={row.key} className="bg-indigo-500/10">
                            <td colSpan={subtotalLeftCols} className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-indigo-400">
                              {t('orders.categorySubtotal')}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[14px] font-black text-white">
                              ${formatUsd(row.amount)}
                            </td>
                            <td className="px-4 py-3 bg-indigo-500/10" />
                          </tr>
                        );
                      }

                      const line = row.line;
                      const isMatrix = (line.colorChoices?.length || 0) >= 1;
                      const qtySum = isMatrix
                        ? line.colorChoices.reduce((s, c) => s + parseOrderItemQty(line.colorQtyByColor?.[c] ?? '0'), 0)
                        : parseOrderItemQty(line.quantity);
                      const sub = computeOrderLineSubtotal(line);
                      const prodRow = line.product_id && products.find((p) => String(p.id) === String(line.product_id));
                      const lineIsKg = Boolean(prodRow?.is_kg);
                      const stockNum = prodRow?.stock != null && prodRow.stock !== '' ? Number(prodRow.stock) : null;
                      const stockWarn = stockNum != null && Number.isFinite(stockNum) && stockNum >= 0 && qtySum > stockNum;

                      return (
                        <tr key={line.id} className="bg-transparent group hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-4 align-top">
                            <input
                              ref={line.id === firstCodeLineId ? firstModelCodeRef : undefined}
                              type="text"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-[13px] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold"
                              placeholder={t('orders.modelCodePlaceholder')}
                              value={line.codeInput}
                              onChange={(e) => updateOrderLine(line.id, {
                                codeInput: e.target.value,
                                resolveError: '',
                                variants: [],
                                colorChoices: [],
                                colorQtyByColor: {},
                                product_id: null,
                                product_name: '',
                                product_price: 0,
                                color: '',
                                image_url: '',
                                local_note: '',
                                readyForSort: false
                              })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  resolveOrderLine(line.id);
                                }
                              }}
                            />
                            {line.resolveError && (
                              <p className="text-[10px] text-red-600 mt-0.5 leading-tight">{line.resolveError}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => resolveOrderLine(line.id)}
                              className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 transition-colors rounded-xl text-[10px] uppercase tracking-widest font-black whitespace-nowrap shadow-sm"
                            >
                              {t('orders.codeFetchButton')}
                            </button>
                          </td>
                          {tableConfig.showFormImageColumn && (
                            <td className="px-3 py-4 align-top">
                              {line.image_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(String(line.image_url || '').trim())}
                                  className={`rounded-xl bg-white/5 flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-sm ${formImageCellClass} hover:ring-blue-500/50 transition-all`}
                                  title="Rasmni kattalashtirib ko'rish"
                                >
                                  <img src={line.image_url} alt="" className="max-h-full max-w-full object-contain" />
                                </button>
                              ) : (
                                <div className={`rounded-xl border border-dashed border-white/20 bg-white/5 shadow-sm ${formImageCellClass}`} />
                              )}
                            </td>
                          )}
                          <td className="px-3 py-4 align-top text-[13px] text-white leading-snug">
                            {line.product_id ? (
                              <span className="font-bold block mt-1">{line.product_name}</span>
                            ) : (
                              <span className="text-white/20 block mt-1">—</span>
                            )}
                          </td>
                          <td className="px-3 py-4 align-top min-w-[8rem] max-w-[16rem]">
                            <textarea
                              rows={2}
                              className="w-full min-h-[2.75rem] px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 font-bold"
                              placeholder={t('orders.lineItemNotePlaceholder')}
                              value={line.local_note ?? ''}
                              onChange={(e) => updateOrderLine(line.id, { local_note: e.target.value })}
                            />
                          </td>
                          {tableConfig.showFormColorColumn && (
                            <td className="px-3 py-4 align-top text-sm min-w-[200px]">
                              {line.variants?.length >= 2 ? (
                                <select
                                  className="w-full px-3 py-2 border border-white/10 rounded-xl text-[13px] bg-[#1a1a25] text-white/80 font-bold outline-none focus:border-blue-500/50 appearance-none"
                                  value={line.product_id ? String(line.product_id) : ''}
                                  onChange={(e) => applyVariantToLine(line.id, e.target.value)}
                                >
                                  <option value="">{t('orders.pickColorPlaceholder')}</option>
                                  {line.variants.map((p) => (
                                    <option key={String(p.id)} value={String(p.id)}>
                                      {(p.color && labelColorCanonical(p.color, productColors, language)) || displayProductName(p) || String(p.id).slice(0, 8)}
                                    </option>
                                  ))}
                                </select>
                              ) : line.colorChoices?.length >= 1 ? (
                                <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner">
                                  <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">
                                    {t('orders.colorQtyMatrixTitle')}
                                  </p>
                                  <div className="space-y-2">
                                    {line.colorChoices.map((c) => (
                                      <div key={c} className="flex items-center gap-2 justify-between">
                                        <span className="truncate max-w-[120px] font-bold text-white text-[13px]">
                                          {labelColorCanonical(c, productColors, language)}
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          className="w-16 px-2 py-1 bg-[#0c0c14] border border-white/10 rounded-lg text-[13px] font-bold text-right tabular-nums text-white focus:border-blue-500/50 outline-none transition-all"
                                          step="any"
                                          placeholder="0"
                                          value={line.colorQtyByColor?.[c] === '0' ? '' : (line.colorQtyByColor?.[c] ?? '')}
                                          onChange={(e) => updateOrderLineColorQty(line.id, c, e.target.value)}
                                          onFocus={(e) => { if(e.target.value === '0') e.target.value = ''; }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : line.product_id ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                                   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                   <span className="text-[13px] font-bold text-white/90">
                                     {line.color ? labelColorCanonical(line.color, productColors, language) : 'Rangi aniqlanmagan'}
                                   </span>
                                </div>
                              ) : (
                                <span className="text-white/30 italic text-[11px]">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-4 align-top pt-4 min-w-[120px]">
                            {line.product_id ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1 focus-within:border-blue-500/50 transition-all">
                                  <span className="text-white/40 text-[12px] font-mono">$</span>
                                  <input 
                                    type="number"
                                    step="any"
                                    className="w-full bg-transparent border-none outline-none font-mono font-bold text-[14px] text-white tabular-nums p-0"
                                    value={line.product_price}
                                    onChange={(e) => updateOrderLine(line.id, { product_price: e.target.value })}
                                  />
                                </div>
                                {line.original_price != null && Number(line.product_price) !== Number(line.original_price) && (
                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] font-bold text-white/20 line-through tabular-nums">
                                      ${formatUsd(line.original_price)}
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => updateOrderLine(line.id, { product_price: line.original_price })}
                                      className="text-blue-500 hover:text-blue-400 transition-colors p-0.5"
                                      title="Asl narxga qaytarish"
                                    >
                                      <RotateCcw size={10} strokeWidth={3} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                          <td className="px-3 py-4 align-top pt-4">
                             {!isMatrix ? (
                                 <input
                                   type="number"
                                   min="0.001"
                                   step="any"
                                   className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-right tabular-nums font-bold text-white focus:border-blue-500/50 outline-none transition-all"
                                   placeholder="0"
                                   value={line.quantity === '0' ? '' : (line.quantity ?? '')}
                                   onChange={(e) => updateOrderLine(line.id, { quantity: e.target.value })}
                                   onFocus={(e) => { e.target.value === '0' ? e.target.value = '' : null; }}
                                 />
                             ) : (
                               <div className="text-center pt-1">
                                 <div className="inline-block px-4 py-1.5 bg-white/10 border border-white/5 rounded-xl text-[14px] font-black tabular-nums text-blue-400 shadow-inner">
                                   {qtySum}
                                 </div>
                               </div>
                             )}
                             <span
                               className={`block text-center text-[10px] uppercase font-black tracking-widest mt-1 ${lineIsKg ? 'text-blue-400' : 'text-white/30'}`}
                             >
                               {lineIsKg ? 'kg' : 'dona'}
                             </span>
                             {stockWarn && (
                               <div className="flex items-center justify-center gap-1 mt-1 text-red-600" title="Omborda kam!">
                                 <AlertCircle size={14} />
                                 <span className="text-[10px] font-bold">-{qtySum - stockNum}</span>
                               </div>
                             )}
                          </td>
                          <td className="px-3 py-4 align-top text-[16px] font-mono font-black text-white pt-5 text-right tabular-nums">
                            ${formatUsd(sub)}
                          </td>
                          <td className="px-3 py-4 align-top pt-4 text-center">
                            <div className="flex flex-col gap-2 items-center">
                               <button
                                 type="button"
                                 onClick={() => removeOrderLine(line.id)}
                                 className="p-2 bg-rose-500/10 text-rose-400 hover:text-white hover:bg-rose-500/30 rounded-xl transition-all border border-rose-500/20"
                                 title={t('common.delete')}
                               >
                                 <Trash2 size={16} />
                               </button>
                               {line.product_id && !line.readyForSort && (
                                 <button
                                   type="button"
                                   onClick={() => commitLineToSortOrder(line.id)}
                                   className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors"
                                   title="Tayyor (Tartiblash uchun)"
                                 >
                                   <Check size={18} />
                                 </button>
                               )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-[-32px] -mx-6 -mb-8 mt-8 p-6 pb-8 bg-[#0a0a0f]/80 backdrop-blur-md border-t border-white/10 z-[30] rounded-b-[2.5rem]">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                <button
                  type="button"
                  onClick={addOrderLine}
                  className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-400 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  <Plus size={20} />
                  QATOR QO'SHISH
                </button>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] px-8 py-3.5 flex items-center gap-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
                  <span className="text-[12px] font-black text-blue-400 uppercase tracking-[0.2em] relative z-10">JAMI SUMMA:</span>
                  <span className="text-3xl font-black text-white font-mono tabular-nums relative z-10">${formatUsd(form.total || 0)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{t('orders.status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/10 outline-none transition-all text-sm text-white font-bold appearance-none"
                  >
                    <option value="new" className="bg-[#1a1a25]">{t('orders.statusNew')}</option>
                    <option value="pending" className="bg-[#1a1a25]">{t('orders.statusProcessing')}</option>
                    <option value="completed" className="bg-[#1a1a25]">{t('orders.statusCompleted')}</option>
                    <option value="cancelled" className="bg-[#1a1a25]">{t('orders.statusCancelled')}</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{t('orders.source')}</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/10 outline-none transition-all text-sm text-white font-bold appearance-none"
                  >
                    <option value="dokon" className="bg-[#1a1a25]">{t('orders.adminPanel')}</option>
                    <option value="website" className="bg-[#1a1a25]">{t('orders.website')}</option>
                    <option value="telefon" className="bg-[#1a1a25]">{t('orders.sourcePhone')}</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white/50 border border-transparent hover:border-white/10 hover:bg-white/5 hover:text-white transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingOrder}
                    className={`flex items-center gap-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-10 py-3.5 rounded-2xl shadow-2xl shadow-blue-500/20 font-black text-[11px] uppercase tracking-widest transition-all ${
                      isSavingOrder ? 'opacity-70 cursor-not-allowed pointer-events-none' : 'hover:bg-blue-600/40 hover:text-white hover:-translate-y-1'
                    }`}
                  >
                    <Save size={20} />
                    {isSavingOrder ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl('')}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl('')}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 text-white/80 hover:bg-black/70 hover:text-white"
              title={t('common.close') || 'Yopish'}
            >
              <X size={16} />
            </button>
            <img
              src={previewImageUrl}
              alt="preview"
              className="block max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
