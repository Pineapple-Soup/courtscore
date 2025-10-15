import cv2
import numpy as np
import os

from ultralytics import YOLO

def find_first_frame(video_path, model, conf_threshold=0.5):
    capture = cv2.VideoCapture(video_path)
    found_frame = None
    frame_idx = 0
    while True:
        ret, frame = capture.read()
        if not ret:
            break

        results = model.predict(frame, conf=conf_threshold)

        if results and results[0].boxes:
            if len(results[0].boxes) == 6:
                found_frame = frame_idx
                break
        frame_idx += 1
    capture.release()
    if found_frame is not None:
        print(f"First frame with chamber detected: {found_frame}")
        return found_frame, 0
    else:
        print("No chambers detected in the video")
        return None, None


def process_video(video_path, output_dir, conf_threshold=0.5):
    file_name = os.path.splitext(os.path.basename(video_path))[0]
    model = YOLO("models/yolo/runs/chamber_detector/weights/best.pt")
    frame_idx, time = find_first_frame(video_path, model, conf_threshold)
    if frame_idx is None:
        raise ValueError("No chambers detected in the video")
    else:
        print(f"First frame with chamber detected: {frame_idx} at {time:.2f} seconds")

    capture = cv2.VideoCapture(video_path)
    fps = capture.get(cv2.CAP_PROP_FPS)
    capture.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    chamber_tracks = {}
    frame_count = 0

    while True:
        ret, frame = capture.read()
        if not ret:
            break

        results = model.predict(frame, conf=conf_threshold)[0]

        for i, box in enumerate(results.boxes.xyxy):
            x1, y1, x2, y2 = map(int, box.tolist())
            chamber_id = f"chamber_{i}"

            if chamber_id not in chamber_tracks:
                out_path = os.path.join(output_dir, f"{file_name}_{chamber_id}.mp4")
                width = x2 - x1
                height = y2 - y1
                writer = cv2.VideoWriter(
                    out_path,
                    cv2.VideoWriter_fourcc(*'mp4v'),
                    fps,
                    (width, height)
                )
                chamber_tracks[chamber_id] = {
                    "writer": writer,
                    "path": out_path,
                    "size": (width, height)
                }

            crop = frame[y1:y2, x1:x2]
            crop_resized = cv2.resize(crop, chamber_tracks[chamber_id]["size"])
            chamber_tracks[chamber_id]["writer"].write(crop_resized)

        frame_count += 1

    capture.release()
    for writer in chamber_tracks.values():
        writer["writer"].release()


if __name__ == "__main__":
    video_path = "tmp/example.mts"
    output_dir = "out"
    print("Processing video...")
    os.makedirs(output_dir, exist_ok=True)
    process_video(video_path, output_dir)
    print("Processing complete.")