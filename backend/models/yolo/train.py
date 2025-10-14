from ultralytics import YOLO

def train_yolo():
    model = YOLO("yolov8n.pt")
    model.train(data="models/yolo/data/data.yaml", epochs=100, imgsz=640, batch=16, project="models/yolo/runs", name="chamber_detector")

if __name__ == "__main__":
    train_yolo()