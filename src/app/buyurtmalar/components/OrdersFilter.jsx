'use client';
import React, { useRef } from 'react';
import {
  Search,
  Repeat,
  GitMerge,
  ListTree,
  Receipt,
  List,
  Plus,
  X,
  Printer,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Image,
  ImageOff,
  Upload,
  Trash2,
} from 'lucide-react';

export default function OrdersFilter({
  t,
  searchTerm,
  setSearchTerm,
  repeatLastOrder,
  ordersListView,
  handleMergeSelectedOrders,
  selectedMergeCount,
  clearMergeSelection,
  handleDeleteSelectedOrders,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  orderCategoryOptions,
  handlePrintOrderList,
  filteredOrders,
  handlePrintSelectedByCategory,
  selectedOrders,
  isAdding,
  handleCancel,
  clearNewOrderDraft,
  setDraftBanner,
  setEditId,
  setOrderLines,
  setForm,
  setMergeSourceAgg,
  setMergeSourceOrderIds,
  setIsAdding,
  createEmptyOrderLine,
  handleExportSelectedOrdersExcel,
  selectedOrdersCount,
  excelImportInputRef,
  handleExcelImportFileChange,
  excelImportBusy,
}) {
  const printDetailsRef = useRef(null);
  const excelDetailsRef = useRef(null);

  const closePrintMenu = () => {
    const el = printDetailsRef.current;
    if (el && typeof el.open === 'boolean') el.open = false;
  };

  const closeExcelMenu = () => {
    const el = excelDetailsRef.current;
    if (el && typeof el.open === 'boolean') el.open = false;
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="sticky top-0 z-20 rounded-2xl border border-white/5 bg-[#12121a]/60 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Qidiruv */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input
              type="search"
              autoComplete="off"
              placeholder={t('orders.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder:text-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('orders.searchPlaceholder')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Takrorlash */}
            <button
              type="button"
              onClick={repeatLastOrder}
              className="inline-flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-4 py-2.5 rounded-2xl transition-all font-bold text-[13px] h-[46px]"
              title={t('orders.repeatLastTitle')}
            >
              <Repeat size={16} />
              <span className="hidden sm:inline">{t('orders.repeatLast')}</span>
            </button>

            {ordersListView === 'active' && (
              <>
                <button
                  type="button"
                  onClick={handleMergeSelectedOrders}
                  disabled={selectedMergeCount < 2}
                  className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-2xl transition-all font-bold text-[13px] h-[46px] ${
                    selectedMergeCount >= 2
                      ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                      : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-50'
                  }`}
                >
                  <GitMerge size={16} />
                  <span className="hidden sm:inline">{t('orders.mergeButton')}</span>
                  {selectedMergeCount > 0 && (
                    <span className="min-w-[1.2rem] rounded-full bg-indigo-500 text-white px-1 text-center text-[10px] font-black tabular-nums leading-none py-1">
                      {selectedMergeCount}
                    </span>
                  )}
                </button>
                {selectedMergeCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedOrders}
                      className="inline-flex items-center justify-center bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-3 py-2.5 rounded-2xl transition-all font-bold text-[11px] h-[46px] shadow-lg shadow-rose-500/10"
                      title={t('orders.deleteSelectedOrders') || 'Tanlanganlarni o\'chirish'}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={clearMergeSelection}
                      className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 px-3 py-2.5 rounded-2xl transition-all font-bold text-[11px] h-[46px]"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </>
            )}

            {/* Kategoriya Filtri */}
            <div className="flex items-center gap-2 bg-white/5 px-3 rounded-2xl border border-white/5 h-[46px] focus-within:border-white/20 transition-all">
              <ListTree size={16} className="text-white/40 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent py-1.5 pr-2 outline-none text-white/80 text-[13px] font-bold cursor-pointer max-w-[12rem] appearance-none"
              >
                <option value="all" className="bg-[#1a1a25]">{t('orders.filterAllCategories')}</option>
                {orderCategoryOptions.map((cat) => (
                  <option key={cat.label} value={cat.label} className="bg-[#1a1a25]">
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Print Menyu */}
            <details ref={printDetailsRef} className="relative group/details">
              <summary className="inline-flex list-none cursor-pointer items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl transition-all font-bold text-[13px] h-[46px] shadow-lg shadow-emerald-500/10">
                <Printer size={16} />
                <span className="hidden sm:inline">
                  {selectedOrders.length > 0 
                    ? `${t('orders.printListMenu')} (${selectedOrders.length})` 
                    : t('orders.printListMenu')}
                </span>
                <ChevronDown size={14} className="opacity-60 group-open/details:rotate-180 transition-transform" />
              </summary>
              <div className="absolute right-0 top-full z-40 mt-3 min-w-[18rem] rounded-3xl border border-white/10 bg-[#12121a] p-2 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 overflow-hidden animate-in fade-in zoom-in duration-200">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  onClick={() => { 
                    handlePrintOrderList(selectedOrders.length > 0 ? selectedOrders : filteredOrders, true); 
                    closePrintMenu(); 
                  }}
                >
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><Receipt size={16} /></div>
                  <span>{t('orders.listPrintShortWithPrices')}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  onClick={() => { 
                    handlePrintOrderList(selectedOrders.length > 0 ? selectedOrders : filteredOrders, false); 
                    closePrintMenu(); 
                  }}
                >
                  <div className="p-2 bg-slate-500/10 rounded-xl text-slate-400"><List size={16} /></div>
                  <span>{t('orders.listPrintShortNoPrices')}</span>
                </button>
                <div className="my-1 border-t border-white/5" />
                <button
                  type="button"
                  disabled={selectedOrders.length === 0}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-bold rounded-2xl transition-all ${
                    selectedOrders.length > 0
                      ? 'text-white/70 hover:text-white hover:bg-white/5'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  onClick={() => { if (selectedOrders.length > 0) { handlePrintSelectedByCategory(selectedOrders, filterCategory); closePrintMenu(); } }}
                >
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><Layers size={16} /></div>
                  <span className="flex-1">{t('orders.printSelectedByCategoryShort')}</span>
                  {selectedOrders.length > 0 && (
                    <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-black">{selectedOrders.length}</span>
                  )}
                </button>
              </div>
            </details>

            {/* Excel Menyu */}
            {ordersListView === 'active' && (
              <>
                <details ref={excelDetailsRef} className="relative group/details">
                  <summary className={`inline-flex list-none items-center justify-center gap-2 px-4 py-2.5 rounded-2xl transition-all font-bold text-[13px] h-[46px] border ${
                    selectedOrdersCount > 0
                      ? 'cursor-pointer bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border-slate-500/30'
                      : 'opacity-50 grayscale cursor-not-allowed bg-white/5 text-white/20 border-white/5 pointer-events-none'
                    }`}>
                    <FileSpreadsheet size={16} />
                    <span className="hidden sm:inline">{t('orders.excelExportSelected')}</span>
                    {selectedOrdersCount > 0 && (
                      <span className="bg-slate-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black">{selectedOrdersCount}</span>
                    )}
                    <ChevronDown size={14} className="opacity-60 group-open/details:rotate-180 transition-transform" />
                  </summary>
                  <div className="absolute right-0 top-full z-40 mt-3 min-w-[18rem] rounded-3xl border border-white/10 bg-[#12121a] p-2 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                      onClick={() => { handleExportSelectedOrdersExcel(true); closeExcelMenu(); }}
                    >
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><Image size={16} /></div>
                      <span>{t('orders.excelExportModeWithImages')}</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                      onClick={() => { handleExportSelectedOrdersExcel(false); closeExcelMenu(); }}
                    >
                      <div className="p-2 bg-slate-500/10 rounded-xl text-slate-400"><ImageOff size={16} /></div>
                      <span>{t('orders.excelExportModeWithoutImages')}</span>
                    </button>
                  </div>
                </details>

                {/* Import */}
                <input ref={excelImportInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImportFileChange} />
                <button
                  type="button"
                  disabled={excelImportBusy}
                  onClick={() => excelImportInputRef.current?.click()}
                  className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-2xl transition-all font-bold text-[13px] h-[46px] ${
                    excelImportBusy
                      ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-50'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  }`}
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">{t('orders.excelImport')}</span>
                </button>
              </>
            )}

            {/* Yangi Buyurtma */}
            <button
              type="button"
              onClick={() => {
                if (isAdding) handleCancel();
                else {
                  clearNewOrderDraft(); setDraftBanner(false); setEditId(null); setOrderLines([createEmptyOrderLine()]);
                  setForm({ customer_id: '', customer_name: '', customer_phone: '', total: '', status: 'new', note: '', source: 'dokon' });
                  setMergeSourceAgg(null); setMergeSourceOrderIds(null); setIsAdding(true);
                }
              }}
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl transition-all font-black text-[13px] shadow-2xl h-[46px] ${
                isAdding 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
              }`}
            >
              {isAdding ? <X size={18} /> : <Plus size={18} />}
              <span>{isAdding ? t('common.cancel') : t('orders.newOrder')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
