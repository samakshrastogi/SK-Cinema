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

  if (loading) {

    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh] text-gray-300">
          Loading videos...
        </div>
      </AppLayout>
    )

  }

  const heroVideo =
    trending.length > 0
      ? trending[Math.floor(Math.random() * trending.length)]
      : undefined

  return (

    <AppLayout>

      <div className="max-w-7xl mx-auto space-y-10">

        {/* Hero */}
        {heroVideo && <HeroCard video={heroVideo} />}

        {/* Rows */}
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

      </div>

    </AppLayout>

  )

}

export default Home