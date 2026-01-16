"""
Main Preprocessing Script for Food Detection Dataset
Converts COCO format data to YOLO format and organizes files for training.
"""

import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from preprocessing.coco_to_yolo import COCOToYOLOConverter
from preprocessing.image_processor import ImageProcessor


def create_directory_structure(base_path: Path) -> Dict[str, Path]:
    """Create YOLO dataset directory structure."""
    dirs = {
        'data': base_path / 'data',
        'train_images': base_path / 'data' / 'train' / 'images',
        'train_labels': base_path / 'data' / 'train' / 'labels',
        'val_images': base_path / 'data' / 'val' / 'images',
        'val_labels': base_path / 'data' / 'val' / 'labels',
        'reports': base_path / 'reports',
    }
    
    for dir_path in dirs.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    
    return dirs


def copy_images(src_dir: Path, dst_dir: Path, processor: ImageProcessor) -> Dict[str, any]:
    """Copy and optionally preprocess images."""
    stats = {
        'copied': 0,
        'failed': 0,
        'files': []
    }
    
    for img_file in src_dir.glob('*'):
        if processor.is_valid_image(img_file):
            try:
                dst_path = dst_dir / img_file.name
                shutil.copy2(img_file, dst_path)
                stats['copied'] += 1
                stats['files'].append(img_file.name)
            except Exception as e:
                print(f"  Error copying {img_file.name}: {e}")
                stats['failed'] += 1
    
    return stats


def generate_report(report_path: Path, stats: dict):
    """Generate detailed preprocessing report."""
    report_lines = [
        "=" * 60,
        "FOOD DETECTION DATASET PREPROCESSING REPORT",
        "=" * 60,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "-" * 60,
        "DATASET OVERVIEW",
        "-" * 60,
    ]
    
    # Training set stats
    report_lines.extend([
        "",
        "TRAINING SET:",
        f"  Images copied: {stats['train_images']['copied']}",
        f"  Failed copies: {stats['train_images']['failed']}",
        f"  Total annotations: {stats['train_labels']['total_annotations']}",
        f"  Images with annotations: {stats['train_labels']['images_with_annotations']}",
    ])
    
    # Validation set stats
    report_lines.extend([
        "",
        "VALIDATION SET:",
        f"  Images copied: {stats['val_images']['copied']}",
        f"  Failed copies: {stats['val_images']['failed']}",
        f"  Total annotations: {stats['val_labels']['total_annotations']}",
        f"  Images with annotations: {stats['val_labels']['images_with_annotations']}",
    ])
    
    # Class distribution
    report_lines.extend([
        "",
        "-" * 60,
        "CLASS DISTRIBUTION (Training Set)",
        "-" * 60,
    ])
    
    annotations_per_class = stats['train_labels'].get('annotations_per_class', {})
    total_annotations = sum(annotations_per_class.values())
    
    for class_name, count in sorted(annotations_per_class.items()):
        percentage = (count / total_annotations * 100) if total_annotations > 0 else 0
        bar = '#' * int(percentage / 2)
        report_lines.append(f"  {class_name:20s}: {count:4d} ({percentage:5.1f}%) {bar}")
    
    # Summary
    report_lines.extend([
        "",
        "-" * 60,
        "SUMMARY",
        "-" * 60,
        f"  Total classes: 17",
        f"  Total training images: {stats['train_images']['copied']}",
        f"  Total validation images: {stats['val_images']['copied']}",
        f"  Total annotations: {stats['train_labels']['total_annotations'] + stats['val_labels']['total_annotations']}",
        "",
        "Dataset ready for training!",
        "=" * 60,
    ])
    
    report_content = '\n'.join(report_lines)
    
    # Save report
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    return report_content


def main():
    print("\n" + "=" * 60)
    print("FOOD DETECTION DATASET PREPROCESSING")
    print("=" * 60)
    
    # Paths
    model_dir = Path(__file__).parent
    project_dir = model_dir.parent
    dataset_dir = project_dir / 'Food_Dataset'
    
    # Check if dataset exists
    if not dataset_dir.exists():
        print(f"ERROR: Dataset not found at {dataset_dir}")
        return 1
    
    print(f"\n[1/5] Creating directory structure...")
    dirs = create_directory_structure(model_dir)
    print(f"  [OK] Created data directories")
    
    # Initialize processor
    processor = ImageProcessor(target_size=(640, 640))
    
    # Statistics dictionary
    stats = {}
    
    # Process training data
    print(f"\n[2/5] Processing training data...")
    
    train_src = dataset_dir / 'train'
    train_json = dataset_dir / 'train.json'
    
    print(f"  Copying training images...")
    stats['train_images'] = copy_images(train_src, dirs['train_images'], processor)
    print(f"  [OK] Copied {stats['train_images']['copied']} images")
    
    print(f"  Converting annotations to YOLO format...")
    converter = COCOToYOLOConverter(str(train_json))
    stats['train_labels'] = converter.convert(str(dirs['train_labels']))
    print(f"  [OK] Created {len(stats['train_labels']['files_created'])} label files")
    print(f"  [OK] Total annotations: {stats['train_labels']['total_annotations']}")
    
    # Process validation data
    print(f"\n[3/5] Processing validation data...")
    
    val_src = dataset_dir / 'test'
    val_json = dataset_dir / 'test.json'
    
    print(f"  Copying validation images...")
    stats['val_images'] = copy_images(val_src, dirs['val_images'], processor)
    print(f"  [OK] Copied {stats['val_images']['copied']} images")
    
    print(f"  Converting annotations to YOLO format...")
    converter = COCOToYOLOConverter(str(val_json))
    stats['val_labels'] = converter.convert(str(dirs['val_labels']))
    print(f"  [OK] Created {len(stats['val_labels']['files_created'])} label files")
    print(f"  [OK] Total annotations: {stats['val_labels']['total_annotations']}")
    
    # Update dataset.yaml with correct paths
    print(f"\n[4/5] Updating dataset configuration...")
    config_path = model_dir / 'config' / 'dataset.yaml'
    
    # Read and update the config
    with open(config_path, 'r') as f:
        config_content = f.read()
    
    # Update path to absolute path
    data_path = str(dirs['data']).replace('\\', '/')
    config_content = config_content.replace('path: ../data', f'path: {data_path}')
    
    with open(config_path, 'w') as f:
        f.write(config_content)
    print(f"  [OK] Updated dataset.yaml with absolute paths")
    
    # Generate report
    print(f"\n[5/5] Generating preprocessing report...")
    report_path = dirs['reports'] / 'preprocessing_report.txt'
    report = generate_report(report_path, stats)
    print(f"  [OK] Report saved to: {report_path}")
    
    # Print summary
    print("\n" + report)
    
    print("\nPreprocessing complete! Run 'python train.py' to start training.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
