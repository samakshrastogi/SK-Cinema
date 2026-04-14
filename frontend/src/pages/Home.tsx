import { useEffect, useState, useCallback, useMemo } from "react"
import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import HeroCarousel from "@/components/HeroCarousel"
import VideoRow from "@/components/VideoRow"

/* ---------------- TYPES ---------------- */

interface Video {
  publicId: string
  title?: string
  aiTitle?: string
  thumbnailKey?: string
  videoKey?: string
  uploaderAvatarKey?: string
  uploaderAvatarUrl?: string
  uploaderName?: string
  createdAt?: string
  orientation?: "PORTRAIT" | "LANDSCAPE" | "SQUARE" | null
  channel?: {
    name?: string
  }
}

interface RawVideo {
  publicId: string
  title?: string
  aiTitle?: string
  thumbnailKey?: string
  videoKey?: string
  uploaderAvatarKey?: string
  uploaderAvatarUrl?: string
  uploaderName?: string
  createdAt?: string
  orientation?: "PORTRAIT" | "LANDSCAPE" | "SQUARE" | null
  channel?: {
    name?: string
  }
}

/* ---------------- COMPONENT ---------------- */

const Home = () => {

  const [videos, setVideos] = useState<Video[]>([])
  const [landscapeVideos, setLandscapeVideos] = useState<Video[]>([])
  const [portraitVideos, setPortraitVideos] = useState<Video[]>([])
  const [orgVideos, setOrgVideos] = useState<Video[]>([])
  const [orgMemberships, setOrgMemberships] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [orgRowLoading, setOrgRowLoading] = useState(false)

  /* ---------------- HELPERS ---------------- */

  const normalize = (videos: RawVideo[]): Video[] => {
    if (!Array.isArray(videos)) return []

    return videos.map(v => ({
      publicId: v.publicId,   // ✅ FIX
      title: v.title || v.aiTitle || "Untitled",
      aiTitle: v.aiTitle ?? undefined,
      thumbnailKey: v.thumbnailKey,
      uploaderAvatarKey: v.uploaderAvatarKey ?? undefined,
      uploaderAvatarUrl: v.uploaderAvatarUrl ?? undefined,
      uploaderName: v.uploaderName ?? undefined,
      createdAt: v.createdAt ?? undefined,
      orientation: v.orientation ?? null,
      channel: v.channel ?? undefined
    }))
  }

  /* ---------------- FETCH ---------------- */

  const fetchHomeData = useCallback(async () => {
    try {
      const [res, orgRes] = await Promise.all([
        api.get("/video"),
        api.get("/organization/my")
      ])
      const raw: RawVideo[] = res.data?.data || []

      const allVideos = normalize(raw)
      const portraits = allVideos.filter(v => v.orientation === "PORTRAIT")
      const landscapes = allVideos.filter(v => v.orientation !== "PORTRAIT")

      setVideos(allVideos)
      setPortraitVideos(portraits)
      setLandscapeVideos(landscapes)

      const memberships = (orgRes.data?.data?.memberships || []).filter((m: any) => m.status === "APPROVED")
      setOrgMemberships(memberships)
      const activeOrgId = orgRes.data?.data?.access?.activeOrganizationId ?? null
      const defaultOrg =
        memberships.find((m: any) => m.organization?.id === activeOrgId) ||
        memberships[0]
      if (defaultOrg?.organization?.id) {
        setSelectedOrgId(defaultOrg.organization.id)
        setSelectedOrgName(defaultOrg.organization.name || "Organization")
      } else {
        setSelectedOrgId(null)
        setSelectedOrgName("")
      }

    } catch (error) {
      console.error("Home page load error", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHomeData()
  }, [fetchHomeData])

  const orgOptions = useMemo(
    () =>
      orgMemberships.map((m: any) => ({
        id: m.organization?.id,
        name: m.organization?.name || "Organization"
      })).filter((o: any) => Number.isFinite(o.id)),
    [orgMemberships]
  )

  const fetchOrgRow = useCallback(async (organizationId: number) => {
    try {
      setOrgRowLoading(true)
      const res = await api.get(`/video/organization/${organizationId}`)
      const raw: RawVideo[] = res.data?.data || []
      setOrgVideos(normalize(raw))
    } catch (err) {
      console.error("Organization row load error", err)
      setOrgVideos([])
    } finally {
      setOrgRowLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgRow(selectedOrgId)
    } else {
      setOrgVideos([])
    }
  }, [selectedOrgId, fetchOrgRow])

  /* ---------------- UI ---------------- */

  return (
    <AppLayout>

      <div
        className="
          max-w-375 mx-auto
          space-y-10 sm:space-y-12
        "
      >

        {/* HERO */}
        {videos.length > 0 && (
          <div className="relative">
            <HeroCarousel videos={videos} />

            <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-black to-transparent pointer-events-none" />
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <SkeletonLoader />
        ) : (
          <div className="space-y-10">

            {selectedOrgId && (
              <VideoRow
                title={selectedOrgName ? `${selectedOrgName} Videos` : "Organization Videos"}
                videos={orgVideos}
                rightSlot={
                  <div className="flex items-center gap-2">
                    {orgRowLoading && (
                      <span className="text-xs text-gray-400">Loading...</span>
                    )}
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        const nextId = Number(e.target.value)
                        const nextOrg = orgOptions.find((o: any) => o.id === nextId)
                        setSelectedOrgId(nextId)
                        setSelectedOrgName(nextOrg?.name || "Organization")
                      }}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs"
                    >
                      {orgOptions.map((org: any) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              />
            )}

            {landscapeVideos.length > 0 && (
              <VideoRow
                title="🖥️ Landscape Videos"
                videos={landscapeVideos}
              />
            )}

            {portraitVideos.length > 0 && (
              <VideoRow
                title="📱 Portrait Videos"
                videos={portraitVideos}
              />
            )}

            {!landscapeVideos.length && !portraitVideos.length && (
              <div className="text-center text-gray-400 py-20">
                No videos available yet
              </div>
            )}

          </div>
        )}

      </div>

    </AppLayout>
  )
}

/* ---------------- SKELETON ---------------- */

const SkeletonLoader = () => {
  return (
    <div className="space-y-8">

      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">

          <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />

          <div className="flex flex-col gap-3 sm:hidden">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-22.5 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>

          <div className="hidden sm:flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="w-55 h-32.5 bg-white/10 rounded-lg animate-pulse"
              />
            ))}
          </div>

        </div>
      ))}

    </div>
  )
}

export default Home
