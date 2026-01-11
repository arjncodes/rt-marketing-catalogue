import { supabase } from '../supabase/client'
import { compressImage } from './image'

export interface UploadResult {
  url: string
  path: string
  size: number
}

/**
 * Upload image to Supabase Storage with compression
 */
export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<UploadResult> {
  try {
    // 1. Compress image
    const compressedFile = await compressImage(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200
    })

    // 2. Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExt}`
    const filePath = `products/${fileName}`

    // 3. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    // 4. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
      size: compressedFile.size
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    throw error
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/storage/v1/object/public/product-images/')
    if (urlParts.length < 2) {
      console.warn('Invalid image URL format')
      return false
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    console.log('Image deleted:', filePath)
    return true
  } catch (error) {
    console.error('Failed to delete image:', error)
    return false
  }
}

/**
 * Get total storage used by all product images
 */
export async function getTotalStorageUsed(): Promise<number> {
  try {
    // Simple calculation from products table
    const { data, error } = await supabase
      .from('products')
      .select('image_size')
      .not('image_size', 'is', null)
    
    if (error) throw error
    
    if (!data || data.length === 0) return 0
    
    const totalBytes = data.reduce((sum, product) => sum + (product.image_size || 0), 0)
    const totalMB = totalBytes / 1024 / 1024
    
    return totalMB
  } catch (error) {
    console.error('Failed to get storage stats:', error)
    return 0
  }
}

