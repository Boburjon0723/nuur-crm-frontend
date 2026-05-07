'use client';
import React from 'react';
import { LayoutGrid, Clock, Timer, CheckCircle, XCircle } from 'lucide-react';

export default function StatusTabs({ t, filterStatus, setFilterStatus, statusStats }) {
    const tabs = [
        { 
            id: 'all', 
            label: t('orders.allStatuses'), 
            icon: LayoutGrid, 
            activeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
        },
        { 
            id: 'new', 
            label: t('orders.statusNew'), 
            icon: Clock, 
            count: statusStats.new.count,
            activeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
        },
        { 
            id: 'pending', 
            label: t('orders.statusProcessing'), 
            icon: Timer, 
            count: statusStats.pending.count,
            activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        },
        { 
            id: 'completed', 
            label: t('orders.statusCompleted'), 
            icon: CheckCircle, 
            count: statusStats.completed.count,
            activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        },
        { 
            id: 'cancelled', 
            label: t('orders.statusCancelled'), 
            icon: XCircle, 
            count: statusStats.cancelled.count,
            activeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
        }
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-[#12121a]/60 backdrop-blur-xl rounded-[20px] border border-white/5 shadow-2xl w-fit">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = filterStatus === tab.id;
                
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilterStatus(tab.id)}
                        className={`
                            relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[13px] font-bold transition-all duration-300
                            ${isActive 
                                ? `${tab.activeColor} border shadow-[0_0_20px_rgba(0,0,0,0.3)] scale-[1.02] z-10` 
                                : `text-white/40 hover:text-white/80 hover:bg-white/5`
                            }
                        `}
                    >
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-current/10' : ''}`}>
                            <Icon size={16} />
                        </div>
                        <span className="tracking-wide">{tab.label}</span>
                        {(tab.count !== undefined) && (
                            <span className={`
                                ml-1 px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums
                                ${isActive ? 'bg-current/20 text-current' : 'bg-white/5 text-white/30'}
                            `}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
