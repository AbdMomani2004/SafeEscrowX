import React, { useState, useRef } from 'react';
import { BACKEND_URL } from './config/api';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onError,
  accept = 'image/*,video/*',
  maxSizeMB = 10,
  disabled = false,
  children
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `File size must be less than ${maxSizeMB}MB`;
      onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.ok && result.url) {
        setProgress(100);
        onUploadComplete(result.url);
        
        // Reset after short delay
        setTimeout(() => {
          setProgress(0);
          setPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 1000);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.message || 'Failed to upload file';
      onError?.(errorMsg);
      alert(errorMsg);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {children ? (
        <div onClick={handleClick} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={disabled || isUploading}
          className="w-full bg-surface-alt border border-border-color text-white font-medium py-2 px-4 rounded-xl hover:bg-surface transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      )}

      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-surface-alt rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-body mt-1 text-center">Uploading... {progress}%</p>
        </div>
      )}

      {preview && (
        <div className="mt-2 relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg border border-border-color"
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
