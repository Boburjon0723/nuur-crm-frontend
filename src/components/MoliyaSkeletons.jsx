export function MoliyaCardSkeleton() {
    return (
        <div className="animate-pulse space-y-4" aria-hidden>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-white/[0.02] rounded-xl border border-white/5" />
                ))}
            </div>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3 h-[400px] bg-white/[0.01] rounded-2xl border border-white/5" />
                <div className="col-span-9 space-y-4">
                    <div className="h-32 bg-white/[0.01] rounded-2xl border border-white/5" />
                    <div className="h-64 bg-white/[0.01] rounded-2xl border border-white/5" />
                </div>
            </div>
        </div>
    )
}
