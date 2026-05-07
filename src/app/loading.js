export default function Loading() {
    return (
        <div className="flex-1 min-h-screen flex items-center justify-center bg-[#02020a]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">Yuklanmoqda...</p>
            </div>
        </div>
    )
}
