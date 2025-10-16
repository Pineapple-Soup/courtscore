'use client';

import VideoList from "@/components/VideoList";
import { useRef, useState } from "react";

const Dashboard = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch('http://localhost:8000/api/v1/upload_video', {
                    method: 'POST',
                    body: formData,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                console.log('Upload successful:', data);
            } catch (error) {
                console.error('Error uploading video:', error);
            }
        }
    };

    return (
        <div className='flex flex-col p-4'>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold">Dashboard</h1>
                <input
                    type='file'
                    accept='video/*'
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className='hidden'
                />
                <button
                    onClick={handleUploadClick}
                    className='px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 cursor-pointer transition'>
                    Upload Video
                </button>
            </div>
            <VideoList />
        </div>
    );
};

export default Dashboard;
