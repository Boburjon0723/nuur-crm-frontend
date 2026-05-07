'use client';
import React from 'react';
import { Clock, Timer, CheckCircle, TrendingUp, ShoppingCart } from 'lucide-react';
import { formatUsd } from '../utils';

export default function StatsCards({ t, statusStats, totalSumma, filteredOrdersCount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-8">
      {/* Jami Buyurtmalar */}
      <div className="relative group overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-900/20 backdrop-blur-xl border border-blue-500/30 p-5 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
        <div className="relative flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{t('orders.statsVisibleCount')}</p>
            <p className="text-4xl font-black mt-2 tabular-nums text-white tracking-tight">{filteredOrdersCount}</p>
          </div>
          <div className="p-4 bg-blue-500/20 border border-blue-500/20 rounded-2xl shrink-0">
            <ShoppingCart className="text-blue-400" size={24} />
          </div>
        </div>
      </div>

      {/* Yangi Buyurtmalar */}
      <div className="relative group overflow-hidden bg-[#12121a]/80 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] hover:bg-[#1a1a25]/90">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="relative flex justify-between items-start gap-3 w-full">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('orders.statusNew')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsCountShort')}</p>
                <p className="text-2xl font-black tabular-nums text-cyan-400">{statusStats.new.count}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsSumShort')}</p>
                <p className="text-lg font-black tabular-nums font-mono text-white leading-tight">${formatUsd(statusStats.new.sum)}</p>
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/10 rounded-2xl shrink-0 text-cyan-400">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Jarayondagi Buyurtmalar */}
      <div className="relative group overflow-hidden bg-[#12121a]/80 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] hover:bg-[#1a1a25]/90">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="relative flex justify-between items-start gap-3 w-full">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('orders.statusProcessing')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsCountShort')}</p>
                <p className="text-2xl font-black tabular-nums text-amber-400">{statusStats.pending.count}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsSumShort')}</p>
                <p className="text-lg font-black tabular-nums font-mono text-white leading-tight">${formatUsd(statusStats.pending.sum)}</p>
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/10 rounded-2xl shrink-0 text-amber-400">
            <Timer size={24} />
          </div>
        </div>
      </div>

      {/* Yakunlangan Buyurtmalar */}
      <div className="relative group overflow-hidden bg-[#12121a]/80 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] hover:bg-[#1a1a25]/90">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="relative flex justify-between items-start gap-3 w-full">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('orders.statusCompleted')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsCountShort')}</p>
                <p className="text-2xl font-black tabular-nums text-emerald-400">{statusStats.completed.count}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('orders.statsSumShort')}</p>
                <p className="text-lg font-black tabular-nums font-mono text-white leading-tight">${formatUsd(statusStats.completed.sum)}</p>
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/10 rounded-2xl shrink-0 text-emerald-400">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Umumiy Tushum */}
      <div className="relative group overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-900/20 backdrop-blur-xl border border-purple-500/30 p-5 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">{t('dashboard.totalRevenue')}</p>
            <p className="text-3xl font-black mt-2 text-white font-mono tabular-nums tracking-tighter truncate">${formatUsd(totalSumma)}</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase font-medium">{t('orders.statsFilteredHint')}</p>
          </div>
          <div className="p-4 bg-purple-500/20 border border-purple-500/20 rounded-2xl text-purple-400 font-bold shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
