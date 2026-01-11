import imageCompression from 'browser-image-compression'

export interface CompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
}

/**
 * Compress image to reduce file size
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.5, // Compress to max 500KB
    maxWidthOrHeight: 1200, // Max dimension
    useWebWorker: true,
    fileType: file.type,
    ...options
  }

  try {
    const compressedFile = await imageCompression(file, defaultOptions)
    console.log('Image compressed:', {
      original: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      compressed: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB'
    })
    return compressedFile
  } catch (error) {
    console.error('Compression failed:', error)
    throw new Error('Failed to compress image')
  }
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  minWidth: number = 200,
  minHeight: number = 200
): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          error: `Image too small. Minimum ${minWidth}x${minHeight}px required`
        })
      } else {
        resolve({
          valid: true,
          width: img.width,
          height: img.height
        })
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        width: 0,
        height: 0,
        error: 'Invalid image file'
      })
    }
    
    img.src = url
  })
}

/**
 * Convert File to base64 (for preview)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
