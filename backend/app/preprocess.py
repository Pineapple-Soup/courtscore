import cv2
import ffmpeg
import os
import tempfile

from ultralytics import YOLO

def find_first_frame(video_path, model, conf_threshold=0.5):
    capture = cv2.VideoCapture(video_path)
    found_frame = None
    frame_idx = 0
    while True:
        ret, frame = capture.read()
        if not ret:
            break

        results = model.predict(frame, conf=conf_threshold, verbose=False)[0]

        if results and results.boxes:
            if len(results.boxes) == 6:
                found_frame = frame_idx
                break
        frame_idx += 1
    capture.release()
    if found_frame is not None:
        return results.boxes.xyxy, found_frame
    else:
        return None, None

def reencode_video(input_video_path):
    dirpath = os.path.dirname(input_video_path) or "."
    fd, temp_path = tempfile.mkstemp(suffix=".mp4", dir=dirpath)
    os.close(fd)
    try:
        ffmpeg.input(input_video_path).output(temp_path, vcodec="libx264", acodec="aac").run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
        os.replace(temp_path, input_video_path)
        return input_video_path
    except ffmpeg.Error as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        stderr = getattr(e, "stderr", None)
        raise RuntimeError(f"Error re-encoding video: {stderr.decode() if stderr else str(e)}")

def process_video(video_path, output_dir, model_path, conf_threshold=0.5, buffer=100):
    file_name = os.path.splitext(os.path.basename(video_path))[0]
    model = YOLO(model_path)

    boxes, frame_idx = find_first_frame(video_path, model, conf_threshold)
    capture = cv2.VideoCapture(video_path)
    fps = capture.get(cv2.CAP_PROP_FPS)
    capture.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    chamber_trackers = {}

    ret, frame = capture.read()
    if not ret:
        raise ValueError("Failed to read the first frame after detection")
    
    frame_height, frame_width = frame.shape[:2]

    for idx, box in enumerate(boxes):
        x1, y1, x2, y2 = map(int, box.tolist())

        x1 = max(0, x1 - buffer)
        y1 = max(0, y1 - buffer)
        x2 = min(frame_width, x2 + buffer)
        y2 = min(frame_height, y2 + buffer)

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        if not os.access(output_dir, os.W_OK):
            raise PermissionError(f"Cannot write to directory: {output_dir}")

        out_path = os.path.join(output_dir, f"{file_name}_chamber_{idx}.mp4")
        width, height = x2 - x1, y2 - y1
        writer = cv2.VideoWriter(
            out_path,
            cv2.VideoWriter_fourcc(*'H264'),
            fps,
            (width, height)
        )
        if not writer.isOpened():
            raise ValueError(f"Failed to open video writer for {out_path}")
        chamber_trackers[idx] = {
            "writer": writer,
            "path": out_path,
            "coordinates": (x1, y1, x2, y2),
            "size": (width, height)
        }

    while True:
        ret, frame = capture.read()
        if not ret:
            break

        for idx, tracker in chamber_trackers.items():
            x1, y1, x2, y2 = tracker["coordinates"]
            crop = frame[y1:y2, x1:x2]
            crop_resized = cv2.resize(crop, tracker["size"])
            tracker["writer"].write(crop_resized)

    capture.release()
    result = []
    for tracker in chamber_trackers.values():
        tracker["writer"].release()
        result.append(tracker["path"])
    return result

if __name__ == "__main__":
    video_path = "tmp/example.mts"
    output_dir = "tmp/out"
    print("Processing video...")
    os.makedirs(output_dir, exist_ok=True)
    process_video(video_path, output_dir, model_path="models/yolo/best.pt", conf_threshold=0.5, buffer=100)
    print("Processing complete")