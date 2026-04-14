import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"
import { useAuth } from "@/context/AuthContext"

const SUPER_ADMIN_EMAIL = "samakshrastogi885@gmail.com"

interface Metrics {
    cards: {
        uniqueUsers: number
        totalLogins: number
        avgSessionLength: number
        likes: number
        dislikes: number
        shares: number
    }
    dailyLogins: { day: string; count: number }[]
    topOrganizations: { id: number; name: string; shares: number; likes: number; views: number }[]
    subscriptionCounts: { plan: string; count: number }[]
}

const AdminDashboard = () => {
    const { user } = useAuth()
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [message, setMessage] = useState("")
    const [grantEmail, setGrantEmail] = useState("")

    const canAccess = user?.email === SUPER_ADMIN_EMAIL || user?.platformAdmin

    const loadMetrics = async () => {
        const res = await api.get("/admin/metrics")
        setMetrics(res.data?.data || null)
    }

    useEffect(() => {
        if (!canAccess) return
        const fetchMetrics = async () => {
            try {
                await loadMetrics()
            } catch {
                setMessage("Failed to load admin metrics.")
            }
        }
        fetchMetrics()
    }, [canAccess])

    const chartMax = useMemo(() => {
        if (!metrics?.dailyLogins?.length) return 0
        return Math.max(...metrics.dailyLogins.map((d) => d.count))
    }, [metrics])

    const formatDuration = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const parts = []

        if (hours > 0) parts.push(`${hours}h`)
        if (minutes > 0) parts.push(`${minutes}m`)
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

        return parts.join(" ")
    }

    const avgSessionText = useMemo(() => {
        if (!metrics) return "0s"

        const seconds = Math.round(metrics.cards.avgSessionLength)
        return formatDuration(seconds)
    }, [metrics])

    const handleGrant = async () => {
        if (!grantEmail.trim()) return
        try {
            await api.post("/admin/grant", { email: grantEmail.trim().toLowerCase() })
            setGrantEmail("")
            setMessage("Access granted.")
        } catch {
            setMessage("Failed to grant access.")
        }
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl space-y-8 px-2 sm:px-4">

                {/* HEADER */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 shadow-lg space-y-4">

                    {/* TOP ROW */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        {/* TITLE */}
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Platform Admin Dashboard
                            </h1>
                            <p className="text-sm text-gray-400 mt-1">
                                Platform-level analytics & controls
                            </p>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-2">

                            <button
                                onClick={loadMetrics}
                                className="rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-2 text-xs font-medium"
                            >
                                🔄 Refresh
                            </button>

                        </div>
                    </div>

                    {/* STATUS STRIP */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                            🟢 System Active
                        </span>

                        <span>
                            Last updated: {new Date().toLocaleTimeString()}
                        </span>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
                            {message}
                        </div>
                    )}

                </div>

                {!canAccess && (
                    <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-6 text-center space-y-4">

                        {/* ICON */}
                        <div className="text-4xl">🚫</div>

                        {/* TEXT */}
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Access Restricted
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">
                                You do not have permission to view this dashboard.
                            </p>
                        </div>

                        {/* OPTIONAL ACTION */}
                        <div className="text-xs text-gray-500">
                            Contact a super admin to request access.
                        </div>

                    </div>
                )}

                {/* METRICS */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                        <MetricCard label="Users" value={metrics.cards.uniqueUsers} icon="👥" sub="Total users" />

                        <MetricCard label="Logins" value={metrics.cards.totalLogins} icon="🔐" sub="All time logins" />

                        <MetricCard label="Session" value={avgSessionText} icon="⏱️" sub="Avg session time" />

                        <MetricCard label="Likes" value={metrics.cards.likes} icon="👍" sub="Total likes" />

                        <MetricCard label="Dislikes" value={metrics.cards.dislikes} icon="👎" sub="Total dislikes" />

                        <MetricCard label="Shares" value={metrics.cards.shares} icon="📤" sub="Total shares" />

                    </div>
                )}

                {/* LOGIN CHART */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 space-y-5 shadow-md">

                    {/* HEADER */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">
                            Daily Login Activity
                        </h2>

                        <span className="text-xs text-gray-400">
                            Last {metrics?.dailyLogins?.length || 0} days
                        </span>
                    </div>

                    {/* CHART */}
                    <div className="flex items-end gap-3 h-48">

                        {(metrics?.dailyLogins || []).map((row) => {
                            const height = chartMax
                                ? Math.max(10, Math.round((row.count / chartMax) * 160))
                                : 10

                            return (
                                <div
                                    key={row.day}
                                    className="group flex flex-col items-center gap-2 relative"
                                >

                                    {/* TOOLTIP */}
                                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition text-[10px] text-white bg-black/80 px-2 py-1 rounded">
                                        {row.count}
                                    </div>

                                    {/* BAR */}
                                    <div
                                        className="w-7 rounded-md bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300 transition-all duration-300"
                                        style={{ height }}
                                    />

                                    {/* DATE */}
                                    <span className="text-[10px] text-gray-400">
                                        {row.day.slice(5)}
                                    </span>
                                </div>
                            )
                        })}

                    </div>

                    {!metrics?.dailyLogins?.length && (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">

                            {/* ICON */}
                            <div className="text-4xl opacity-80">📊</div>

                            {/* TITLE */}
                            <h3 className="text-sm font-semibold text-white">
                                No login activity yet
                            </h3>

                            {/* DESCRIPTION */}
                            <p className="text-xs text-gray-400 max-w-xs">
                                Once users start logging in, activity will appear here.
                            </p>

                        </div>
                    )}
                </div>

                {/* TABLES */}
                <div className="grid gap-6 lg:grid-cols-2">

                    {/* TOP ORGS */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        {/* HEADER */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">
                                Top Organizations
                            </h2>
                            <span className="text-xs text-gray-400">
                                Ranked by performance
                            </span>
                        </div>

                        {/* LIST */}
                        {(metrics?.topOrganizations || []).map((org, idx) => {
                            const maxViews = Math.max(...(metrics?.topOrganizations || []).map(o => o.views || 0), 1)
                            const progress = Math.round((org.views / maxViews) * 100)

                            return (
                                <div
                                    key={org.id}
                                    className="rounded-xl bg-black/30 p-3 space-y-2 hover:bg-black/40 transition"
                                >

                                    {/* TOP ROW */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 w-5">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-white font-medium">
                                                {org.name}
                                            </span>
                                        </span>

                                        <span className="text-xs text-gray-300">
                                            {org.views} views
                                        </span>
                                    </div>

                                    {/* PROGRESS BAR */}
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    {/* META */}
                                    <div className="flex gap-3 text-[11px] text-gray-400">
                                        <span>👍 {org.likes}</span>
                                        <span>📤 {org.shares}</span>
                                    </div>
                                </div>
                            )
                        })}

                        {/* EMPTY */}
                        {!metrics?.topOrganizations?.length && (
                            <p className="text-sm text-gray-400 text-center py-6">
                                No organization data available
                            </p>
                        )}
                    </div>

                    {/* SUBSCRIPTIONS */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        {/* HEADER */}
                        <h2 className="text-lg font-semibold text-white">
                            Subscriptions
                        </h2>

                        {/* LIST */}
                        {(metrics?.subscriptionCounts || []).map((row) => (
                            <div
                                key={row.plan}
                                className="flex items-center justify-between rounded-xl bg-black/30 p-3 hover:bg-black/40 transition"
                            >
                                <span className="text-sm text-white">
                                    {row.plan}
                                </span>

                                <span className="text-sm font-semibold text-gray-300">
                                    {row.count}
                                </span>
                            </div>
                        ))}

                        {/* EMPTY */}
                        {!metrics?.subscriptionCounts?.length && (
                            <p className="text-sm text-gray-400 text-center py-6">
                                No subscription data available
                            </p>
                        )}
                    </div>

                </div>

                {/* GRANT ACCESS */}
                {user?.email === SUPER_ADMIN_EMAIL && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 backdrop-blur-xl p-6 space-y-4 shadow-md">

                        {/* HEADER */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    Grant Admin Access
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Provide access to platform analytics dashboard
                                </p>
                            </div>

                            <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                SUPER ADMIN
                            </span>
                        </div>

                        {/* INPUT + ACTION */}
                        <div className="flex flex-col sm:flex-row gap-2">

                            <input
                                value={grantEmail}
                                onChange={(e) => setGrantEmail(e.target.value)}
                                placeholder="Enter user email..."
                                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />

                            <button
                                onClick={handleGrant}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 transition px-5 py-2.5 text-sm font-medium shadow-md"
                            >
                                Grant Access
                            </button>
                        </div>

                        {/* INFO NOTE */}
                        <p className="text-[11px] text-gray-500">
                            The user will gain access to platform-level analytics and admin controls.
                        </p>

                    </div>
                )}
            </div>
        </AppLayout>
    )
}

const MetricCard = ({
    label,
    value,
    icon,
    sub
}: {
    label: string
    value: number | string
    icon?: string
    sub?: string
}) => (
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-4 shadow-md transition hover:scale-[1.03] hover:border-white/20">

        {/* TOP */}
        <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{label}</p>
            {icon && <span className="text-sm opacity-80 group-hover:scale-110 transition">{icon}</span>}
        </div>

        {/* VALUE */}
        <p className="text-xl sm:text-2xl font-bold text-white mt-2 tracking-tight">
            {value}
        </p>

        {/* SUBTEXT */}
        {sub && (
            <p className="text-[11px] text-gray-500 mt-1">
                {sub}
            </p>
        )}
    </div>
)

export default AdminDashboard