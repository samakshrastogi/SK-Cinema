import { useEffect, useState, useCallback } from "react"
import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import HeroCarousel from "@/components/HeroCarousel"
import VideoRow from "@/components/VideoRow"

/* ---------------- TYPES ---------------- */

interface Video {
  id: number
  title?: string
  aiTitle?: string
  thumbnailKey?: string
  videoKey?: string
}

interface RawVideo {
  id: number
  title?: string
  aiTitle?: string
  thumbnailKey?: string
  videoKey?: string
}

/* ---------------- COMPONENT ---------------- */

const Home = () => {

  const [videos, setVideos] = useState<Video[]>([])
  const [trending, setTrending] = useState<Video[]>([])
  const [recommended, setRecommended] = useState<Video[]>([])
  const [continueWatching, setContinueWatching] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------- HELPERS ---------------- */

  const normalize = (videos: RawVideo[]): Video[] => {
    if (!Array.isArray(videos)) return []

    return videos.map(v => ({
      id: v.id,
      title: v.title || v.aiTitle || `Video #${v.id}`,
      aiTitle: v.aiTitle ?? undefined,
      thumbnailKey: v.thumbnailKey,
      videoKey: v.videoKey
    }))
  }

  /* ---------------- FETCH ---------------- */

  const fetchHomeData = useCallback(async () => {
    try {
      const res = await api.get("/video")
      const raw: RawVideo[] = res.data?.data || []

      const allVideos = normalize(raw)

      setVideos(allVideos)

      setTrending(allVideos.slice(0, 12))
      setRecommended(allVideos.slice(12, 24))
      setContinueWatching(allVideos.slice(0, 8))

    } catch (error) {
      console.error("Home page load error", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHomeData()
  }, [fetchHomeData])

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

            {continueWatching.length > 0 && (
              <VideoRow
                title="Continue Watching"
                videos={continueWatching}
              />
            )}

            {trending.length > 0 && (
              <VideoRow
                title="🔥 Trending Now"
                videos={trending}
              />
            )}

            {recommended.length > 0 && (
              <VideoRow
                title="🎯 Recommended For You"
                videos={recommended}
              />
            )}

            {!trending.length && (
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