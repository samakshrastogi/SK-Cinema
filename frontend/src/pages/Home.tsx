import { useEffect, useState } from "react"
import { api } from "@/api/axios"
import AppLayout from "@/layouts/AppLayout"
import HeroCard from "@/components/HeroCard"
import VideoRow from "@/components/VideoRow"

interface Video {
  id: number
  title: string
  thumbnailKey?: string
}

const Home = () => {
  const [trending, setTrending] = useState<Video[]>([])
  const [recommended, setRecommended] = useState<Video[]>([])
  const [continueWatching, setContinueWatching] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      const res = await api.get("/video")
      const videos = res.data?.data || []

      setTrending(videos.slice(0, 10))
      setRecommended(videos.slice(10, 20))
      setContinueWatching(videos.slice(0, 6))
    } catch (error) {
      console.error("Home page load error", error)
    } finally {
      setLoading(false)
    }
  }

  // 🎬 Better Hero Selection (stable random)
  const heroVideo =
    trending.length > 0
      ? trending[Math.floor(Math.random() * Math.min(5, trending.length))]
      : undefined

  return (
    <AppLayout>
      <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto space-y-12">

        {/* 🔥 HERO */}
        {heroVideo && <HeroCard video={heroVideo} />}

        {/* 🎥 CONTENT */}
        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-6 w-40 bg-white/10 rounded mb-4 animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className="w-[220px] h-[130px] bg-white/10 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <VideoRow
              title="Continue Watching"
              videos={continueWatching}
            />

            <VideoRow
              title="Trending Now"
              videos={trending}
            />

            <VideoRow
              title="Recommended For You"
              videos={recommended}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default Home