"""
Image Preprocessing Utilities for Food Detection
Handles raw image preprocessing for training and inference.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, Union
from PIL import Image


class ImageProcessor:
    """Preprocess images for food detection model."""
    
    # Supported image formats
    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff'}
    
    def __init__(self, target_size: Tuple[int, int] = (640, 640)):
        """
        Initialize image processor.
        
        Args:
            target_size: Target image size (width, height) for model input
        """
        self.target_size = target_size
        
    def is_valid_image(self, image_path: Union[str, Path]) -> bool:
        """Check if file is a valid supported image."""
        path = Path(image_path)
        return path.suffix.lower() in self.SUPPORTED_FORMATS and path.exists()
    
    def load_image(self, image_path: Union[str, Path]) -> Optional[np.ndarray]:
        """
        Load image from file path.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Image as numpy array (BGR format) or None if failed
        """
        try:
            image = cv2.imread(str(image_path))
            if image is None:
                # Try with PIL for broader format support
                pil_image = Image.open(image_path).convert('RGB')
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            return image
        except Exception as e:
            print(f"Error loading image {image_path}: {e}")
            return None
    
    def resize_with_padding(self, image: np.ndarray, 
                           fill_color: Tuple[int, int, int] = (114, 114, 114)) -> Tuple[np.ndarray, dict]:
        """
        Resize image maintaining aspect ratio with letterbox padding.
        
        Args:
            image: Input image (BGR)
            fill_color: Padding fill color (BGR)
            
        Returns:
            Tuple of (resized image, resize info dict)
        """
        h, w = image.shape[:2]
        target_w, target_h = self.target_size
        
        # Calculate scale factor
        scale = min(target_w / w, target_h / h)
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize image
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Calculate padding
        pad_w = (target_w - new_w) // 2
        pad_h = (target_h - new_h) // 2
        
        # Create padded image
        padded = np.full((target_h, target_w, 3), fill_color, dtype=np.uint8)
        padded[pad_h:pad_h + new_h, pad_w:pad_w + new_w] = resized
        
        resize_info = {
            'original_size': (w, h),
            'scale': scale,
            'padding': (pad_w, pad_h),
            'new_size': (new_w, new_h)
        }
        
        return padded, resize_info
    
    def resize_direct(self, image: np.ndarray) -> np.ndarray:
        """
        Directly resize image to target size (may distort aspect ratio).
        
        Args:
            image: Input image (BGR)
            
        Returns:
            Resized image
        """
        return cv2.resize(image, self.target_size, interpolation=cv2.INTER_LINEAR)
    
    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize image pixel values to [0, 1].
        
        Args:
            image: Input image (uint8, 0-255)
            
        Returns:
            Normalized image (float32, 0-1)
        """
        return image.astype(np.float32) / 255.0
    
    def enhance_image(self, image: np.ndarray, 
                     brightness: float = 1.0,
                     contrast: float = 1.0,
                     saturation: float = 1.0) -> np.ndarray:
        """
        Apply image enhancements.
        
        Args:
            image: Input image (BGR)
            brightness: Brightness factor (1.0 = no change)
            contrast: Contrast factor (1.0 = no change)
            saturation: Saturation factor (1.0 = no change)
            
        Returns:
            Enhanced image
        """
        result = image.copy().astype(np.float32)
        
        # Apply brightness and contrast
        result = result * contrast + (brightness - 1) * 127
        
        # Apply saturation
        if saturation != 1.0:
            hsv = cv2.cvtColor(result.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 1] = hsv[:, :, 1] * saturation
            hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
            result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def auto_correct_orientation(self, image_path: Union[str, Path]) -> np.ndarray:
        """
        Load image and correct orientation based on EXIF data.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Correctly oriented image
        """
        try:
            pil_image = Image.open(image_path)
            
            # Get EXIF orientation if available
            from PIL.ExifTags import TAGS
            exif = pil_image._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == 'Orientation':
                        if value == 3:
                            pil_image = pil_image.rotate(180, expand=True)
                        elif value == 6:
                            pil_image = pil_image.rotate(270, expand=True)
                        elif value == 8:
                            pil_image = pil_image.rotate(90, expand=True)
                        break
            
            # Convert to BGR for OpenCV
            rgb_image = np.array(pil_image.convert('RGB'))
            return cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            print(f"Could not correct orientation: {e}")
            return self.load_image(image_path)
    
    def preprocess_for_training(self, image: np.ndarray) -> np.ndarray:
        """
        Full preprocessing pipeline for training.
        
        Args:
            image: Raw input image
            
        Returns:
            Preprocessed image ready for training
        """
        # Resize with padding to maintain aspect ratio
        processed, _ = self.resize_with_padding(image)
        return processed
    
    def preprocess_for_inference(self, image: np.ndarray) -> Tuple[np.ndarray, dict]:
        """
        Full preprocessing pipeline for inference.
        
        Args:
            image: Raw input image
            
        Returns:
            Tuple of (preprocessed image, resize info for bbox scaling)
        """
        processed, resize_info = self.resize_with_padding(image)
        return processed, resize_info
    
    def get_image_stats(self, image: np.ndarray) -> dict:
        """
        Get image statistics.
        
        Args:
            image: Input image
            
        Returns:
            Dictionary with image statistics
        """
        return {
            'shape': image.shape,
            'dtype': str(image.dtype),
            'mean': float(np.mean(image)),
            'std': float(np.std(image)),
            'min': int(np.min(image)),
            'max': int(np.max(image))
        }


def preprocess_image(image_path: str, target_size: Tuple[int, int] = (640, 640)) -> Optional[np.ndarray]:
    """
    Convenience function to preprocess a single image.
    
    Args:
        image_path: Path to image file
        target_size: Target size for output
        
    Returns:
        Preprocessed image or None if failed
    """
    processor = ImageProcessor(target_size)
    image = processor.load_image(image_path)
    if image is not None:
        return processor.preprocess_for_training(image)
    return None


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 2:
        processor = ImageProcessor()
        image = processor.load_image(sys.argv[1])
        if image is not None:
            print(f"Image stats: {processor.get_image_stats(image)}")
            processed = processor.preprocess_for_training(image)
            print(f"Processed size: {processed.shape}")
