'use client';
import React from 'react';
import { 
  Archive, 
  ShoppingCart, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  Receipt, 
  List, 
  Copy, 
  Edit, 
  Trash2, 
  RotateCcw,
  Truck,
  Warehouse,
  RefreshCcw
} from 'lucide-react';
import { 
  normalizeOrderItemsForList, 
  dedupeOrderItemsKeepNewest, 
  labelColorCanonical, 
  orderItemLineNoteText, 
  formatUsd, 
  normalizeStatusForSelect,
  ORDER_LIST_ITEMS_PREVIEW,
  orderItemQtyDisplay,
} from '../utils';

export default function OrdersTable({
  t,
  filteredOrders,
  ordersListView,
  mergeSelection,
  toggleMergeSelectAllFiltered,
  toggleMergeSelectOrder,
  language,
  products,
  productColors,
  orderListExpandedById,
  setOrderListExpandedById,
  handleStatusChange,
  handlePrintOrder,
  handlePartialShip,
  handleErpRetailInbound,
  erpInboundByOrder,
  handleDuplicateOrder,
  handleEdit,
  handleDelete,
  handleRestoreOrder,
  handlePermanentDelete
}) {
  const formImageCellClass = "w-10 h-10 sm:w-12 sm:h-12";

  if (filteredOrders.length === 0) {
    return (
      <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden mb-8">
        <div className="flex flex-col items-center justify-center py-20 text-white/30 uppercase tracking-[0.2em] font-black">
          {ordersListView === 'trash' ? (
            <Archive size={48} className="mb-4 opacity-20" />
          ) : (
            <ShoppingCart size={48} className="mb-4 opacity-20" />
          )}
          <p className="text-xs">
            {ordersListView === 'trash' ? t('orders.trashEmpty') : t('orders.noOrders')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl p-4 lg:p-6 mb-8 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[860px] text-left border-collapse table-auto">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">
              {ordersListView === 'active' && (
                <th className="w-10 shrink-0 px-2 py-3 sm:px-3 rounded-tl-2xl text-center" title={t('orders.mergeSelectColumn')}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every((o) => mergeSelection[o.id])
                    }
                    onChange={toggleMergeSelectAllFiltered}
                    aria-label={t('orders.mergeSelectAll')}
                  />
                </th>
              )}
              <th className={`w-[11%] min-w-[7.5rem] px-3 py-3 sm:px-4 ${ordersListView === 'trash' ? 'rounded-tl-2xl' : ''}`}>
                {t('orders.idDate')}
              </th>
              <th className="w-[14%] min-w-[9rem] px-3 py-3 sm:px-4">{t('orders.customer')}</th>
              <th className="min-w-[12rem] px-3 py-3 sm:px-4 xl:min-w-[16rem]">{t('orders.products')}</th>
              <th className="w-[7%] min-w-[4.5rem] whitespace-nowrap px-2 py-3 sm:px-3">{t('orders.total')}</th>
              <th className="w-[9%] min-w-[5.5rem] px-2 py-3 sm:px-3">{t('orders.payment')}</th>
              <th className="w-[10%] min-w-[6.5rem] px-2 py-3 sm:px-3">{t('orders.status')}</th>
              <th className="w-[7%] min-w-[4rem] px-2 py-3 sm:px-3">{t('orders.source')}</th>
              <th className="min-w-[13.5rem] px-2 py-3 sm:px-3 rounded-tr-2xl text-right xl:min-w-[15rem]">
                {t('customers.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOrders.map((item) => (
              (() => {
                const itemStatus = normalizeStatusForSelect(item.status);
                const partialDisabled = itemStatus === 'completed' || itemStatus === 'cancelled';
                const erpInbound = erpInboundByOrder?.[String(item.id)] || null;
                const erpInboundStatus = String(erpInbound?.status || '').toLowerCase();
                const erpInboundDisabled =
                  itemStatus === 'cancelled' || erpInboundStatus === 'pending';
                const isRejectedForResend = erpInboundStatus === 'rejected';
                const erpButtonLabel = isRejectedForResend ? 'Qayta yuborish' : 'ERP';
                return (
              <tr
                key={item.id}
                id={`order-row-${item.id}`}
                className="hover:bg-white/[0.02] transition-colors scroll-mt-24 group"
              >
                {ordersListView === 'active' && (
                  <td className="px-2 py-3 sm:px-3 sm:py-4 align-top text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 mt-1"
                      checked={!!mergeSelection[item.id]}
                      onChange={() => toggleMergeSelectOrder(item.id)}
                      aria-label={t('orders.mergeSelectColumn')}
                    />
                  </td>
                )}
                <td className="px-3 py-4 sm:px-4 sm:py-5 align-top">
                  {item.order_number && (
                    <div className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg inline-block mb-2">
                      № {item.order_number}
                    </div>
                  )}
                  <div className="font-mono text-[10px] font-bold text-white/40 bg-white/5 border border-white/5 px-2 py-1 rounded-lg inline-block mb-2 ml-1">
                    #{String(item.id).slice(0, 8)}
                  </div>
                  <div className="text-[13px] font-bold text-white/80">
                    {new Date(item.created_at).toLocaleDateString(
                      language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US'
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 sm:px-4 sm:py-5 font-medium text-white align-top min-w-0">
                  <div className="font-bold text-[14px]">{item.customer_name || item.customers?.name || t('common.unknown')}</div>
                  <div className="text-[11px] text-white/50 font-mono mt-1 font-bold">{item.customer_phone || item.customers?.phone}</div>
                  {item.customer_address && (
                    <div className="text-[10px] text-white/40 mt-1 italic line-clamp-2" title={item.customer_address}>
                      {item.customer_address}
                    </div>
                  )}
                  {item.note && (
                    <div className="text-[11px] text-amber-400 mt-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl inline-block max-w-[200px] whitespace-normal break-words">
                      {item.note}
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 sm:px-4 sm:py-5 text-white/70 align-top min-w-0 max-w-md xl:max-w-xl 2xl:max-w-2xl">
                  {item.order_items && item.order_items.length > 0 ? (
                    (() => {
                      const ois = normalizeOrderItemsForList(
                        dedupeOrderItemsKeepNewest(item.order_items || [], products)
                      );
                      const expanded = !!orderListExpandedById[item.id];
                      const hasMore = ois.length > ORDER_LIST_ITEMS_PREVIEW;
                      const visible = expanded ? ois : ois.slice(0, ORDER_LIST_ITEMS_PREVIEW);
                      const hiddenCount = ois.length - ORDER_LIST_ITEMS_PREVIEW;
                      return (
                        <div className="space-y-1">
                          {visible.map((oi, idx) => (
                            <div
                              key={oi.id || idx}
                              className="text-[13px] border-b border-white/5 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                {oi.image_url ? (
                                  <div className={`shrink-0 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden ring-1 ring-white/10 ${formImageCellClass}`}>
                                    <img
                                      src={oi.image_url}
                                      alt=""
                                      className="max-h-full max-w-full object-contain object-center"
                                    />
                                  </div>
                                ) : (
                                  <div className={`shrink-0 rounded-xl border border-dashed border-white/20 bg-white/5 ${formImageCellClass}`} />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-white line-clamp-1">
                                    {oi.product_name || oi.products?.name}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                    <span className="font-black text-blue-400 text-lg tabular-nums bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 leading-none">
                                      {orderItemQtyDisplay(oi, products)}
                                    </span>
                                    <div className="text-[11px] text-white/50 flex flex-wrap gap-x-2 gap-y-1 font-bold">
                                      {oi.size && (
                                        <span>
                                          {t('orders.productCode')}: {oi.size}
                                        </span>
                                      )}
                                      {oi.color && (
                                        <span>
                                          {t('orders.lineColor')}:{' '}
                                          {labelColorCanonical(
                                            oi.color,
                                            productColors,
                                            language
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {orderItemLineNoteText(oi) && (
                                    <div className="mt-2 w-full text-[11px] text-violet-300 leading-snug break-words border-l-2 border-violet-500/30 pl-3 py-1.5 bg-violet-500/10 rounded-r-xl">
                                      <span className="font-black text-violet-400 uppercase tracking-widest text-[9px] block mb-0.5">
                                        {t('orders.lineItemNoteShort')}
                                      </span>
                                      {orderItemLineNoteText(oi)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() =>
                                setOrderListExpandedById((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }))
                              }
                              className="mt-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/5 hover:bg-blue-500/10 px-3 py-1.5 rounded-xl self-start w-fit"
                            >
                              {expanded ? (
                                <>
                                  <ChevronUp size={14} className="shrink-0" />
                                  {t('orders.orderListCollapse')}
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} className="shrink-0" />
                                  {t('orders.orderListExpand')}
                                  <span className="font-bold text-blue-400/50 ml-1">
                                    ({t('orders.orderListHiddenCount').replace('{n}', String(hiddenCount))})
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-white/30 italic text-[11px] block mt-1">{t('orders.tableLineEmpty')}</span>
                  )}
                </td>
                <td className="px-2 py-4 sm:px-3 sm:py-5 font-black text-white font-mono align-top whitespace-nowrap tabular-nums text-lg">
                  ${formatUsd(item.total)}
                </td>
                <td className="px-2 py-4 sm:px-3 sm:py-5 align-top">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="font-black text-[10px] uppercase tracking-widest text-white/50 bg-white/5 border border-white/5 px-2 py-1.5 rounded-lg inline-block text-center w-fit">
                      {item.payment_method_detail || t('orders.cash')}
                    </span>
                    {item.receipt_url && (
                      <a
                        href={item.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 mt-1 font-bold text-[11px] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg w-fit"
                      >
                        <FileText size={12} />
                        {t('orders.receiptLink')}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 sm:px-3 sm:py-5 align-top">
                  <select
                    value={normalizeStatusForSelect(item.status)}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/5 cursor-pointer outline-none transition-colors appearance-none text-center ${
                      item.status === 'new' || item.status === 'Yangi' ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/20' :
                      item.status === 'pending' || item.status === 'Jarayonda' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20' :
                      item.status === 'completed' || item.status === 'Tugallandi' || item.status === 'Tugallangan' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20'
                    }`}
                  >
                    <option value="new" className="bg-[#1a1a25]">{t('orders.statusNew')}</option>
                    <option value="pending" className="bg-[#1a1a25]">{t('orders.statusProcessing')}</option>
                    <option value="completed" className="bg-[#1a1a25]">{t('orders.statusCompleted')}</option>
                    <option value="cancelled" className="bg-[#1a1a25]">{t('orders.statusCancelled')}</option>
                  </select>
                </td>
                <td className="px-2 py-4 sm:px-3 sm:py-5 align-top">
                  <div className="flex flex-col gap-2">
                    <span
                      className={`text-[9px] uppercase font-black px-2 py-1 rounded-md tracking-widest w-fit border ${
                        item.source === 'website'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : item.source === 'telefon'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-white/5 text-white/50 border-white/10'
                      }`}
                    >
                      {item.source === 'website'
                        ? 'Web'
                        : item.source === 'telefon'
                          ? t('orders.sourcePhoneShort')
                          : t('orders.sourceStoreShort')}
                    </span>
                    {erpInboundStatus && (
                      <span
                        className={`text-[9px] uppercase font-black px-2 py-1 rounded-md tracking-widest w-fit border ${
                          erpInboundStatus === 'accepted'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : erpInboundStatus === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        ERP: {erpInboundStatus === 'accepted' ? 'qabul' : erpInboundStatus === 'rejected' ? 'rad' : 'kutilmoqda'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 sm:px-3 sm:py-5 text-right align-top">
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap">
                    {ordersListView === 'active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => window.location.href=`/statistika?orderId=${item.id}&customerId=${item.customer_id}`}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-400 shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-500/20 hover:text-white"
                          title="Solishtirish"
                        >
                          <RefreshCcw size={14} className="shrink-0" />
                          <span className="hidden sm:inline">Solishtirish</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 px-2.5 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-400 shadow-lg shadow-blue-500/10 transition-all hover:bg-blue-500/30 hover:text-white"
                          title={t('orders.editOrder')}
                        >
                          <Edit size={14} className="shrink-0" />
                          <span className="hidden sm:inline">{t('common.edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="shrink-0 p-2 sm:p-2.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 rounded-xl transition-all border border-rose-500/20"
                          title={t('orders.moveToTrashTitle')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestoreOrder(item.id)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-400 shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-500/30 hover:text-white"
                          title={t('orders.restoreOrderTitle')}
                        >
                          <RotateCcw size={14} className="shrink-0" />
                          <span className="hidden sm:inline">{t('orders.restoreOrder')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(item.id)}
                          className="shrink-0 p-2 sm:p-2.5 text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600/40 rounded-xl transition-all border border-rose-500/20"
                          title={t('orders.permanentDeleteTitle')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
