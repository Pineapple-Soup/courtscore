import cv2
import os
import random
import shutil

def extract_frames(video_path, output_dir, interval_sec=1, max_frames=None):
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval_sec)

    count = 0
    saved_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or (max_frames and saved_count >= max_frames):
            break
        if count % frame_interval == 0:
            filename = os.path.join(output_dir, f"frame_{saved_count:05d}.jpg")
            cv2.imwrite(filename, frame)
            saved_count += 1
        count += 1
    cap.release()
    print(f"Extracted {saved_count} frames to {output_dir}")

def split_dataset(image_dir, label_dir, output_dir, val_ratio=0.2, seed=20):
    random.seed(seed)

    image_dir = os.path.abspath(image_dir)
    label_dir = os.path.abspath(label_dir)
    output_images = os.path.join(os.path.abspath(output_dir), "images")
    output_labels = os.path.join(os.path.abspath(output_dir), "labels")

    image_files = sorted([os.path.join(image_dir, f) for f in os.listdir(image_dir) if f.endswith(".jpg")])
    random.shuffle(image_files)

    val_count = int(len(image_files) * val_ratio)
    val_files = image_files[:val_count]
    train_files = image_files[val_count:]

    def move_files(files, split):
        os.makedirs(os.path.join(output_images, split), exist_ok=True)
        os.makedirs(os.path.join(output_labels, split), exist_ok=True)

        for img_path in files:
            img_filename = os.path.basename(img_path)
            label_filename = os.path.splitext(img_filename)[0] + ".txt"
            label_path = os.path.join(label_dir, label_filename)
            dest_img_path = os.path.join(output_images, split, img_filename)
            dest_label_path = os.path.join(output_labels, split, label_filename)

            shutil.copy(img_path, dest_img_path)
            if os.path.exists(label_path):
                shutil.copy(label_path, dest_label_path)

    move_files(train_files, "train")
    move_files(val_files, "val")


if __name__ == "__main__":
    split_dataset(
        image_dir="models/yolo/data/images",
        label_dir="models/yolo/data/labels",
        output_dir="models/yolo/data",
        val_ratio=0.2
    )
