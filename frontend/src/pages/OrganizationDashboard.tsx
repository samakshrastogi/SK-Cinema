import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"

interface Membership {
    id: number
    role: "ADMIN" | "MEMBER"
    status: "PENDING" | "APPROVED" | "REJECTED" | "LEFT"
    user: {
        id: number
        name?: string
        email: string
    }
}

interface Video {
    publicId: string
    title: string
    shares: number
    likes: number
    views: number
}

interface Activity {
    views?: Array<{
        id: number
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    likes?: Array<{
        id: number
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    dislikes?: Array<{
        id: number
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    shares?: Array<{
        id: number
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    watchHistory?: Array<{
        id: number
        user?: { name?: string; email: string }
        video?: { title: string }
        watchedSeconds: number
        lastPositionSeconds: number
    }>
}

interface Totals {
    [key: string]: string | number
}

const OrganizationDashboard = () => {
    const [orgId, setOrgId] = useState<number | null>(null)
    const [ownerId, setOwnerId] = useState<number | null>(null)
    const [orgName, setOrgName] = useState("")
    const [allowPrivateContent, setAllowPrivateContent] = useState(false)
    const [restrictToOrgContent, setRestrictToOrgContent] = useState(false)
    const [allowedDomain, setAllowedDomain] = useState("")
    const [uploadPolicy, setUploadPolicy] = useState("ADMINS_ONLY")
    const [allowedUploaderInput, setAllowedUploaderInput] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [memberships, setMemberships] = useState<Membership[]>([])
    const [topVideos, setTopVideos] = useState<Video[]>([])
    const [activity, setActivity] = useState<Activity | null>(null)
    const [totals, setTotals] = useState<Totals | null>(null)
    const [message, setMessage] = useState("")
    const [promoteEmail, setPromoteEmail] = useState("")
    const [latestInviteLink, setLatestInviteLink] = useState("")
    const [copyMessage, setCopyMessage] = useState("")
    const [organizationPublicLink, setOrganizationPublicLink] = useState("")
    const [organizationPrivateLink, setOrganizationPrivateLink] = useState("")

    const approvedMembers = useMemo(
        () => memberships.filter((m) => m.status === "APPROVED"),
        [memberships]
    )
    const pendingMembers = useMemo(
        () => memberships.filter((m) => m.status === "PENDING"),
        [memberships]
    )

    const loadAll = async () => {
        const my = await api.get("/organization/my")
        interface OrgInfo {
            id: number
            ownerId?: number
            name: string
            allowPrivateContent?: boolean
            allowPublicContent?: boolean
            allowedDomain?: string
            uploadPolicy?: string
        }
        const myMemberships: Array<{ status: string; role: string; organization?: OrgInfo }> = my.data?.data?.memberships || []
        const adminMembership = myMemberships.find(
            (m) => m.status === "APPROVED" && m.role === "ADMIN"
        )

        if (!adminMembership?.organization?.id) {
            setMessage("You are not an organization admin.")
            return
        }

        const id = adminMembership.organization.id
        setOrgId(id)
        setOwnerId(adminMembership.organization.ownerId || null)
        setOrgName(adminMembership.organization.name)
        setAllowPrivateContent(Boolean(adminMembership.organization.allowPrivateContent))
        setRestrictToOrgContent(!adminMembership.organization.allowPublicContent)
        setAllowedDomain(adminMembership.organization.allowedDomain || "")
        setUploadPolicy(adminMembership.organization.uploadPolicy || "ADMINS_ONLY")

        const [memberRes, dashRes, linkRes] = await Promise.all([
            api.get(`/organization/${id}/members`),
            api.get(`/organization/dashboard/${id}`),
            api.get(`/organization/${id}/share-link`)
        ])

        setMemberships(memberRes.data?.data?.memberships || [])
        setTopVideos(dashRes.data?.data?.topVideos || [])
        setActivity(dashRes.data?.data?.activity || null)
        setTotals(dashRes.data?.data?.totals || null)
        setOrganizationPublicLink(linkRes.data?.data?.publicLink || "")
        setOrganizationPrivateLink(linkRes.data?.data?.privateLink || "")
    }

    useEffect(() => {
        // Avoid calling setState directly in effect body, use async function
        const fetchData = async () => {
            try {
                await loadAll()
            } catch (err) {
                console.error(err)
                setMessage("Failed to load organization dashboard.")
            }
        }
        fetchData()
    }, [])

    const saveSettings = async () => {
        if (!orgId) return
        const allowedUploaderUserIds = allowedUploaderInput
            .split(",")
            .map((x) => Number(x.trim()))
            .filter((x) => Number.isFinite(x) && x > 0)

        await api.post("/organization/settings", {
            organizationId: orgId,
            allowPublicContent: !restrictToOrgContent,
            allowPrivateContent,
            allowedDomain,
            uploadPolicy,
            allowedUploaderUserIds
        })
        setMessage("Organization settings updated.")
    }

    const approve = async (id: number) => {
        await api.post(`/organization/membership/${id}/approve`)
        setMessage("Request approved.")
        await loadAll()
    }

    const makeAdmin = async (id: number) => {
        await api.post(`/organization/membership/${id}/role`, { role: "ADMIN" })
        setMessage("Member promoted to admin.")
        await loadAll()
    }

    const removeAdmin = async (id: number) => {
        await api.post(`/organization/membership/${id}/role`, { role: "MEMBER" })
        setMessage("Admin removed.")
        await loadAll()
    }

    const removeMember = async (id: number) => {
        await api.post(`/organization/membership/${id}/remove`)
        setMessage("Member removed.")
        await loadAll()
    }

    const makeAdminByEmail = async () => {
        if (!orgId || !promoteEmail.trim()) return
        await api.post("/organization/membership/promote-by-email", {
            organizationId: orgId,
            email: promoteEmail.trim().toLowerCase()
        })
        setPromoteEmail("")
        await loadAll()
        setMessage("User promoted to admin by email.")
    }

    const invite = async () => {
        if (!orgId || !inviteEmail.trim()) return
        const res = await api.post("/organization/invite", {
            organizationId: orgId,
            email: inviteEmail.trim().toLowerCase()
        })
        setLatestInviteLink(res.data?.data?.inviteLink || "")
        setInviteEmail("")
        setMessage("Invite created and sent to email. Link expires in 24 hours.")
    }

    const copyLink = async (link: string, successText: string) => {
        if (!link) return
        try {
            await navigator.clipboard.writeText(link)
            setCopyMessage(successText)
        } catch {
            setCopyMessage("Copy failed. Please copy manually.")
        }
        window.setTimeout(() => setCopyMessage(""), 2000)
    }

    const upgrade = async (plan: "SIX_MONTH" | "YEARLY_INITIAL" | "YEARLY_RENEWAL") => {
        if (!orgId) return
        await api.post("/organization/subscription", {
            organizationId: orgId,
            plan
        })
        await loadAll()
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl space-y-6 px-1 sm:px-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <h1 className="text-xl font-bold sm:text-2xl">Organization Admin Dashboard</h1>
                    <p className="text-sm text-gray-400">{orgName || "No active admin organization"}</p>
                    {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
                </div>

                {totals && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                        {Object.entries(totals).map(([k, v]) => (
                            <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <p className="text-xs capitalize text-gray-400">{k}</p>
                                <p className="text-lg font-semibold sm:text-xl">{String(v)}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Organization Settings</h2>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={restrictToOrgContent}
                                onChange={(e) => {
                                    const next = e.target.checked
                                    setRestrictToOrgContent(next)
                                    // setAllowPublicContent does not exist, just use restrictToOrgContent for logic
                                }}
                                aria-label="Restrict users to your content"
                                title="Restrict users to your content"
                            />
                            Restrict users to your content
                        </label>
                        <p className="text-xs text-gray-400">
                            When enabled, members only see organization videos uploaded by admins.
                        </p>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={allowPrivateContent}
                                onChange={(e) => setAllowPrivateContent(e.target.checked)}
                                aria-label="Allow private videos (owner-only)"
                                title="Allow private videos (owner-only)"
                            />
                            Allow private videos (owner-only)
                        </label>
                        <input
                            aria-label="Allowed email domain"
                            value={allowedDomain}
                            onChange={(e) => setAllowedDomain(e.target.value)}
                            placeholder="Allowed email domain (example.com)"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                            title="Allowed email domain (example.com)"
                        />
                        <select
                            aria-label="Upload policy"
                            value={uploadPolicy}
                            onChange={(e) => setUploadPolicy(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                            title="Upload policy"
                        >
                            <option value="ADMINS_ONLY">Admins only upload</option>
                            <option value="ALL_MEMBERS">All members upload</option>
                            <option value="SPECIFIC_USERS">Specific users upload</option>
                        </select>
                        <input
                            aria-label="Allowed uploader user IDs"
                            value={allowedUploaderInput}
                            onChange={(e) => setAllowedUploaderInput(e.target.value)}
                            placeholder="Allowed uploader user IDs (comma separated)"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                            title="Allowed uploader user IDs (comma separated)"
                        />
                        <button onClick={saveSettings} className="rounded-lg bg-purple-600 px-4 py-2 text-sm">
                            Save Settings
                        </button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Billing</h2>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => upgrade("SIX_MONTH")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm">
                                6 months (Rs 18000)
                            </button>
                            <button onClick={() => upgrade("YEARLY_INITIAL")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm">
                                Yearly initial (Rs 10000)
                            </button>
                            <button onClick={() => upgrade("YEARLY_RENEWAL")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm">
                                Yearly renewal (Rs 24000)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Pending Requests</h2>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                            {pendingMembers.map((m) => (
                                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/25 p-2">
                                    <span className="truncate text-sm">{m.user.name || m.user.email}</span>
                                    <button onClick={() => approve(m.id)} className="shrink-0 rounded bg-emerald-600 px-3 py-1 text-xs">
                                        Approve
                                    </button>
                                </div>
                            ))}
                            {pendingMembers.length === 0 && <p className="text-sm text-gray-400">No pending requests.</p>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <h2 className="font-semibold">Members</h2>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                            {approvedMembers.map((m) => (
                                <div key={m.id} className="flex flex-col gap-2 rounded-lg bg-black/25 p-2 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-sm">{m.user.name || m.user.email} (ID {m.user.id}, {m.role})</span>
                                    <div className="flex gap-2">
                                        {m.role !== "ADMIN" && (
                                            <button onClick={() => makeAdmin(m.id)} className="rounded bg-indigo-600 px-3 py-1 text-xs">
                                                Make Admin
                                            </button>
                                        )}
                                        {m.role === "ADMIN" && ownerId !== m.user.id && (
                                            <button onClick={() => removeAdmin(m.id)} className="rounded bg-rose-600 px-3 py-1 text-xs">
                                                Remove Admin
                                            </button>
                                        )}
                                        {ownerId !== m.user.id && (
                                            <button onClick={() => removeMember(m.id)} className="rounded bg-gray-700 px-3 py-1 text-xs">
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <h2 className="font-semibold">Permanent Organization Join Links</h2>
                    <p className="text-xs text-gray-300">Public link joins directly. Private link sends a join request for approval.</p>

                    <div className="space-y-2">
                        <p className="text-xs text-emerald-300">Public (No approval)</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input value={organizationPublicLink} readOnly className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" />
                            <button onClick={() => copyLink(organizationPublicLink, "Public organization link copied.")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs">
                                Copy Public
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-amber-300">Private (Approval required)</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input value={organizationPrivateLink} readOnly className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" />
                            <button onClick={() => copyLink(organizationPrivateLink, "Private organization link copied.")} className="rounded-lg bg-amber-600 px-3 py-2 text-xs">
                                Copy Private
                            </button>
                        </div>
                    </div>

                    {copyMessage && <p className="text-xs text-emerald-300">{copyMessage}</p>}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <h2 className="font-semibold">Invite by Email</h2>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                            aria-label="Invite email"
                            title="Invite email"
                        />
                        <button onClick={invite} className="rounded-lg bg-purple-600 px-4 py-2 text-sm">Invite</button>
                    </div>

                    {latestInviteLink && (
                        <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
                            <p className="text-xs text-gray-300">Latest invite link (24h or first successful join):</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input value={latestInviteLink} readOnly className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" />
                                <button onClick={() => copyLink(latestInviteLink, "Invite link copied.")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs">Copy Invite</button>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-white/10 pt-2">
                        <h3 className="mb-2 text-sm font-medium">Promote To Admin By Email</h3>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                value={promoteEmail}
                                onChange={(e) => setPromoteEmail(e.target.value)}
                                placeholder="member@example.com"
                                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                                aria-label="Promote email"
                                title="Promote email"
                            />
                            <button onClick={makeAdminByEmail} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm">Make Admin</button>
                        </div>
                    </div>
                </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <h2 className="font-semibold">Top 5 Performing Videos (shares {'>'} likes {'>'} views)</h2>
                    <div className="space-y-2">
                        {topVideos.map((v, idx) => (
                            <div key={v.publicId} className="flex flex-col gap-1 rounded-lg bg-black/25 p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <span>{idx + 1}. {v.title}</span>
                                <span className="text-gray-300">Shares {v.shares} • Likes {v.likes} • Views {v.views}</span>
                            </div>
                        ))}
                        {topVideos.length === 0 && <p className="text-sm text-gray-400">No video data available.</p>}
                    </div>
                </div>

                {activity?.watchHistory && (
                    <>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                            <h2 className="font-semibold">Recent Views</h2>
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {(activity.views || []).map((v) => (
                                    <div key={v.id} className="rounded-lg bg-black/25 p-2 text-sm">
                                        <p>{v.user?.name || v.user?.email} viewed {v.video?.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                            <h2 className="font-semibold">Recent Likes / Dislikes</h2>
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {(activity.likes || []).map((v) => (
                                    <div key={`l-${v.id}`} className="rounded-lg bg-black/25 p-2 text-sm">
                                        <p>{v.user?.name || v.user?.email} liked {v.video?.title}</p>
                                    </div>
                                ))}
                                {(activity.dislikes || []).map((v) => (
                                    <div key={`d-${v.id}`} className="rounded-lg bg-black/25 p-2 text-sm">
                                        <p>{v.user?.name || v.user?.email} disliked {v.video?.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                            <h2 className="font-semibold">Recent Shares</h2>
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {(activity.shares || []).map((v) => (
                                    <div key={`s-${v.id}`} className="rounded-lg bg-black/25 p-2 text-sm">
                                        <p>{v.user?.name || v.user?.email} shared {v.video?.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                            <h2 className="font-semibold">Recent Watch History (Org)</h2>
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {activity.watchHistory.map((w) => (
                                    <div key={w.id} className="rounded-lg bg-black/25 p-2 text-sm">
                                        <p>{w.user?.name || w.user?.email} watched {w.video?.title}</p>
                                        <p className="text-xs text-gray-400">Watched {w.watchedSeconds}s • Position {w.lastPositionSeconds}s</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </AppLayout>
    )
}

export default OrganizationDashboard
