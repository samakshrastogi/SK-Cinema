import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"

const OrganizationPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [memberships, setMemberships] = useState<any[]>([])
    const [activeOrganizationId, setActiveOrganizationId] = useState<number | null>(null)
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [joinInput, setJoinInput] = useState("")
    const [message, setMessage] = useState("")
    const [linkInfo, setLinkInfo] = useState<{ name: string; linkType: "PUBLIC" | "PRIVATE" } | null>(null)
    const [linkJoining, setLinkJoining] = useState(false)
    const [plan, setPlan] = useState("TRIAL_FREE")

    const handledInviteToken = useRef<string | null>(null)

    const rawOrgToken = searchParams.get("orgToken") || searchParams.get("org")
    const orgToken =
        rawOrgToken && rawOrgToken !== "null" && rawOrgToken !== "undefined"
            ? rawOrgToken
            : null
    const inviteToken = searchParams.get("token")

    const load = async () => {
        const res = await api.get("/organization/my")
        setMemberships(res.data?.data?.memberships || [])
        setActiveOrganizationId(res.data?.data?.access?.activeOrganizationId ?? null)
    }

    const approvedMemberships = useMemo(
        () => memberships.filter((m) => m.status === "APPROVED"),
        [memberships]
    )

    useEffect(() => {
        load().catch((err) => {
            console.error(err)
            setMessage("Failed to load organization data.")
        })
    }, [])

    useEffect(() => {
        if (!orgToken) {
            setLinkInfo(null)
            return
        }

        api.get(`/organization/link/${encodeURIComponent(orgToken)}`)
            .then((res) => {
                setLinkInfo({
                    name: res.data?.data?.name || "Organization",
                    linkType: res.data?.data?.linkType === "PRIVATE" ? "PRIVATE" : "PUBLIC"
                })
            })
            .catch((err) => {
                setLinkInfo(null)
                setMessage(err?.response?.data?.message || "Invalid organization link.")
            })
    }, [orgToken])

    useEffect(() => {
        if (!inviteToken) return
        if (handledInviteToken.current === inviteToken) return
        handledInviteToken.current = inviteToken

        api.post("/organization/join-by-token", { token: inviteToken })
            .then((res) => {
                setMessage(res.data?.message || "Joined organization via invite.")
                load().catch(() => undefined)
            })
            .catch((err) => {
                setMessage(err?.response?.data?.message || "Failed to join via invite link.")
            })
    }, [inviteToken])

    const handleJoinByLink = async () => {
        if (!orgToken) return
        try {
            setLinkJoining(true)
            const res = await api.post("/organization/join-by-link", { token: orgToken })
            setMessage(res.data?.message || "Request sent. Please wait for admin approval.")
            await load()
        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Failed to join organization via shared link.")
        } finally {
            setLinkJoining(false)
        }
    }

    const createOrganization = async () => {
        if (!name.trim()) return
        await api.post("/organization", {
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || undefined,
            plan
        })
        setName("")
        setSlug("")
        setDescription("")
        await load()
        setMessage("Organization created.")
    }

    const requestJoin = async () => {
        if (!joinInput.trim()) return
        try {
            let res
            try {
                res = await api.post("/organization/join-request", {
                    organization: joinInput.trim()
                })
            } catch (inner: any) {
                if (inner?.response?.status === 404) {
                    try {
                        await api.get("/organization/ping")
                    } catch (pingErr: any) {
                        if (pingErr?.response?.status === 404) {
                            throw new Error("Organization routes not loaded. Restart backend server.")
                        }
                    }
                    res = await api.post("/organization/join", {
                        organization: joinInput.trim()
                    })
                } else {
                    throw inner
                }
            }
            setJoinInput("")
            setMessage(res.data?.message || "Request sent. Please wait for admin approval.")
            await load()
        } catch (err: any) {
            const fallback =
                err?.response?.status === 404
                    ? "Organization join endpoint not found. Please restart the backend server."
                    : "Failed to send join request."
            setMessage(err?.message || err?.response?.data?.message || fallback)
        }
    }

    const switchMode = async (organizationId: number | null) => {
        await api.post("/organization/mode", { organizationId })
        await load()
        setMessage(organizationId ? "Organization mode enabled." : "Organization mode disabled.")
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <h1 className="text-xl font-bold sm:text-2xl">Organization</h1>
                    <p className="text-sm text-gray-400">
                        Create, join, and switch organization mode.
                    </p>
                    {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
                </div>

                {orgToken && linkInfo && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                        <h2 className="text-base font-semibold sm:text-lg">Join via Organization Link</h2>
                        <p className="mt-1 text-sm text-gray-300">
                            Organization: <span className="font-semibold text-white">{linkInfo.name}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Link type: {linkInfo.linkType === "PUBLIC" ? "Public (instant join)" : "Private (approval required)"}
                        </p>
                        <button
                            onClick={handleJoinByLink}
                            disabled={linkJoining}
                            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-60"
                        >
                            {linkJoining ? "Sending..." : "Request Join"}
                        </button>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Create Organization</h2>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Organization name"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        />
                        <input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="Slug (optional)"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        />
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        >
                            <option value="TRIAL_FREE">3 month free trial</option>
                            <option value="SIX_MONTH">6 month subscription (Rs 18000)</option>
                            <option value="YEARLY_INITIAL">Yearly initial (Rs 10000 one-time initial users)</option>
                            <option value="YEARLY_RENEWAL">Yearly renewal (Rs 24000 annually)</option>
                        </select>
                        <button onClick={createOrganization} className="rounded-lg bg-purple-600 px-4 py-2 text-sm">
                            Create
                        </button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Join Organization</h2>
                        <input
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            placeholder="Organization slug or id"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        />
                        <button onClick={requestJoin} className="rounded-lg bg-blue-600 px-4 py-2 text-sm">
                            Request Join
                        </button>
                        <p className="text-xs text-gray-400">
                            Request sent users will remain pending until approved (except public org link access).
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold">My Memberships</h2>
                        <button
                            onClick={() => switchMode(null)}
                            className="rounded bg-gray-700 px-3 py-1 text-xs"
                        >
                            Disable Org Mode
                        </button>
                    </div>
                    <div className="space-y-2">
                        {memberships.map((m) => (
                            <div key={m.id} className="flex flex-col gap-3 rounded-lg bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium">
                                        {m.organization?.name} ({m.role})
                                    </p>
                                    <p className="text-xs text-gray-400">Status: {m.status}</p>
                                </div>
                                {m.status === "APPROVED" && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => switchMode(m.organization.id)}
                                            className={`rounded px-3 py-1 text-xs ${
                                                activeOrganizationId === m.organization.id
                                                    ? "bg-emerald-600"
                                                    : "bg-indigo-600"
                                            }`}
                                        >
                                            {activeOrganizationId === m.organization.id ? "Active" : "Enable Mode"}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await switchMode(m.organization.id)
                                                navigate("/home")
                                            }}
                                            className="rounded bg-blue-600 px-3 py-1 text-xs"
                                        >
                                            Visit
                                        </button>
                                    </div>
                                )}
                                {m.status === "PENDING" && (
                                    <span className="w-fit rounded bg-amber-600/70 px-3 py-1 text-xs">
                                        Waiting Approval
                                    </span>
                                )}
                            </div>
                        ))}
                        {memberships.length === 0 && (
                            <p className="text-sm text-gray-400">No organization memberships yet.</p>
                        )}
                    </div>
                </div>

                {approvedMemberships.some((m) => m.role === "ADMIN") && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <button
                            onClick={() => navigate("/organization/dashboard")}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm"
                        >
                            Open Admin Dashboard
                        </button>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

export default OrganizationPage

