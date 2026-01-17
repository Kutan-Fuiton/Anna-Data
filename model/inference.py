"""
Inference Script for Food Detection Model
Run detection on new/raw images using the trained model.
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple

import cv2
import numpy as np


def check_dependencies():
    """Check if required dependencies are installed."""
    try:
        from ultralytics import YOLO
        return True
    except ImportError:
        print("ERROR: ultralytics not installed.")
        print("Please run: pip install -r requirements.txt")
        return False


class FoodDetector:
    """Food detection inference class with preprocessing."""
    
    # Class names for the food detection model
    CLASS_NAMES = [
        "Aalu Ki Sabji", "Chana Dal", "Chhaina", "Chhole", "Curry",
        "Dahi", "Dal", "Fried Rice", "Gulab Jamun", "Mix Veg",
        "Paneer", "Plate", "Puri", "Rice", "Roti", "Salad", "Zeera Aalu"
    ]
    
    # Supported image formats
    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff'}
    
    def __init__(self, model_path: Optional[str] = None, confidence: float = 0.25):
        """
        Initialize food detector.
        
        Args:
            model_path: Path to trained model weights. If None, uses default path.
            confidence: Confidence threshold for detections (0-1)
        """
        from ultralytics import YOLO
        
        self.confidence = confidence
        
        # Find model weights
        if model_path is None:
            model_dir = Path(__file__).parent
            # Primary: Look for the main model file
            default_path = model_dir / 'food_detection_model.pt'
            
            if default_path.exists():
                model_path = str(default_path)
            else:
                # Fallback: Check runs folder (for development/training)
                runs_path = model_dir / 'runs' / 'detect' / 'food_detection' / 'weights' / 'best.pt'
                if runs_path.exists():
                    model_path = str(runs_path)
                else:
                    raise FileNotFoundError(
                        f"No trained model found. Expected: {default_path}"
                    )
    
        print(f"Loading model from: {model_path}")
        self.model = YOLO(model_path)
        print("✓ Model loaded successfully")
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess raw image for inference.
        
        Args:
            image: Raw input image (BGR format)
            
        Returns:
            Preprocessed image
        """
        # The YOLO model handles preprocessing internally,
        # but we can add custom preprocessing here if needed
        
        # Auto-orient image if needed (already handled by YOLO)
        # Resize is handled by YOLO based on imgsz parameter
        
        return image
    
    def load_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Load and validate image from path.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Image as numpy array or None if failed
        """
        path = Path(image_path)
        
        if not path.exists():
            print(f"ERROR: Image not found: {image_path}")
            return None
        
        if path.suffix.lower() not in self.SUPPORTED_FORMATS:
            print(f"ERROR: Unsupported format: {path.suffix}")
            print(f"Supported formats: {self.SUPPORTED_FORMATS}")
            return None
        
        image = cv2.imread(str(path))
        if image is None:
            print(f"ERROR: Could not read image: {image_path}")
            return None
        
        return image
    
    def detect(self, image: np.ndarray) -> dict:
        """
        Run detection on preprocessed image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Dictionary with detection results
        """
        # Preprocess
        processed = self.preprocess_image(image)
        
        # Run inference
        results = self.model.predict(
            source=processed,
            conf=self.confidence,
            verbose=False
        )[0]
        
        # Parse results
        detections = []
        
        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            confidences = results.boxes.conf.cpu().numpy()
            class_ids = results.boxes.cls.cpu().numpy().astype(int)
            
            for i in range(len(boxes)):
                detection = {
                    'class_id': int(class_ids[i]),
                    'class_name': self.CLASS_NAMES[class_ids[i]] if class_ids[i] < len(self.CLASS_NAMES) else f"class_{class_ids[i]}",
                    'confidence': float(confidences[i]),
                    'bbox': boxes[i].tolist(),  # [x1, y1, x2, y2]
                }
                detections.append(detection)
        
        return {
            'image_shape': image.shape[:2],
            'num_detections': len(detections),
            'detections': detections
        }
    
    def detect_from_path(self, image_path: str) -> Optional[dict]:
        """
        Load image and run detection.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Detection results or None if image loading failed
        """
        image = self.load_image(image_path)
        if image is None:
            return None
        
        return self.detect(image)
    
    def visualize(self, image: np.ndarray, results: dict, 
                  output_path: Optional[str] = None) -> np.ndarray:
        """
        Draw detection results on image.
        
        Args:
            image: Original image
            results: Detection results dictionary
            output_path: Optional path to save visualization
            
        Returns:
            Annotated image
        """
        annotated = image.copy()
        
        # Colors for different classes (cycling)
        colors = [
            (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0),
            (255, 0, 255), (0, 255, 255), (128, 0, 0), (0, 128, 0),
            (0, 0, 128), (128, 128, 0), (128, 0, 128), (0, 128, 128),
            (255, 128, 0), (255, 0, 128), (128, 255, 0), (0, 255, 128),
            (128, 0, 255)
        ]
        
        for det in results['detections']:
            x1, y1, x2, y2 = [int(v) for v in det['bbox']]
            class_id = det['class_id']
            class_name = det['class_name']
            confidence = det['confidence']
            
            color = colors[class_id % len(colors)]
            
            # Draw bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Draw label background
            label = f"{class_name}: {confidence:.2f}"
            (label_w, label_h), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
            )
            cv2.rectangle(
                annotated, 
                (x1, y1 - label_h - 10), 
                (x1 + label_w + 5, y1),
                color, -1
            )
            
            # Draw label text
            cv2.putText(
                annotated, label,
                (x1 + 2, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                (255, 255, 255), 1
            )
        
        if output_path:
            cv2.imwrite(output_path, annotated)
            print(f"Saved visualization to: {output_path}")
        
        return annotated
    
    def print_results(self, results: dict, image_path: str = ""):
        """Print detection results in a formatted way."""
        print("\n" + "-" * 50)
        print(f"DETECTION RESULTS")
        if image_path:
            print(f"Image: {image_path}")
        print("-" * 50)
        print(f"Image size: {results['image_shape'][1]}x{results['image_shape'][0]}")
        print(f"Detections found: {results['num_detections']}")
        
        if results['num_detections'] > 0:
            print("\nDetected items:")
            for i, det in enumerate(results['detections'], 1):
                print(f"  {i}. {det['class_name']}")
                print(f"     Confidence: {det['confidence']:.2%}")
                print(f"     Bounding box: [{det['bbox'][0]:.0f}, {det['bbox'][1]:.0f}, {det['bbox'][2]:.0f}, {det['bbox'][3]:.0f}]")
        else:
            print("\nNo food items detected.")
        
        print("-" * 50)


def main():
    parser = argparse.ArgumentParser(description='Food Detection Inference')
    parser.add_argument('image', type=str, help='Path to input image')
    parser.add_argument('--model', type=str, default=None, help='Path to model weights')
    parser.add_argument('--confidence', type=float, default=0.25, help='Confidence threshold (0-1)')
    parser.add_argument('--output', type=str, default=None, help='Output path for visualization')
    parser.add_argument('--show', action='store_true', help='Display result window')
    
    args = parser.parse_args()
    
    if not check_dependencies():
        return 1
    
    print("\n" + "=" * 50)
    print("FOOD DETECTION INFERENCE")
    print("=" * 50)
    
    try:
        # Initialize detector
        detector = FoodDetector(
            model_path=args.model,
            confidence=args.confidence
        )
        
        # Load and detect
        image = detector.load_image(args.image)
        if image is None:
            return 1
        
        print(f"\nProcessing: {args.image}")
        results = detector.detect(image)
        
        # Print results
        detector.print_results(results, args.image)
        
        # Visualize if requested
        if args.output or args.show:
            output_path = args.output if args.output else None
            annotated = detector.visualize(image, results, output_path)
            
            if args.show:
                cv2.imshow('Food Detection', annotated)
                print("\nPress any key to close window...")
                cv2.waitKey(0)
                cv2.destroyAllWindows()
        
        return 0
        
    except FileNotFoundError as e:
        print(f"\nERROR: {e}")
        return 1
    except Exception as e:
        print(f"\nERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
