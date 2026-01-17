"""
YOLOv8 Training Script for Food Detection
Trains a food detection model with data augmentation and generates training reports.
"""

import os
import sys
from pathlib import Path
from datetime import datetime


def check_dependencies():
    """Check if required dependencies are installed."""
    try:
        import ultralytics
        import cv2
        import numpy
        import yaml
        return True
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("\nPlease install dependencies:")
        print("  pip install -r requirements.txt")
        return False


def train_model():
    """Train YOLOv8 food detection model."""
    from ultralytics import YOLO
    import yaml
    
    print("\n" + "=" * 60)
    print("YOLOV8 FOOD DETECTION MODEL TRAINING")
    print("=" * 60)
    
    model_dir = Path(__file__).parent
    config_path = model_dir / 'config' / 'dataset.yaml'
    reports_dir = model_dir / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    # Verify dataset exists
    if not config_path.exists():
        print(f"ERROR: Dataset config not found at {config_path}")
        print("Please run 'python preprocess.py' first!")
        return 1
    
    # Load and verify config
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    data_path = Path(config['path'])
    train_path = data_path / 'train' / 'images'
    val_path = data_path / 'val' / 'images'
    
    if not train_path.exists():
        print(f"ERROR: Training images not found at {train_path}")
        print("Please run 'python preprocess.py' first!")
        return 1
    
    train_images = list(train_path.glob('*.jpg')) + list(train_path.glob('*.jpeg')) + list(train_path.glob('*.png'))
    val_images = list(val_path.glob('*.jpg')) + list(val_path.glob('*.jpeg')) + list(val_path.glob('*.png'))
    
    print(f"\n[INFO] Dataset Configuration:")
    print(f"  Config file: {config_path}")
    print(f"  Data path: {data_path}")
    print(f"  Training images: {len(train_images)}")
    print(f"  Validation images: {len(val_images)}")
    print(f"  Number of classes: {config['nc']}")
    
    # Training parameters
    print(f"\n[INFO] Training Parameters:")
    params = {
        'data': str(config_path),
        'epochs': 50,  # Reduced for CPU training
        'imgsz': 640,
        'batch': 4,  # Smaller batch for CPU
        'patience': 15,  # Early stopping patience
        'save': True,
        'save_period': 10,  # Save checkpoint every 10 epochs
        'device': 'cpu',  # Explicit CPU device
        'workers': 2,
        'project': str(model_dir / 'runs' / 'detect'),
        'name': 'food_detection',
        'exist_ok': True,
        'pretrained': True,
        'optimizer': 'auto',
        'verbose': True,
        'seed': 42,
        'deterministic': True,
        'rect': False,
        'cos_lr': True,  # Cosine learning rate scheduler
        'close_mosaic': 10,  # Disable mosaic for last 10 epochs
        'resume': False,
        
        # Data augmentation parameters
        'hsv_h': 0.015,  # HSV-Hue augmentation
        'hsv_s': 0.7,    # HSV-Saturation augmentation
        'hsv_v': 0.4,    # HSV-Value augmentation
        'degrees': 15.0,  # Rotation augmentation
        'translate': 0.1, # Translation augmentation
        'scale': 0.5,    # Scale augmentation
        'shear': 5.0,    # Shear augmentation
        'perspective': 0.0001,
        'flipud': 0.5,   # Vertical flip
        'fliplr': 0.5,   # Horizontal flip
        'mosaic': 1.0,   # Mosaic augmentation
        'mixup': 0.1,    # Mixup augmentation
        'copy_paste': 0.0,
    }
    
    for key, value in params.items():
        if key not in ['data', 'project', 'name']:
            print(f"  {key}: {value}")
    
    # Initialize model
    print(f"\n[STEP 1/4] Loading YOLOv8s pretrained model...")
    model = YOLO('yolov8s.pt')  # Using small model for balance of speed/accuracy
    print("  ✓ Model loaded successfully")
    
    # Start training
    print(f"\n[STEP 2/4] Starting training...")
    print(f"  Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    try:
        results = model.train(**params)
        print("-" * 60)
        print(f"  End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("  ✓ Training completed successfully!")
        
    except Exception as e:
        print(f"\n  ERROR during training: {e}")
        return 1
    
    # Validate model
    print(f"\n[STEP 3/4] Validating model on test set...")
    try:
        val_results = model.val()
        print("  ✓ Validation completed")
    except Exception as e:
        print(f"  Warning: Validation failed: {e}")
        val_results = None
    
    # Generate training report
    print(f"\n[STEP 4/4] Generating training report...")
    
    report_lines = [
        "=" * 60,
        "FOOD DETECTION MODEL TRAINING REPORT",
        "=" * 60,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "-" * 60,
        "MODEL CONFIGURATION",
        "-" * 60,
        f"  Base model: YOLOv8s (pretrained on COCO)",
        f"  Input size: 640x640",
        f"  Number of classes: 17",
        "",
        "-" * 60,
        "TRAINING PARAMETERS",
        "-" * 60,
        f"  Epochs: {params['epochs']}",
        f"  Batch size: {params['batch']}",
        f"  Image size: {params['imgsz']}",
        f"  Early stopping patience: {params['patience']}",
        f"  Optimizer: {params['optimizer']}",
        f"  Cosine LR scheduler: {params['cos_lr']}",
        "",
        "-" * 60,
        "DATA AUGMENTATION",
        "-" * 60,
        f"  HSV-Hue: {params['hsv_h']}",
        f"  HSV-Saturation: {params['hsv_s']}",
        f"  HSV-Value: {params['hsv_v']}",
        f"  Rotation: {params['degrees']}°",
        f"  Translation: {params['translate']}",
        f"  Scale: {params['scale']}",
        f"  Horizontal flip: {params['fliplr']}",
        f"  Vertical flip: {params['flipud']}",
        f"  Mosaic: {params['mosaic']}",
        f"  Mixup: {params['mixup']}",
        "",
    ]
    
    # Add validation metrics if available
    if val_results:
        report_lines.extend([
            "-" * 60,
            "VALIDATION METRICS",
            "-" * 60,
        ])
        
        # Try to extract metrics
        try:
            report_lines.extend([
                f"  mAP@0.5: {val_results.box.map50:.4f}",
                f"  mAP@0.5:0.95: {val_results.box.map:.4f}",
                f"  Precision: {val_results.box.mp:.4f}",
                f"  Recall: {val_results.box.mr:.4f}",
            ])
        except:
            report_lines.append("  Metrics extraction failed - check runs/detect/food_detection/ for details")
    
    # Output paths
    output_dir = model_dir / 'runs' / 'detect' / 'food_detection'
    report_lines.extend([
        "",
        "-" * 60,
        "OUTPUT FILES",
        "-" * 60,
        f"  Best weights: {output_dir / 'weights' / 'best.pt'}",
        f"  Last weights: {output_dir / 'weights' / 'last.pt'}",
        f"  Training plots: {output_dir}",
        f"  Confusion matrix: {output_dir / 'confusion_matrix.png'}",
        f"  Results CSV: {output_dir / 'results.csv'}",
        "",
        "=" * 60,
        "TRAINING COMPLETE!",
        "=" * 60,
    ])
    
    report_content = '\n'.join(report_lines)
    
    # Save report
    report_path = reports_dir / 'training_report.txt'
    with open(report_path, 'w') as f:
        f.write(report_content)
    
    print(f"  ✓ Report saved to: {report_path}")
    
    # Print summary
    print("\n" + report_content)
    
    print(f"\nBest model saved to: {output_dir / 'weights' / 'best.pt'}")
    print("\nTo run inference, use: python inference.py <image_path>")
    
    return 0


def main():
    if not check_dependencies():
        return 1
    
    return train_model()


if __name__ == "__main__":
    sys.exit(main())
