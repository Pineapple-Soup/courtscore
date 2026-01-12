"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVideoStore } from "@/store/useVideoStore";
import { Upload, LogOut } from "lucide-react";
import VideoList from "@/components/VideoList";
import Modal from "@/components/Modal";

const Dashboard = () => {
  const router = useRouter();
  const fetchVideos = useVideoStore((s) => s.fetchVideos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;

    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      setIsUploading(true);
      setShowModal(true);
      try {
        const res = await fetch("http://localhost:8000/api/v1/videos/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fetchVideos();
      } catch (error) {
        console.error("Error uploading video:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className='flex flex-col p-4'>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-3xl font-semibold'>Dashboard</h1>
        <input
          type='file'
          accept='video/*'
          ref={fileInputRef}
          onChange={handleFileUpload}
          className='hidden'
        />
        <div className='flex gap-4'>
          <button
            onClick={handleUploadClick}
            className='flex gap-2 px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg cursor-pointer transition'
            disabled={isUploading}>
            <Upload />
            Upload Video
          </button>
          <button
            onClick={handleLogout}
            className='flex items-center gap-2 px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer transition'>
            <LogOut />
            Logout
          </button>
        </div>
      </div>
      {showModal && (
        <Modal
          title='Uploading...'
          onClose={() => {
            if (!isUploading) setShowModal(false);
          }}>
          {isUploading ? (
            <div>Upload in Progress</div>
          ) : (
            <div>Upload Complete</div>
          )}
        </Modal>
      )}
      <VideoList />
    </div>
  );
};

export default Dashboard;
