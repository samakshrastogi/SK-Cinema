import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"

interface Membership {
    id: string
    role: "ADMIN" | "MEMBER"
    status: "PENDING" | "APPROVED" | "REJECTED" | "LEFT"
    user: {
        id: string
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
        id: string
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    likes?: Array<{
        id: string
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    dislikes?: Array<{
        id: string
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    shares?: Array<{
        id: string
        user?: { name?: string; email: string }
        video?: { title: string }
    }>
    watchHistory?: Array<{
        id: string
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
    const [activeTab, setActiveTab] = useState<"views" | "likes" | "shares" | "watchHistory">("views")
    const [search, setSearch] = useState("")
    const [orgId, setOrgId] = useState<string | null>(null)
    const [ownerId, setOwnerId] = useState<string | null>(null)
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
    const [organizationPublicLink, setOrganizationPublicLink] = useState("")
    const [organizationPrivateLink, setOrganizationPrivateLink] = useState("")
    const [copiedType, setCopiedType] = useState<string | null>(null)
    const [savedSettings, setSavedSettings] = useState(false)

    const approvedMembers = useMemo(() =>
        memberships.filter(
            (m) =>
                m.status === "APPROVED" &&
                (m.user.name || m.user.email)
                    .toLowerCase()
                    .includes(search.toLowerCase())
        ),
        [memberships, search])
    const pendingMembers = useMemo(
        () => memberships.filter((m) => m.status === "PENDING"),
        [memberships]
    )


    const loadAll = async () => {
        const my = await api.get("/organization/my")
        interface OrgInfo {
            id: string
            ownerId?: string
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
        setSavedSettings(true)
        setTimeout(() => setSavedSettings(false), 2000)
    }

    const approve = async (id: string) => {
        await api.post(`/organization/membership/${id}/approve`)
        setMessage("Request approved.")
        await loadAll()
    }

    const makeAdmin = async (id: string) => {
        await api.post(`/organization/membership/${id}/role`, { role: "ADMIN" })
        setMessage("Member promoted to admin.")
        await loadAll()
    }

    const removeAdmin = async (id: string) => {
        await api.post(`/organization/membership/${id}/role`, { role: "MEMBER" })
        setMessage("Admin removed.")
        await loadAll()
    }

    const removeMember = async (id: string) => {
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

    const copyLink = async (link: string, type: string) => {
        if (!link) return

        try {
            await navigator.clipboard.writeText(link)
            setCopiedType(type)
        } catch {
            setCopiedType("error")
        }

        setTimeout(() => setCopiedType(null), 2000)
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
            <div className="mx-auto max-w-7xl space-y-8 px-2 sm:px-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 shadow-lg space-y-4">

                    {/* TOP ROW */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
                                Organization Dashboard
                            </h1>
                            <p className="text-sm text-gray-400 mt-1">
                                {orgName || "No active admin organization"}
                            </p>
                        </div>

                        {/* QUICK ACTIONS */}
                        <div className="flex flex-wrap gap-2">

                            {/* PUBLIC */}
                            <button
                                onClick={() => copyLink(organizationPublicLink, "public")}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition px-3 py-2 text-xs font-medium shadow"
                            >
                                {copiedType === "public" ? "Copied!" : "Copy Public Link"}
                            </button>

                            {/* PRIVATE */}
                            <button
                                onClick={() => copyLink(organizationPrivateLink, "private")}
                                className="rounded-lg bg-amber-600 hover:bg-amber-500 transition px-3 py-2 text-xs font-medium shadow"
                            >
                                {copiedType === "private" ? "Copied!" : "Copy Private Link"}
                            </button>

                            {/* INVITE */}
                            <button
                                onClick={invite}
                                className="rounded-lg bg-purple-600 hover:bg-purple-500 transition px-3 py-2 text-xs font-medium shadow"
                            >
                                Invite User
                            </button>

                        </div>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
                            {message}
                        </div>
                    )}

                </div>

                {totals && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">

                        {Object.entries(totals).map(([k, v]) => (
                            <div
                                key={k}
                                className="rounded-xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 p-4 hover:scale-[1.02] transition shadow-sm"
                            >

                                {/* LABEL */}
                                <p className="text-xs capitalize text-gray-400 tracking-wide">
                                    {k}
                                </p>

                                {/* VALUE */}
                                <p className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {String(v)}
                                </p>

                                {/* SUBTEXT (INSIGHT) */}
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Total {k}
                                </p>

                            </div>
                        ))}

                    </div>
                )}
                <div className="grid gap-6 md:grid-cols-2">

                    {/* JOIN LINKS */}
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-xl p-5 space-y-5 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Organization Join Links</h2>
                            <p className="text-xs text-gray-300 mt-1">
                                Share links to let users join your organization instantly or via approval.
                            </p>
                        </div>

                        {/* PUBLIC LINK */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-emerald-300 font-medium">Public Access</p>
                                <span className="text-[10px] text-gray-400">No approval required</span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={organizationPublicLink}
                                    readOnly
                                    aria-label="public link"
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm tracking-wide"
                                />
                                <button
                                    onClick={() => copyLink(organizationPublicLink, "public")}
                                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition px-3 py-2 text-xs font-medium shadow"
                                >
                                    {copiedType === "public" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* PRIVATE LINK */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-amber-300 font-medium">Private Access</p>
                                <span className="text-[10px] text-gray-400">Approval required</span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={organizationPrivateLink}
                                    readOnly
                                    aria-label="private link"
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm tracking-wide"
                                />
                                <button
                                    onClick={() => copyLink(organizationPrivateLink, "private")}
                                    className="rounded-lg bg-amber-600 hover:bg-amber-500 transition px-3 py-2 text-xs font-medium shadow"
                                >
                                    {copiedType === "private" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        
                    </div>

                    {/* INVITE + PROMOTE */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-5 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Invite & Manage Access</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Invite users via email or promote members to admin roles.
                            </p>
                        </div>

                        {/* INVITE */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">Invite by Email</label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    aria-label="invite email"
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                />
                                <button
                                    onClick={invite}
                                    className="rounded-lg bg-purple-600 hover:bg-purple-500 transition px-4 py-2 text-sm font-medium shadow-md"
                                >
                                    Invite
                                </button>
                            </div>
                        </div>

                        {/* INVITE LINK */}
                        {latestInviteLink && (
                            <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
                                <p className="text-xs text-gray-300">
                                    Latest invite link (valid for 24h or until used)
                                </p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        value={latestInviteLink}
                                        readOnly
                                        aria-label="latest invite link"
                                        className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                                    />
                                    <button
                                        onClick={() => copyLink(latestInviteLink, "Invite link copied")}
                                        className="rounded-lg bg-blue-600 hover:bg-blue-500 transition px-3 py-2 text-xs font-medium"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PROMOTE */}
                        <div className="border-t border-white/10 pt-3 space-y-2">
                            <label className="text-xs text-gray-400">Promote to Admin</label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={promoteEmail}
                                    onChange={(e) => setPromoteEmail(e.target.value)}
                                    placeholder="member@example.com"
                                    aria-label="promote email"
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                                <button
                                    onClick={makeAdminByEmail}
                                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 transition px-4 py-2 text-sm font-medium shadow-md"
                                >
                                    Promote
                                </button>
                            </div>
                        </div>

                    </div>

                </div>
                <div className="grid gap-6 md:grid-cols-2">

                    {/* SETTINGS */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-6 space-y-5 shadow-lg">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Organization Settings</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Manage visibility, access, and upload permissions for your organization.
                            </p>
                        </div>

                        {/* TOGGLE SECTION */}
                        <div className="space-y-3">

                            <label className="flex items-center justify-between text-sm">
                                <span>Restrict users to organization content</span>
                                <input
                                    type="checkbox"
                                    aria-label="restrict to organization content"
                                    checked={restrictToOrgContent}
                                    onChange={(e) => setRestrictToOrgContent(e.target.checked)}
                                    className="accent-purple-500"
                                />
                            </label>

                            <p className="text-xs text-gray-400">
                                Members will only see videos uploaded within your organization.
                            </p>

                            <label className="flex items-center justify-between text-sm">
                                <span>Allow private videos (owner only)</span>
                                <input
                                    type="checkbox"
                                    aria-label="allow private videos"
                                    checked={allowPrivateContent}
                                    onChange={(e) => setAllowPrivateContent(e.target.checked)}
                                    className="accent-purple-500"
                                />
                            </label>

                        </div>

                        {/* DOMAIN */}
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Allowed Email Domain</label>
                            <input
                                value={allowedDomain}
                                aria-label="allowed email domain"
                                onChange={(e) => setAllowedDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />
                        </div>

                        {/* UPLOAD POLICY */}
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Upload Policy</label>
                            <select
                                value={uploadPolicy}
                                aria-label="upload policy"
                                onChange={(e) => setUploadPolicy(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            >
                                <option value="ADMINS_ONLY">Admins only upload</option>
                                <option value="ALL_MEMBERS">All members upload</option>
                                <option value="SPECIFIC_USERS">Specific users upload</option>
                            </select>
                        </div>

                        {/* CONDITIONAL FIELD */}
                        {uploadPolicy === "SPECIFIC_USERS" && (
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Allowed Uploaders (User IDs)</label>
                                <input
                                    value={allowedUploaderInput}
                                    aria-label="allowed uploader user ids"
                                    onChange={(e) => setAllowedUploaderInput(e.target.value)}
                                    placeholder="e.g. 12, 45, 78"
                                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                />
                                <p className="text-xs text-gray-500">
                                    Enter comma-separated user IDs allowed to upload.
                                </p>
                            </div>
                        )}

                        {/* SAVE BUTTON */}
                        <button
                            onClick={saveSettings}
                            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 transition px-4 py-2 text-sm font-medium shadow-md active:scale-95"
                        >
                            {savedSettings ? "Saved!" : "Save Settings"}
                        </button>
                    </div>

                    {/* BILLING */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 space-y-5 shadow-lg">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Billing & Plans</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Upgrade your organization plan to unlock premium features.
                            </p>
                        </div>

                        <div className="grid gap-3">

                            <button
                                onClick={() => upgrade("SIX_MONTH")}
                                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 transition px-4 py-3 text-sm font-medium shadow-md flex justify-between items-center"
                            >
                                <span>6 Months Plan</span>
                                <span className="text-xs text-white/80">₹18,000</span>
                            </button>

                            <button
                                onClick={() => upgrade("YEARLY_INITIAL")}
                                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 transition px-4 py-3 text-sm font-medium shadow-md flex justify-between items-center"
                            >
                                <span>Yearly (Initial)</span>
                                <span className="text-xs text-white/80">₹10,000</span>
                            </button>

                            <button
                                onClick={() => upgrade("YEARLY_RENEWAL")}
                                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 transition px-4 py-3 text-sm font-medium shadow-md flex justify-between items-center"
                            >
                                <span>Yearly Renewal</span>
                                <span className="text-xs text-white/80">₹24,000</span>
                            </button>

                        </div>
                    </div>

                </div>

                <div className="grid gap-6 md:grid-cols-2">

                    {/* PENDING REQUESTS */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Users waiting for approval to join your organization.
                            </p>
                        </div>

                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">

                            {pendingMembers.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-black/40 p-3 hover:bg-black/50 transition"
                                >
                                    <span className="truncate text-sm text-white">
                                        {m.user.name || m.user.email}
                                    </span>

                                    <button
                                        onClick={() => approve(m.id)}
                                        className="shrink-0 rounded bg-emerald-600 hover:bg-emerald-500 transition px-3 py-1 text-xs font-medium"
                                    >
                                        Approve
                                    </button>
                                </div>
                            ))}

                            {pendingMembers.length === 0 && (
                                <div className="text-center text-sm text-gray-400 py-6">
                                    🚀 No pending requests
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MEMBERS */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Members</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Manage roles and access of your organization members.
                            </p>
                        </div>

                        {/* SEARCH */}
                        <input
                            placeholder="Search members..."
                            value={search}
                            aria-label="search members"
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                        />

                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">

                            {approvedMembers.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-col gap-2 rounded-lg bg-black/40 p-3 hover:bg-black/50 transition sm:flex-row sm:items-center sm:justify-between"
                                >

                                    {/* USER INFO */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm text-white">
                                            {m.user.name || m.user.email}
                                        </span>

                                        {/* ROLE BADGE */}
                                        <span
                                            className={`text-xs px-2 py-1 rounded ${m.role === "ADMIN"
                                                ? "bg-indigo-500/20 text-indigo-300"
                                                : "bg-gray-500/20 text-gray-300"
                                                }`}
                                        >
                                            {m.role}
                                        </span>

                                        {/* USER ID */}
                                        <span className="text-xs text-gray-500">
                                            ID {m.user.id}
                                        </span>
                                    </div>

                                    {/* ACTIONS */}
                                    <div className="flex gap-2 flex-wrap">

                                        {m.role !== "ADMIN" && (
                                            <button
                                                onClick={() => makeAdmin(m.id)}
                                                className="rounded bg-indigo-600 hover:bg-indigo-500 transition px-3 py-1 text-xs font-medium"
                                            >
                                                Make Admin
                                            </button>
                                        )}

                                        {m.role === "ADMIN" && ownerId !== m.user.id && (
                                            <button
                                                onClick={() => removeAdmin(m.id)}
                                                className="rounded bg-rose-600 hover:bg-rose-500 transition px-3 py-1 text-xs font-medium"
                                            >
                                                Remove Admin
                                            </button>
                                        )}

                                        {ownerId !== m.user.id && (
                                            <button
                                                onClick={() => removeMember(m.id)}
                                                className="rounded bg-gray-700 hover:bg-gray-600 transition px-3 py-1 text-xs font-medium"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {approvedMembers.length === 0 && (
                                <div className="text-center text-sm text-gray-400 py-6">
                                    No members found
                                </div>
                            )}
                        </div>
                    </div>

                </div>



                <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4 shadow-md">

                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Top Performing Videos
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Ranked by engagement (Shares {'>'} Likes {'>'} Views)
                        </p>
                    </div>

                    <div className="space-y-2">

                        {topVideos.map((v, idx) => (
                            <div
                                key={v.publicId}
                                className="flex flex-col gap-2 rounded-lg bg-gradient-to-r from-black/40 to-black/20 p-3 text-sm hover:scale-[1.01] transition sm:flex-row sm:items-center sm:justify-between"
                            >

                                {/* TITLE + RANK */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-purple-400">
                                        #{idx + 1}
                                    </span>
                                    <span className="text-white font-medium truncate">
                                        {v.title}
                                    </span>
                                </div>

                                {/* STATS */}
                                <div className="flex gap-3 text-xs text-gray-300 flex-wrap">
                                    <span className="text-emerald-400">
                                        Shares {v.shares}
                                    </span>
                                    <span className="text-blue-400">
                                        Likes {v.likes}
                                    </span>
                                    <span className="text-gray-400">
                                        Views {v.views}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {topVideos.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-6">
                                🎬 No video performance data yet
                                <div className="text-xs mt-1 text-gray-500">
                                    Upload videos to start tracking engagement
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {activity?.watchHistory && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        {/* HEADER */}
                        <div>
                            <h2 className="text-lg font-semibold text-white">Activity</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Track user interactions across your organization
                            </p>
                        </div>

                        {/* TABS */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: "views", label: "Views" },
                                { key: "likes", label: "Likes / Dislikes" },
                                { key: "shares", label: "Shares" },
                                { key: "watchHistory", label: "Watch History" }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as "views" | "likes" | "shares" | "watchHistory")}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${activeTab === tab.key
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* CONTENT */}
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">

                            {/* VIEWS */}
                            {activeTab === "views" &&
                                (activity.views || []).map((v) => (
                                    <div
                                        key={v.id}
                                        className="rounded-lg bg-black/40 p-3 text-sm border border-white/5"
                                    >
                                        <p className="text-white">
                                            {v.user?.name || v.user?.email}
                                            <span className="text-gray-400"> viewed </span>
                                            {v.video?.title}
                                        </p>
                                    </div>
                                ))}

                            {/* LIKES / DISLIKES */}
                            {activeTab === "likes" && (
                                <>
                                    {(activity.likes || []).map((v) => (
                                        <div
                                            key={`l-${v.id}`}
                                            className="rounded-lg bg-black/40 p-3 text-sm border border-white/5"
                                        >
                                            <p className="text-white">
                                                {v.user?.name || v.user?.email}
                                                <span className="text-emerald-400"> liked </span>
                                                {v.video?.title}
                                            </p>
                                        </div>
                                    ))}

                                    {(activity.dislikes || []).map((v) => (
                                        <div
                                            key={`d-${v.id}`}
                                            className="rounded-lg bg-black/40 p-3 text-sm border border-white/5"
                                        >
                                            <p className="text-white">
                                                {v.user?.name || v.user?.email}
                                                <span className="text-rose-400"> disliked </span>
                                                {v.video?.title}
                                            </p>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* SHARES */}
                            {activeTab === "shares" &&
                                (activity.shares || []).map((v) => (
                                    <div
                                        key={`s-${v.id}`}
                                        className="rounded-lg bg-black/40 p-3 text-sm border border-white/5"
                                    >
                                        <p className="text-white">
                                            {v.user?.name || v.user?.email}
                                            <span className="text-blue-400"> shared </span>
                                            {v.video?.title}
                                        </p>
                                    </div>
                                ))}

                            {/* WATCH HISTORY */}
                            {activeTab === "watchHistory" &&
                                (activity.watchHistory || []).map((w) => (
                                    <div
                                        key={w.id}
                                        className="rounded-lg bg-black/40 p-3 text-sm border border-white/5"
                                    >
                                        <p className="text-white">
                                            {w.user?.name || w.user?.email}
                                            <span className="text-gray-400"> watched </span>
                                            {w.video?.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Watched {w.watchedSeconds}s • Position {w.lastPositionSeconds}s
                                        </p>
                                    </div>
                                ))}

                            {/* EMPTY STATE */}
                            {((activeTab === "views" && (activity.views || []).length === 0) ||
                                (activeTab === "likes" &&
                                    (activity.likes || []).length === 0 &&
                                    (activity.dislikes || []).length === 0) ||
                                (activeTab === "shares" && (activity.shares || []).length === 0) ||
                                (activeTab === "watchHistory" &&
                                    (activity.watchHistory || []).length === 0)) && (
                                    <div className="text-center text-sm text-gray-400 py-6">
                                        No activity available
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

export default OrganizationDashboard
