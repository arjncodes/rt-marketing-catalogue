import { z } from 'zod'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const productSchema = z.object({
  name: z.string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must be less than 100 characters'),
  
  category_id: z.string()
    .uuid('Invalid category'),
  
  price: z.number()
    .positive('Price must be greater than 0')
    .max(999999, 'Price too high'),
  
  qty_per_box: z.string()
    .min(1, 'Quantity is required')
    .regex(/^\d+\s*(PCS|PIECES|pcs|pieces)$/i, 'Format: "48 PCS" or "60 PIECES"'),
  
  image_url: z.string().url().optional().nullable(),
  image_size: z.number().optional().nullable(),
})

export const imageFileSchema = z.object({
  file: z.custom<File>()
    .refine((file) => file?.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
    .refine(
      (file) => ALLOWED_FILE_TYPES.includes(file?.type),
      'Only JPG, PNG, and WebP images are allowed'
    )
})

export type ProductInput = z.infer<typeof productSchema>
export type ImageFileInput = z.infer<typeof imageFileSchema>
