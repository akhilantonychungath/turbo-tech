import React, { useState, useRef, useEffect } from 'react';

const ImageCropModal = ({ isOpen, onClose, imageFile, onCropComplete }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (imageFile && isOpen) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, isOpen]);

  useEffect(() => {
    if (imageSrc && imageRef.current) {
      const img = new Image();
      img.onload = () => {
        const containerWidth = 500;
        const containerHeight = 500;
        const imgAspect = img.width / img.height;
        let displayWidth = img.width;
        let displayHeight = img.height;

        if (displayWidth > containerWidth) {
          displayWidth = containerWidth;
          displayHeight = displayWidth / imgAspect;
        }
        if (displayHeight > containerHeight) {
          displayHeight = containerHeight;
          displayWidth = displayHeight * imgAspect;
        }

        const calculatedScale = displayWidth / img.width;
        setScale(calculatedScale);
        setImageDimensions({ width: displayWidth, height: displayHeight });

        // Initialize crop area as square in center
        const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
        setCropArea({
          x: (displayWidth - cropSize) / 2,
          y: (displayHeight - cropSize) / 2,
          width: cropSize,
          height: cropSize
        });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on crop area
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragStart({
        x: x - cropArea.x,
        y: y - cropArea.y
      });
    } else {
      // Start new crop
      const cropSize = Math.min(imageDimensions.width, imageDimensions.height) * 0.8;
      setCropArea({
        x: Math.max(0, Math.min(x - cropSize / 2, imageDimensions.width - cropSize)),
        y: Math.max(0, Math.min(y - cropSize / 2, imageDimensions.height - cropSize)),
        width: cropSize,
        height: cropSize
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragStart.x;
    const y = e.clientY - rect.top - dragStart.y;

    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(x, imageDimensions.width - cropArea.width)),
      y: Math.max(0, Math.min(y, imageDimensions.height - cropArea.height))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const [resizeHandle, setResizeHandle] = useState(null);

  const handleResizeStart = (handle, e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeHandle(handle);
    setIsDragging(false);
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!resizeHandle || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const minSize = 50;

      let newCropArea = { ...cropArea };

      switch (resizeHandle) {
        case 'se':
          newCropArea.width = Math.max(minSize, Math.min(mouseX - cropArea.x, imageDimensions.width - cropArea.x));
          newCropArea.height = Math.max(minSize, Math.min(mouseY - cropArea.y, imageDimensions.height - cropArea.y));
          break;
        case 'sw':
          newCropArea.width = Math.max(minSize, cropArea.x + cropArea.width - mouseX);
          newCropArea.height = Math.max(minSize, Math.min(mouseY - cropArea.y, imageDimensions.height - cropArea.y));
          newCropArea.x = Math.max(0, mouseX);
          break;
        case 'ne':
          newCropArea.width = Math.max(minSize, Math.min(mouseX - cropArea.x, imageDimensions.width - cropArea.x));
          newCropArea.height = Math.max(minSize, cropArea.y + cropArea.height - mouseY);
          newCropArea.y = Math.max(0, mouseY);
          break;
        case 'nw':
          newCropArea.width = Math.max(minSize, cropArea.x + cropArea.width - mouseX);
          newCropArea.height = Math.max(minSize, cropArea.y + cropArea.height - mouseY);
          newCropArea.x = Math.max(0, mouseX);
          newCropArea.y = Math.max(0, mouseY);
          break;
        default:
          return;
      }

      // Keep square aspect ratio
      const size = Math.min(newCropArea.width, newCropArea.height);
      if (resizeHandle.includes('w')) newCropArea.x = cropArea.x + cropArea.width - size;
      if (resizeHandle.includes('n')) newCropArea.y = cropArea.y + cropArea.height - size;
      newCropArea.width = size;
      newCropArea.height = size;

      // Ensure crop area stays within image bounds
      if (newCropArea.x < 0) {
        newCropArea.width += newCropArea.x;
        newCropArea.height = newCropArea.width;
        newCropArea.x = 0;
      }
      if (newCropArea.y < 0) {
        newCropArea.height += newCropArea.y;
        newCropArea.width = newCropArea.height;
        newCropArea.y = 0;
      }
      if (newCropArea.x + newCropArea.width > imageDimensions.width) {
        newCropArea.width = imageDimensions.width - newCropArea.x;
        newCropArea.height = newCropArea.width;
      }
      if (newCropArea.y + newCropArea.height > imageDimensions.height) {
        newCropArea.height = imageDimensions.height - newCropArea.y;
        newCropArea.width = newCropArea.height;
      }

      setCropArea(newCropArea);
    };

    const handleResizeEnd = () => {
      setResizeHandle(null);
    };

    if (resizeHandle) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizeHandle, cropArea, imageDimensions]);

  const cropAndResizeImage = () => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Calculate actual crop coordinates in original image
      const actualX = cropArea.x / scale;
      const actualY = cropArea.y / scale;
      const actualWidth = cropArea.width / scale;
      const actualHeight = cropArea.height / scale;

      // Determine output size (max 512x512, maintain aspect ratio)
      let outputWidth = actualWidth;
      let outputHeight = actualHeight;
      const maxDimension = 512;

      if (outputWidth > maxDimension || outputHeight > maxDimension) {
        const aspectRatio = outputWidth / outputHeight;
        if (outputWidth > outputHeight) {
          outputWidth = maxDimension;
          outputHeight = maxDimension / aspectRatio;
        } else {
          outputHeight = maxDimension;
          outputWidth = maxDimension * aspectRatio;
        }
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      ctx.drawImage(
        img,
        actualX, actualY, actualWidth, actualHeight,
        0, 0, outputWidth, outputHeight
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = imageSrc;
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Crop Profile Picture</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined w-6 h-6">close</span>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Drag to move the crop area. Drag corners to resize. Maximum size: 512x512 pixels.
            </p>
          </div>

          <div
            ref={containerRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
            style={{ width: '500px', height: '500px', margin: '0 auto' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview"
              className="absolute top-0 left-0"
              style={{
                width: `${imageDimensions.width}px`,
                height: `${imageDimensions.height}px`,
                objectFit: 'contain'
              }}
              draggable={false}
            />

            {/* Crop overlay */}
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move"
              style={{
                left: `${cropArea.x}px`,
                top: `${cropArea.y}px`,
                width: `${cropArea.width}px`,
                height: `${cropArea.height}px`
              }}
            >
              {/* Resize handles */}
              <div
                className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize"
                onMouseDown={(e) => handleResizeStart('nw', e)}
              />
              <div
                className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize"
                onMouseDown={(e) => handleResizeStart('ne', e)}
              />
              <div
                className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize"
                onMouseDown={(e) => handleResizeStart('sw', e)}
              />
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize"
                onMouseDown={(e) => handleResizeStart('se', e)}
              />
            </div>

            {/* Dark overlay outside crop area */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top overlay */}
              <div
                className="absolute bg-black bg-opacity-50"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${cropArea.y}px`
                }}
              />
              {/* Bottom overlay */}
              <div
                className="absolute bg-black bg-opacity-50"
                style={{
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${imageDimensions.height - cropArea.y - cropArea.height}px`
                }}
              />
              {/* Left overlay */}
              <div
                className="absolute bg-black bg-opacity-50"
                style={{
                  top: `${cropArea.y}px`,
                  left: 0,
                  width: `${cropArea.x}px`,
                  height: `${cropArea.height}px`
                }}
              />
              {/* Right overlay */}
              <div
                className="absolute bg-black bg-opacity-50"
                style={{
                  top: `${cropArea.y}px`,
                  right: 0,
                  width: `${imageDimensions.width - cropArea.x - cropArea.width}px`,
                  height: `${cropArea.height}px`
                }}
              />
            </div>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={cropAndResizeImage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Crop & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
