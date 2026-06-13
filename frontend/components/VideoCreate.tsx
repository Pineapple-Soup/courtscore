"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useVideoStore } from "@/store/useVideoStore";
import Modal from "@/components/Modal";
import SystemError from "@/components/SystemError";

const VideoCreate = () => {
  const [useModal, setUseModal] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createVideo, loading, error } = useVideoStore();

  const resetForm = () => {
    setLabel("");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onCreate = async () => {
    if (!label.trim() || !fileInputRef.current?.files?.[0] || loading) {
      return;
    }

    const file = fileInputRef.current.files[0];
    try {
      await createVideo(file, label.trim(), description.trim());
      resetForm();
      setUseModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div>
        <button
          type='button'
          onClick={() => setUseModal(true)}
          className='flex gap-2 items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-main cursor-pointer hover:brightness-110 transition-all disabled:opacity-50'>
          <Upload size={14} />
          Upload Video
        </button>
      </div>

      {useModal && (
        <Modal title='Upload Video' onClose={() => setUseModal(false)}>
          <div className='flex flex-col items-center justify-center text-center space-y-4'>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate();
              }}
              className='w-full max-w-md mx-auto space-y-4 text-left'>
              <div className='text-input'>
                <label className='block text-xs font-bold uppercase tracking-widest mb-2'>
                  Video Label
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={loading}
                  className='w-full px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring'
                  placeholder='e.g. ETH-Gal4 Experiment 2.1'
                  required
                />
              </div>

              <div className='text-input'>
                <label className='block text-xs font-bold uppercase tracking-widest mb-2'>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  className='w-full px-3 py-2 rounded-md border border-border font-mono focus:outline-none focus:ring-2 focus:ring-ring'
                  rows={3}
                  placeholder='Optional video description'
                />
              </div>

              <div className='text-input'>
                <label className='block text-xs font-bold uppercase tracking-widest mb-2'>
                  Video File
                </label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='video/*'
                  className='w-full px-3 py-2 rounded-md border border-border font-mono focus:outline-none focus:ring-2 focus:ring-ring'
                  required
                />
              </div>

              {error && <SystemError message={error} />}

              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setUseModal(false)}
                  className='px-4 py-2 rounded-lg bg-muted text-sm'
                  disabled={loading}>
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 rounded-lg bg-primary text-sm text-primary-foreground font-bold'
                  disabled={loading}>
                  {loading ? "Uploading..." : "Upload Video"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default VideoCreate;
