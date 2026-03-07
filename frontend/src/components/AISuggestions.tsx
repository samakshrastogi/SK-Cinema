import { useEffect, useState } from "react"
import axios from "axios"

type Props = {
    videoId: number
}

export default function AISuggestions({ videoId }: Props) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")

    useEffect(() => {
        fetchSuggestions()
    }, [videoId])

    const fetchSuggestions = async () => {
        try {
            const res = await axios.get(`/api/ai/video/${videoId}`)
            setData(res.data)
            setTitle(res.data.title || "")
            setDescription(res.data.description || "")
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const applySuggestion = async () => {
        try {
            await axios.post(`/api/ai/video/${videoId}/apply`)
            alert("AI suggestion applied")
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) return <p>Generating AI metadata...</p>

    return (
        <div className="ai-box">
            <h2>AI Suggestions</h2>

            <div>
                <label>Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label>Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div>
                <label>Keywords</label>
                <div className="tags">
                    {data.keywords?.map((k: string) => (
                        <span key={k}>{k}</span>
                    ))}
                </div>
            </div>

            <div>
                <label>Tags</label>
                <div className="tags">
                    {data.tags?.map((t: string) => (
                        <span key={t}>{t}</span>
                    ))}
                </div>
            </div>

            <button onClick={applySuggestion}>
                Use AI Suggestion
            </button>
        </div>
    )
}