
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AppLayout from "@/layouts/AppLayout"
import { api } from "@/api/axios"

// Types for organization membership and API errors
interface Organization {
    id: string;
    name: string;
}

type MembershipStatus = "APPROVED" | "PENDING";
type MembershipRole = "ADMIN" | "MEMBER";

interface Membership {
    id: string;
    organization: Organization;
    role: MembershipRole;
    status: MembershipStatus;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
        status?: number;
    };
    message?: string;
}

const OrganizationPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [memberships, setMemberships] = useState<Membership[]>([])
    const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [joinInput, setJoinInput] = useState("")
    const [message, setMessage] = useState("")
    const [linkInfo, setLinkInfo] = useState<{ name: string; linkType: "PUBLIC" | "PRIVATE" } | null>(null)
    const [linkJoining, setLinkJoining] = useState(false)
    const [createdLinks, setCreatedLinks] = useState<{ publicLink: string; privateLink: string } | null>(null)
    const [copiedLinkType, setCopiedLinkType] = useState<"public" | "private" | null>(null)
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
        load().catch((err: ApiError) => {
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
            .catch((err: ApiError) => {
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
            .catch((err: ApiError) => {
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
        } catch (err) {
            const apiErr = err as ApiError
            setMessage(apiErr?.response?.data?.message || "Failed to join organization via shared link.")
        } finally {
            setLinkJoining(false)
        }
    }

    const createOrganization = async () => {
        if (!name.trim()) return
        const res = await api.post("/organization", {
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || undefined,
            plan
        })
        setCreatedLinks({
            publicLink: res.data?.links?.publicLink || "",
            privateLink: res.data?.links?.privateLink || ""
        })
        setName("")
        setSlug("")
        setDescription("")
        await load()
        setMessage("Organization created.")
    }

    const copyCreatedLink = async (link: string, type: "public" | "private") => {
        if (!link) return

        try {
            await navigator.clipboard.writeText(link)
            setCopiedLinkType(type)
            setTimeout(() => setCopiedLinkType(null), 2000)
        } catch {
            setMessage("Failed to copy join link.")
        }
    }

    const requestJoin = async () => {
        if (!joinInput.trim()) return
        try {
            let res
            try {
                res = await api.post("/organization/join-request", {
                    organization: joinInput.trim()
                })
            } catch (inner) {
                const innerErr = inner as ApiError
                if (innerErr?.response?.status === 404) {
                    try {
                        await api.get("/organization/ping")
                    } catch (pingErr) {
                        const pingError = pingErr as ApiError
                        if (pingError?.response?.status === 404) {
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
        } catch (err) {
            const apiErr = err as ApiError
            const fallback =
                apiErr?.response?.status === 404
                    ? "Organization join endpoint not found. Please restart the backend server."
                    : "Failed to send join request."
            setMessage(apiErr?.message || apiErr?.response?.data?.message || fallback)
        }
    }

    const switchMode = async (organizationId: string | null) => {
        await api.post("/organization/mode", { organizationId })
        await load()
        setMessage(organizationId ? "Organization mode enabled." : "Organization mode disabled.")
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-2">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 shadow-lg space-y-4">

                    {/* TITLE */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
                            Organization
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                            Create, join, and manage your organization access.
                        </p>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
                            {message}
                        </div>
                    )}

                </div>

                {orgToken && linkInfo && (
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        {/* HEADER */}
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Join Organization
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                You’ve been invited via a shared link
                            </p>
                        </div>

                        {/* ORG INFO */}
                        <div className="space-y-1">
                            <p className="text-sm text-gray-300">
                                Organization:
                                <span className="ml-1 font-semibold text-white">
                                    {linkInfo.name}
                                </span>
                            </p>

                            <p className="text-xs">
                                {linkInfo.linkType === "PUBLIC" ? (
                                    <span className="text-emerald-400">
                                        Public Access • Instant Join
                                    </span>
                                ) : (
                                    <span className="text-amber-400">
                                        Private Access • Requires Approval
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* ACTION */}
                        <button
                            onClick={handleJoinByLink}
                            disabled={linkJoining}
                            className="w-full sm:w-fit rounded-lg bg-blue-600 hover:bg-blue-500 transition px-4 py-2 text-sm font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {linkJoining ? "Sending Request..." : "Join Organization"}
                        </button>

                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">

                    {/* CREATE ORGANIZATION */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Create Organization</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Set up a new organization to manage users and content.
                            </p>
                        </div>

                        {createdLinks && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                                <p className="text-sm font-medium text-white">
                                    Organization join links
                                </p>
                                <div className="space-y-2">
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            value={createdLinks.publicLink}
                                            readOnly
                                            aria-label="created public organization link"
                                            className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                                        />
                                        <button
                                            onClick={() => copyCreatedLink(createdLinks.publicLink, "public")}
                                            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition px-3 py-2 text-xs font-medium shadow-md"
                                        >
                                            {copiedLinkType === "public" ? "Copied!" : "Copy Public"}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            value={createdLinks.privateLink}
                                            readOnly
                                            aria-label="created private organization link"
                                            className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                                        />
                                        <button
                                            onClick={() => copyCreatedLink(createdLinks.privateLink, "private")}
                                            className="rounded-lg bg-amber-600 hover:bg-amber-500 transition px-3 py-2 text-xs font-medium shadow-md"
                                        >
                                            {copiedLinkType === "private" ? "Copied!" : "Copy Private"}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Public link joins immediately. Private link sends an approval request to admins.
                                </p>
                            </div>
                        )}

                        {/* INPUTS */}
                        <div className="space-y-3">

                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Organization name"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />

                            <input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="Slug (optional)"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (optional)"
                                rows={3}
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />

                            <select
                                value={plan}
                                aria-label="select subscription plan"
                                onChange={(e) => setPlan(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            >
                                <option value="TRIAL_FREE">3 month free trial</option>
                                <option value="SIX_MONTH">6 month subscription (Rs 18000)</option>
                                <option value="YEARLY_INITIAL">Yearly initial (Rs 10000 one-time)</option>
                                <option value="YEARLY_RENEWAL">Yearly renewal (Rs 24000 annually)</option>
                            </select>

                        </div>

                        {/* CTA */}
                        <button
                            onClick={createOrganization}
                            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 transition px-4 py-2 text-sm font-medium shadow-md active:scale-95"
                        >
                            Create Organization
                        </button>
                    </div>


                    {/* JOIN ORGANIZATION */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-blue-500/10 backdrop-blur-xl p-5 space-y-4 shadow-md">

                        <div>
                            <h2 className="text-lg font-semibold text-white">Join Organization</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Enter an organization slug, ID, or public/private join link.
                            </p>
                        </div>

                        {/* INPUT */}
                        <div className="space-y-3">
                            <input
                                value={joinInput}
                                onChange={(e) => setJoinInput(e.target.value)}
                                placeholder="Organization slug, ID, or join link"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>

                        {/* CTA */}
                        <button
                            onClick={requestJoin}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 transition px-4 py-2 text-sm font-medium shadow-md active:scale-95"
                        >
                            Request Join
                        </button>

                        {/* INFO */}
                        <p className="text-xs text-gray-400">
                            Public links join instantly. Private links stay pending until an admin approves them.
                        </p>
                    </div>

                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 space-y-4 shadow-lg">

                    {/* HEADER */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-white">My Organizations</h2>
                            <p className="text-xs text-gray-400">
                                Manage your memberships and switch organization mode.
                            </p>
                        </div>

                        <button
                            onClick={() => switchMode(null)}
                            className="rounded-lg bg-gray-700 hover:bg-gray-600 transition px-3 py-1.5 text-xs font-medium"
                        >
                            Disable Org Mode
                        </button>
                    </div>

                    {/* LIST */}
                    <div className="space-y-3">

                        {memberships.map((m) => {
                            const isActive = activeOrganizationId === m.organization?.id

                            return (
                                <div
                                    key={m.id}
                                    className={`flex flex-col gap-3 rounded-xl p-4 transition sm:flex-row sm:items-center sm:justify-between
                    ${isActive
                                            ? "bg-emerald-600/10 border border-emerald-500/20"
                                            : "bg-black/30 border border-white/5 hover:bg-black/40"
                                        }`}
                                >

                                    {/* LEFT INFO */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-white">
                                            {m.organization?.name}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 text-xs">

                                            {/* ROLE */}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${m.role === "ADMIN"
                                                    ? "bg-purple-600/20 text-purple-300"
                                                    : "bg-gray-600/20 text-gray-300"
                                                }`}>
                                                {m.role}
                                            </span>

                                            {/* STATUS */}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${m.status === "APPROVED"
                                                    ? "bg-emerald-600/20 text-emerald-300"
                                                    : "bg-amber-600/20 text-amber-300"
                                                }`}>
                                                {m.status}
                                            </span>

                                            {/* ACTIVE */}
                                            {isActive && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-600 text-white">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ACTIONS */}
                                    {m.status === "APPROVED" && (
                                        <div className="flex flex-wrap items-center gap-2">

                                            <button
                                                onClick={() => switchMode(m.organization.id)}
                                                className={`rounded-lg px-3 py-1 text-xs font-medium transition
                                    ${isActive
                                                        ? "bg-emerald-600"
                                                        : "bg-indigo-600 hover:bg-indigo-500"
                                                    }`}
                                            >
                                                {isActive ? "Active" : "Enable"}
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    await switchMode(m.organization.id)
                                                    navigate("/home")
                                                }}
                                                className="rounded-lg bg-blue-600 hover:bg-blue-500 transition px-3 py-1 text-xs font-medium"
                                            >
                                                Visit
                                            </button>

                                        </div>
                                    )}

                                    {/* PENDING */}
                                    {m.status === "PENDING" && (
                                        <span className="w-fit rounded-full bg-amber-600/20 text-amber-300 px-3 py-1 text-xs font-medium">
                                            Waiting for Approval
                                        </span>
                                    )}

                                </div>
                            )
                        })}

                        {memberships.length === 0 && (
                            <div className="text-center py-6 text-sm text-gray-400">
                                No organization memberships yet.
                            </div>
                        )}

                    </div>

                </div>

                {approvedMemberships.some((m) => m.role === "ADMIN") && (
                    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 backdrop-blur-xl p-5 shadow-md">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            {/* TEXT */}
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    Admin Dashboard Access
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    You have admin privileges. Manage members, content, and organization settings.
                                </p>
                            </div>

                            {/* CTA BUTTON */}
                            <button
                                onClick={() => navigate("/organization/dashboard")}
                                className="rounded-lg bg-amber-600 hover:bg-amber-500 transition px-4 py-2 text-sm font-medium shadow-md active:scale-95"
                            >
                                Open Dashboard
                            </button>

                        </div>

                    </div>
                )}
            </div>
        </AppLayout>
    )
}

export default OrganizationPage

