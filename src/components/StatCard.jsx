import Link from 'next/link'

export default function StatCard({ icon: Icon, title, value, color, trend, href }) {
    const inner = (
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div
                    className={`p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:border-blue-500/50 transition-all duration-500`}
                >
                    <Icon size={28} className={color.replace('bg-', 'text-').replace('500', '400')} />
                </div>
                {trend != null && Number(trend) !== 0 && (
                    <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${Number(trend) > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                        {Number(trend) > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-[11px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em]">{title}</p>
                <h3 className="text-4xl font-black text-white tracking-tighter group-hover:translate-x-1 transition-transform duration-500">{value}</h3>
            </div>
        </div>
    )

    const baseClass = "relative overflow-hidden group bg-white/[0.03] backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 transition-all duration-500 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"

    return href ? (
        <Link href={href} className={baseClass}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${color.replace('bg-', 'bg-')}`}></div>
            {inner}
        </Link>
    ) : (
        <div className={baseClass}>
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${color.replace('bg-', 'bg-')}`}></div>
            {inner}
        </div>
    )
}