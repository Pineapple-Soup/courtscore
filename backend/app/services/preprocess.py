import cv2
import ffmpeg
import os
import tempfile

from dataclasses import dataclass
from ultralytics import YOLO


@dataclass
class Box():
    x1: int
    y1: int
    x2: int
    y2: int

    def width(self) -> int:
        return self.x2 - self.x1
    
    def height(self) -> int:
        return self.y2 - self.y1

@dataclass
class ChamberVideo():
    writer: cv2.VideoWriter
    out_path: str
    bounding_box: Box


class PreprocessService():
    def __init__(self, model_path: str, conf_threshold: float) -> None:
        self.model = YOLO(model_path)
        self.conf_threshold = conf_threshold

    def _get_video_capture(self, video_path, start_frame) -> cv2.VideoCapture:
        capture = cv2.VideoCapture(video_path)
        capture.set(cv2.CAP_PROP_POS_FRAMES, float(start_frame))
        return capture

    def _find_first_frame(self, video_path):
        capture = cv2.VideoCapture(video_path)
        found_frame = None
        found_boxes = None
        frame_idx = 0
        while True:
            ret, frame = capture.read()
            if not ret:
                break

            results = self.model.predict(frame, conf=self.conf_threshold, verbose=False)[0]

            if results and results.boxes:
                if len(results.boxes) == 6:
                    found_boxes = results.boxes.xyxy
                    found_frame = frame_idx
                    break
            frame_idx += 1
        capture.release()
        if found_frame is not None:
            return found_boxes, found_frame
        else:
            return None, None
    
    def _initialize_chamber_videos(self, file_name: str, boxes, frame, fps, boundary_buffer: int = 100) -> list[ChamberVideo]:
        chamber_videos: list[ChamberVideo] = []
        frame_height, frame_width = frame.shape[:2]
        
        for idx, box in boxes:
            x1, x2, y1, y2 = map(int, box.tolist())
            x1 = max(0, x1 - boundary_buffer)
            y1 = max(0, y1 - boundary_buffer)
            x2 = min(frame_width, x2 + boundary_buffer)
            y2 = min(frame_height, y2 + boundary_buffer)
        
            out_path = os.path.join(output_dir, f"{file_name}_chamber_{idx}.mp4")
            bounding_box = Box(x1, y1, x2, y2)
            writer = cv2.VideoWriter(
                out_path,
                cv2.VideoWriter_fourcc(*'H264'), # type: ignore
                fps,
                (bounding_box.width(), bounding_box.height())
            )

            if not writer.isOpened():
                raise ValueError(f"Failed to open video writer for {out_path}")

            chamber_videos.append(ChamberVideo(writer, out_path, bounding_box))

        return chamber_videos

    def _write_chamber_videos(self, capture: cv2.VideoCapture, chamber_videos: list[ChamberVideo]) -> None:
        while True:
            ret, frame = capture.read()
            if not ret:
                break

            for chamber_video in chamber_videos:
                bounding_box: Box = chamber_video.bounding_box
                crop = frame[bounding_box.y1:bounding_box.y2, bounding_box.x1:bounding_box.x2]
                crop_resized = cv2.resize(crop, (bounding_box.width(), bounding_box.height()))
                chamber_video.writer.write(crop_resized)
    
    def _save_chamber_videos(self, chamber_videos: list[ChamberVideo]) -> list[str]:
        chamber_video_paths: list[str] = []
        for chamber_video in chamber_videos:
            chamber_video.writer.release()
            chamber_video_paths.append(chamber_video.out_path)
        return chamber_video_paths

    def reencode_video(self, video_path):
        dirpath = os.path.dirname(video_path) or "."
        fd, temp_path = tempfile.mkstemp(suffix=".mp4", dir=dirpath)
        os.close(fd)
        try:
            ffmpeg.input(video_path).output(temp_path, vcodec="libx264", acodec="aac").run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            os.replace(temp_path, video_path)
            return video_path
        except ffmpeg.Error as e:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            stderr = getattr(e, "stderr", None)
            raise RuntimeError(f"Error re-encoding video: {stderr.decode() if stderr else str(e)}")

    def process_video(self, video_path: str, output_dir: str, buffer: int = 100) -> list[str]:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        if not os.access(output_dir, os.W_OK):
            raise PermissionError(f"Cannot write to directory: {output_dir}")

        boxes, frame_idx = self._find_first_frame(video_path)

        if boxes is None or frame_idx is None:
            raise ValueError("Failed to detect exactly 6 chambers in the video")

        capture = self._get_video_capture(video_path, frame_idx)
        ret, frame = capture.read()
        if not ret:
            raise ValueError("Failed to read the first frame after detection")
        
        file_name = os.path.splitext(os.path.basename(video_path))[0]
        fps = capture.get(cv2.CAP_PROP_FPS)
        trackers = self._initialize_chamber_videos(file_name, boxes, frame, fps, buffer)
        self._write_chamber_videos(capture, trackers)
        result = self._save_chamber_videos(trackers)
        capture.release()

        return result

if __name__ == "__main__":
    video_path = "tmp/example.mts"
    output_dir = "tmp/out"
    print("Processing video...")
    os.makedirs(output_dir, exist_ok=True)
    service = PreprocessService(model_path="models/yolo/best.pt", conf_threshold=0.5)
    service.process_video(video_path, output_dir, 100)
    print("Processing complete")