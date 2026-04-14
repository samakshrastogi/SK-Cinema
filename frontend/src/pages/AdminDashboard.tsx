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

    const canAccess =
        user?.email === SUPER_ADMIN_EMAIL || user?.platformAdmin

    const loadMetrics = async () => {
        const res = await api.get("/admin/metrics")
        setMetrics(res.data?.data || null)
    }

    useEffect(() => {
        if (!canAccess) return
        loadMetrics().catch((err) => {
            console.error(err)
            setMessage("Failed to load admin metrics.")
        })
    }, [canAccess])

    const chartMax = useMemo(() => {
        if (!metrics?.dailyLogins?.length) return 0
        return Math.max(...metrics.dailyLogins.map((d) => d.count))
    }, [metrics?.dailyLogins])

    const avgSessionText = metrics
        ? `${Math.round(metrics.cards.avgSessionLength)}s`
        : "0s"

    const handleGrant = async () => {
        if (!grantEmail.trim()) return
        try {
            await api.post("/admin/grant", { email: grantEmail.trim().toLowerCase() })
            setGrantEmail("")
            setMessage("Access granted.")
        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Failed to grant access.")
        }
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <h1 className="text-xl font-bold sm:text-2xl">Platform Admin Dashboard</h1>
                    <p className="text-sm text-gray-400">Platform-level analytics & controls.</p>
                    {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
                </div>

                {!canAccess && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-gray-300">You do not have access to this dashboard.</p>
                    </div>
                )}

                {metrics && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        <MetricCard label="Unique Users" value={metrics.cards.uniqueUsers} />
                        <MetricCard label="Total Logins" value={metrics.cards.totalLogins} />
                        <MetricCard label="Avg Session" value={avgSessionText} />
                        <MetricCard label="Likes" value={metrics.cards.likes} />
                        <MetricCard label="Dislikes" value={metrics.cards.dislikes} />
                        <MetricCard label="Shares" value={metrics.cards.shares} />
                    </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                    <h2 className="text-base font-semibold">Daily Login Activity</h2>
                    <div className="flex items-end gap-2 h-40">
                        {(metrics?.dailyLogins || []).map((row) => {
                            const height = chartMax ? Math.max(6, Math.round((row.count / chartMax) * 140)) : 6
                            return (
                                <div key={row.day} className="flex flex-col items-center gap-2">
                                    <div
                                        className="w-6 rounded-md bg-blue-500/80"
                                        style={{ height }}
                                        title={`${row.day}: ${row.count}`}
                                    />
                                    <span className="text-[10px] text-gray-400">{row.day.slice(5)}</span>
                                </div>
                            )
                        })}
                        {(!metrics || metrics.dailyLogins.length === 0) && (
                            <p className="text-sm text-gray-400">No login activity yet.</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="text-base font-semibold">Top 5 Performing Organizations</h2>
                        {(metrics?.topOrganizations || []).map((org, idx) => (
                            <div key={org.id} className="flex items-center justify-between text-sm bg-black/25 rounded-lg p-2">
                                <span>{idx + 1}. {org.name}</span>
                                <span className="text-gray-300">Shares {org.shares} • Likes {org.likes} • Views {org.views}</span>
                            </div>
                        ))}
                        {metrics?.topOrganizations?.length === 0 && (
                            <p className="text-sm text-gray-400">No organization data available.</p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="text-base font-semibold">Organizations By Subscription</h2>
                        {(metrics?.subscriptionCounts || []).map((row) => (
                            <div key={row.plan} className="flex items-center justify-between text-sm bg-black/25 rounded-lg p-2">
                                <span>{row.plan}</span>
                                <span className="text-gray-300">{row.count}</span>
                            </div>
                        ))}
                        {metrics?.subscriptionCounts?.length === 0 && (
                            <p className="text-sm text-gray-400">No subscription data available.</p>
                        )}
                    </div>
                </div>

                {user?.email === SUPER_ADMIN_EMAIL && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="text-base font-semibold">Grant Dashboard Access</h2>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                value={grantEmail}
                                onChange={(e) => setGrantEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                            />
                            <button
                                onClick={handleGrant}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm"
                            >
                                Grant Access
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

const MetricCard = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold sm:text-xl">{value}</p>
    </div>
)

export default AdminDashboard
