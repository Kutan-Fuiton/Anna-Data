"""
COCO to YOLO Format Converter
Converts COCO JSON annotations to YOLO txt format for object detection training.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple


class COCOToYOLOConverter:
    """Convert COCO format annotations to YOLO format."""
    
    def __init__(self, coco_json_path: str):
        """
        Initialize converter with COCO JSON file.
        
        Args:
            coco_json_path: Path to COCO format JSON file
        """
        self.coco_json_path = Path(coco_json_path)
        self.data = self._load_coco_json()
        
        # Create lookup dictionaries
        self.images = {img['id']: img for img in self.data['images']}
        self.categories = {cat['id']: cat['name'] for cat in self.data['categories']}
        
    def _load_coco_json(self) -> dict:
        """Load and parse COCO JSON file."""
        with open(self.coco_json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _coco_bbox_to_yolo(self, bbox: List[float], img_width: int, img_height: int) -> Tuple[float, float, float, float]:
        """
        Convert COCO bbox [x, y, width, height] to YOLO format [x_center, y_center, width, height] (normalized).
        
        Args:
            bbox: COCO format bounding box [x, y, width, height]
            img_width: Image width in pixels
            img_height: Image height in pixels
            
        Returns:
            Tuple of (x_center, y_center, width, height) normalized to [0, 1]
        """
        x, y, w, h = bbox
        
        # Calculate center coordinates
        x_center = (x + w / 2) / img_width
        y_center = (y + h / 2) / img_height
        
        # Normalize width and height
        width = w / img_width
        height = h / img_height
        
        # Clamp values to [0, 1]
        x_center = max(0, min(1, x_center))
        y_center = max(0, min(1, y_center))
        width = max(0, min(1, width))
        height = max(0, min(1, height))
        
        return x_center, y_center, width, height
    
    def convert(self, output_dir: str) -> Dict[str, any]:
        """
        Convert all annotations to YOLO format and save to output directory.
        
        Args:
            output_dir: Directory to save YOLO format label files
            
        Returns:
            Dictionary with conversion statistics
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Group annotations by image
        annotations_by_image = {}
        for ann in self.data['annotations']:
            img_id = ann['image_id']
            if img_id not in annotations_by_image:
                annotations_by_image[img_id] = []
            annotations_by_image[img_id].append(ann)
        
        stats = {
            'total_images': len(self.images),
            'images_with_annotations': 0,
            'total_annotations': 0,
            'annotations_per_class': {},
            'files_created': []
        }
        
        # Initialize class counts
        for cat_id, cat_name in self.categories.items():
            stats['annotations_per_class'][cat_name] = 0
        
        # Convert each image's annotations
        for img_id, img_info in self.images.items():
            img_name = img_info['file_name']
            img_width = img_info['width']
            img_height = img_info['height']
            
            # Create label filename (same name as image but .txt extension)
            label_name = Path(img_name).stem + '.txt'
            label_path = output_path / label_name
            
            # Get annotations for this image
            annotations = annotations_by_image.get(img_id, [])
            
            if annotations:
                stats['images_with_annotations'] += 1
                
                with open(label_path, 'w') as f:
                    for ann in annotations:
                        cat_id = ann['category_id']
                        bbox = ann['bbox']
                        
                        # Convert to YOLO format
                        x_center, y_center, width, height = self._coco_bbox_to_yolo(
                            bbox, img_width, img_height
                        )
                        
                        # Write line: class_id x_center y_center width height
                        f.write(f"{cat_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")
                        
                        stats['total_annotations'] += 1
                        cat_name = self.categories[cat_id]
                        stats['annotations_per_class'][cat_name] += 1
                
                stats['files_created'].append(str(label_path))
            else:
                # Create empty label file for images without annotations
                label_path.touch()
                stats['files_created'].append(str(label_path))
        
        return stats
    
    def get_class_names(self) -> List[str]:
        """Get ordered list of class names."""
        return [self.categories[i] for i in sorted(self.categories.keys())]


def convert_coco_to_yolo(coco_json_path: str, output_dir: str) -> Dict[str, any]:
    """
    Convenience function to convert COCO annotations to YOLO format.
    
    Args:
        coco_json_path: Path to COCO JSON file
        output_dir: Directory to save YOLO labels
        
    Returns:
        Conversion statistics
    """
    converter = COCOToYOLOConverter(coco_json_path)
    return converter.convert(output_dir)


if __name__ == "__main__":
    # Test conversion
    import sys
    if len(sys.argv) >= 3:
        stats = convert_coco_to_yolo(sys.argv[1], sys.argv[2])
        print(f"Converted {stats['total_annotations']} annotations from {stats['images_with_annotations']} images")
