"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useVideoStore } from "@/store/useVideoStore";
import Modal from "@/components/Modal";
import SystemError from "@/components/SystemError";

const VideoCreate = () => {
  const [useModal, setUseModal] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createVideo, loading, error } = useVideoStore();

  const resetForm = () => {
    setLabel("");
    setDescription("");
    setSelectedFile(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    setUseModal(false);
  };

  const onCreate = async () => {
    const file = fileInputRef.current?.files?.[0] || selectedFile;
    if (!label.trim() || !file || loading) {
      return;
    }

    try {
      setProgress(0);
      await createVideo(file, label.trim(), description.trim(), (pct) => {
        setProgress(pct);
      });
      resetForm();
      setUseModal(false);
    } catch (err) {
      console.error(err);
      setProgress(null);
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
        <Modal title='Upload Video' onClose={handleClose}>
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
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={loading}
                  className='w-full px-3 py-2 rounded-md border border-border font-mono focus:outline-none focus:ring-2 focus:ring-ring'
                  required
                />
                {selectedFile && (
                  <p className='text-xxs text-muted-foreground mt-1'>
                    Selected:{" "}
                    <span className='font-mono font-medium'>
                      {selectedFile.name}
                    </span>{" "}
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {progress !== null && (
                <div className='space-y-1.5 py-1'>
                  <div className='flex justify-between items-center text-xxs font-bold uppercase tracking-widest text-muted-foreground'>
                    <span>
                      {progress < 100
                        ? "Uploading to storage..."
                        : "Finalizing video..."}
                    </span>
                    <span className='font-mono font-bold text-foreground'>
                      {progress}%
                    </span>
                  </div>
                  <div className='w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border'>
                    <div
                      className='bg-primary h-2.5 rounded-full transition-all duration-150 ease-out'
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <SystemError message={error} />}

              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-4 py-2 rounded-lg bg-muted text-sm'
                  disabled={loading}>
                  Cancel
                </button>
                <button
                  type='submit'
                  className='flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm text-primary-foreground font-bold disabled:opacity-50'
                  disabled={loading}>
                  {loading && <Loader2 size={14} className='animate-spin' />}
                  {loading
                    ? progress !== null && progress < 100
                      ? `Uploading`
                      : "Finalizing..."
                    : "Upload Video"}
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
