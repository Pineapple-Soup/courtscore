'use client';

import { useEffect, useState } from "react";
import { Video } from "@/types/video";

const VideoList = () => {
    const [videos, setVideos] = useState<Video[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchVideos = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/videos');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (mounted) setVideos(Array.isArray(data) ? data : []);
            } catch (e: any) {
                if (mounted) setError(e.message || 'Failed to fetch videos');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchVideos();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) return <div>Loading videos…</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!videos || videos.length === 0) return <div>No videos found.</div>;

    return (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {videos.map((v) => (
                <div key={v.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                    {v.thumbnail ? (
                        <img src={v.thumbnail} alt={v.title || v.id} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 }} />
                    ) : null}
                    <h4 style={{ margin: '8px 0' }}>{v.title || 'Untitled'}</h4>
                    <video src={v.src} controls style={{ width: '100%', borderRadius: 4, background: '#000' }} />
                    <div style={{ marginTop: 8 }}>
                        <a href={v.src} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VideoList;