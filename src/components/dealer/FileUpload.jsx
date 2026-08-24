import React, { useRef } from 'react';

const FileUpload = ({ 
  name, 
  label, 
  value, 
  onChange, 
  onRemove, 
  accept = 'image/*,.pdf',
  required = false 
}) => {
  const fileInputRef = useRef(null);

  // Check if value is a URL (string) or a File object
  const isExistingFile = value && typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
  const isNewFile = value && value instanceof File;
  
  // Extract filename from URL or File object
  const getFileName = () => {
    if (isExistingFile) {
      // Extract filename from URL
      try {
        const url = new URL(value);
        // Firebase Storage URLs have the format: .../o/dealers%2F{uid}%2F{filename}?...
        // We need to decode the path
        let pathname = url.pathname;
        
        // Handle Firebase Storage URL format: /v0/b/{bucket}/o/{encodedPath}
        if (pathname.includes('/o/')) {
          const encodedPath = pathname.split('/o/')[1]?.split('?')[0] || '';
          const decodedPath = decodeURIComponent(encodedPath);
          const pathParts = decodedPath.split('/');
          return pathParts[pathParts.length - 1] || 'Existing file';
        }
        
        // Standard URL format
        const pathParts = pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        // Decode URL-encoded filename
        return decodeURIComponent(fileName) || 'Existing file';
      } catch {
        // If URL parsing fails, try to extract from the string
        const parts = value.split('/');
        const lastPart = parts[parts.length - 1]?.split('?')[0] || '';
        return decodeURIComponent(lastPart) || 'Existing file';
      }
    }
    if (isNewFile) {
      return value.name;
    }
    return null;
  };

  const fileName = getFileName();

  const handleChooseFileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleViewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExistingFile && value) {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {/* File input - hidden */}
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          onChange={onChange}
          accept={accept}
          className="hidden"
        />
        
        {/* Display area showing file button and file info */}
        <div className="border border-gray-300 rounded-lg bg-white">
          <div className="flex items-center justify-between px-4 py-2 min-h-[42px]">
            {/* Left side - File button area */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleChooseFileClick}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Choose File
              </button>
              {!(isExistingFile || isNewFile) && (
                <span className="text-sm text-gray-500">No file chosen</span>
              )}
            </div>
            
            {/* Right side - File info, view and delete buttons */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              {(isExistingFile || isNewFile) && fileName && (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className={`material-symbols-outlined text-base flex-shrink-0 ${isExistingFile ? 'text-blue-600' : 'text-green-600'}`}>
                      {isExistingFile ? 'description' : 'upload_file'}
                    </span>
                    <span className={`text-sm font-medium truncate max-w-[200px] ${isExistingFile ? 'text-blue-600' : 'text-green-600'}`} title={fileName}>
                      {fileName}
                    </span>
                    {isExistingFile && (
                      <button
                        type="button"
                        onClick={handleViewClick}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0 ml-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        View
                      </button>
                    )}
                  </div>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      className="h-8 w-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center flex-shrink-0"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {isExistingFile && (
          <p className="mt-1 text-xs text-gray-500">
            Upload a new file to replace the existing one
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

