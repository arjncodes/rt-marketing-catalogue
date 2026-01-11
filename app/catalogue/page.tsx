'use client'

import { useState, useEffect} from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, Download, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import jsPDF from 'jspdf'
import { toast, Toaster } from 'sonner'

const BRAND_RED = '#C81F2D';

export const metadata = {
  title: "Product Catalog | R&T Marketing",
  description: "Browse our premium crockery collection"
}


type Product = {
  id: string
  name: string
  category_id: string
  category?: { name: string; color: string }
  price: number
  qty_per_box: string
  image_url: string | null
  is_hidden: boolean
}

type Category = {
  id: string
  name: string
  color: string
  display_order: number
}

const ITEMS_PER_PAGE = 50

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const LOGO_PATH = '/r-t logo.jpg'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('display_order')
    
    if (categoriesData) setCategories(categoriesData)

    // Filter out hidden products
    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name, color)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
    
    if (productsData) setProducts(productsData as Product[])
    
    setLoading(false)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || product.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory])

  const groupedProducts = categories.map(category => ({
    category,
    products: paginatedProducts.filter(p => p.category?.name === category.name)
  })).filter(group => group.products.length > 0)

  const exportToPDF = async () => {
    setExporting(true)
    toast.loading('Creating catalogue PDF...', { id: 'pdf' })

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10

      // Use premium font - Helvetica (built-in, professional)
      pdf.setFont('helvetica')

      // ============ COVER PAGE ============
      pdf.setFillColor(200, 31, 45) // Keep this RGB value - it's the brand red
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')

      try {
        const logoImg = await loadImage(LOGO_PATH)
        const logoSize = 50
        pdf.addImage(logoImg, 'JPEG', (pageWidth - logoSize) / 2, 45, logoSize, logoSize, undefined, 'FAST')
      } catch (e) {
        console.error('Logo error:', e)
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(42)
      pdf.setTextColor(255, 255, 255)
      pdf.text('R&T MARKETING', pageWidth / 2, 110, { align: 'center' })

      pdf.setDrawColor(255, 255, 255)
      pdf.setLineWidth(0.8)
      pdf.line(50, 120, pageWidth - 50, 120)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.text('PREMIUM WHOLESALE CROCKERY', pageWidth / 2, 135, { align: 'center' })

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(22)
      pdf.text('PRODUCT CATALOGUE', pageWidth / 2, 153, { align: 'center' })

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(14)
      pdf.text('2026 EDITION', pageWidth / 2, 167, { align: 'center' })

      // Contact info on cover
      pdf.setFontSize(11)
      pdf.text('9074089284 | 8590266100', pageWidth / 2, pageHeight - 35, { align: 'center' })
      pdf.text('mail.randtmarketing@gmail.com', pageWidth / 2, pageHeight - 25, { align: 'center' })
      pdf.setFontSize(9)
      pdf.text('Pothiladu, Kallidumbu, Edavanna, Malappuram Dt, Kerala', pageWidth / 2, pageHeight - 18, { align: 'center' })

      // ============ TABLE OF CONTENTS ============
      pdf.addPage()
      pdf.setFillColor(250, 249, 246)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(26)
      pdf.setTextColor(233, 74, 74)
      pdf.text('CATALOGUE INDEX', margin, 28)

      pdf.setDrawColor(233, 74, 74)
      pdf.setLineWidth(1.2)
      pdf.line(margin, 33, pageWidth - margin, 33)

      let tocYPos = 50
      categories.forEach((cat, index) => {
        const productCount = products.filter(p => p.category?.name === cat.name).length
        
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)
        pdf.setTextColor(50, 50, 50)
        pdf.text(`${index + 1}. ${cat.name}`, margin + 5, tocYPos)
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(130, 130, 130)
        pdf.text(`${productCount} items`, margin + 5, tocYPos + 5.5)
        
        tocYPos += 18
      })

      // ============ PRODUCT PAGES - 6 PER PAGE ============
      const PRODUCTS_PER_PAGE = 6
      const HEADER_HEIGHT = 35
      const FOOTER_HEIGHT = 15
      const AVAILABLE_HEIGHT = pageHeight - HEADER_HEIGHT - FOOTER_HEIGHT - (margin * 2)
      const CARD_HEIGHT = Math.floor(AVAILABLE_HEIGHT / PRODUCTS_PER_PAGE) - 2
      const CARD_GAP = 3

      // Get all visible products for PDF
      const allVisibleProducts = categories.map(category => ({
        category,
        products: products.filter(p => p.category?.name === category.name)
      })).filter(group => group.products.length > 0)

      for (const group of allVisibleProducts) {
        for (let startIdx = 0; startIdx < group.products.length; startIdx += PRODUCTS_PER_PAGE) {
          pdf.addPage()
          pdf.setFillColor(250, 249, 246)
          pdf.rect(0, 0, pageWidth, pageHeight, 'F')

          // Category header with logo
          pdf.setFillColor(200, 31, 45) // Brand red for headers
          pdf.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F')
          
          // Add logo to header
          try {
            const logoImg = await loadImage(LOGO_PATH)
            const headerLogoSize = 20
            pdf.addImage(logoImg, 'JPEG', margin, (HEADER_HEIGHT - headerLogoSize) / 2, headerLogoSize, headerLogoSize, undefined, 'FAST')
          } catch (e) {
            console.error('Header logo error:', e)
          }
          
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(20)
          pdf.setTextColor(255, 255, 255)
          const headerText = startIdx === 0 ? group.category.name : `${group.category.name} (CONT.)`
          pdf.text(headerText, pageWidth / 2, HEADER_HEIGHT / 2 + 3, { align: 'center' })

          let yPos = HEADER_HEIGHT + margin
          const pageProductsEnd = Math.min(startIdx + PRODUCTS_PER_PAGE, group.products.length)
          const pageProducts = group.products.slice(startIdx, pageProductsEnd)

          for (let i = 0; i < pageProducts.length; i++) {
            const product = pageProducts[i]
            const cardWidth = pageWidth - (2 * margin)

            // Card background with shadow effect
            pdf.setFillColor(255, 255, 255)
            pdf.setDrawColor(220, 220, 220)
            pdf.setLineWidth(0.4)
            pdf.roundedRect(margin, yPos, cardWidth, CARD_HEIGHT, 1.5, 1.5, 'FD')

            // LEFT: Product Image (larger)
            const imgSize = CARD_HEIGHT - 10
            const imgX = margin + 5
            const imgY = yPos + 5

            if (product.image_url) {
              try {
                const img = await loadImage(product.image_url)
                pdf.addImage(img, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST')
                
                pdf.setDrawColor(230, 230, 230)
                pdf.setLineWidth(0.3)
                pdf.rect(imgX, imgY, imgSize, imgSize)
              } catch (e) {
                pdf.setFillColor(245, 245, 245)
                pdf.rect(imgX, imgY, imgSize, imgSize, 'F')
              }
            } else {
              pdf.setFillColor(245, 245, 245)
              pdf.rect(imgX, imgY, imgSize, imgSize, 'F')
            }

            // MIDDLE: Product Details (improved spacing and fonts)
            const detailsX = imgX + imgSize + 8
            const detailsY = yPos + 8

            // Product Name - larger and bolder
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(11)
            pdf.setTextColor(30, 30, 30)
            const nameLines = pdf.splitTextToSize(product.name, 90)
            pdf.text(nameLines[0], detailsX, detailsY)
            if (nameLines[1]) {
              pdf.setFontSize(10)
              pdf.text(nameLines[1], detailsX, detailsY + 5)
            }

            // Product Code
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(100, 100, 100)
            pdf.text('Product Code:', detailsX, detailsY + 12)
            
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9)
            pdf.setTextColor(50, 50, 50)
            pdf.text(product.id.substring(0, 8).toUpperCase(), detailsX + 22, detailsY + 12)

            // Quantity
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(100, 100, 100)
            pdf.text('Quantity:', detailsX, detailsY + 19)
            
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9)
            pdf.setTextColor(50, 50, 50)
            const qtyText = product.qty_per_box.length > 20 ? product.qty_per_box.substring(0, 20) + '...' : product.qty_per_box
            pdf.text(qtyText, detailsX + 18, detailsY + 19)

            // RIGHT: Price Box (larger and more prominent)
            const priceBoxWidth = 50
            const priceBoxX = margin + cardWidth - priceBoxWidth - 5
            const priceBoxY = yPos + 5
            const priceBoxHeight = CARD_HEIGHT - 10

            pdf.setFillColor(250, 250, 250)
            pdf.setDrawColor(240, 240, 240)
            pdf.setLineWidth(0.3)
            pdf.roundedRect(priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight, 1, 1, 'FD')

            // Price label
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6.5)
            pdf.setTextColor(110, 110, 110)
            pdf.text('Wholesale Price', priceBoxX + priceBoxWidth/2, priceBoxY + 5, { align: 'center' })

            // Price value - larger
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(16)
            pdf.setTextColor(233, 74, 74)
            pdf.text(`Rs ${product.price.toFixed(2)}`, priceBoxX + priceBoxWidth/2, priceBoxY + 16, { align: 'center' })

            // "per box"
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6.5)
            pdf.setTextColor(120, 120, 120)
            pdf.text('per box', priceBoxX + priceBoxWidth/2, priceBoxY + 22, { align: 'center' })

            yPos += CARD_HEIGHT + CARD_GAP
          }

          // Footer with contact details and logo
          const footerY = pageHeight - FOOTER_HEIGHT + 3
          
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7)
          pdf.setTextColor(140, 140, 140)
          pdf.text('R&T Marketing | 9074089284, 8590266100', margin, footerY)
          pdf.text('mail.randtmarketing@gmail.com', margin, footerY + 4)
          
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(7)
          pdf.text(`Page ${pdf.internal.pages.length - 2}`, pageWidth - margin, footerY, { align: 'right' })
        }
      }

      // ============ BACK COVER ============
      // ============ BACK COVER ============
pdf.addPage()
pdf.setFillColor(200, 31, 45) // Solid brand red
pdf.rect(0, 0, pageWidth, pageHeight, 'F')

// Title
pdf.setFont('helvetica', 'bold')
pdf.setFontSize(42)
pdf.setTextColor(255, 255, 255)
pdf.text('CONTACT US', pageWidth / 2, 45, { align: 'center' })

// Decorative line
pdf.setDrawColor(255, 255, 255)
pdf.setLineWidth(2)
pdf.line(40, 55, pageWidth - 40, 55)

// Company Name & Tagline
pdf.setFont('helvetica', 'bold')
pdf.setFontSize(28)
pdf.text('R&T MARKETING', pageWidth / 2, 75, { align: 'center' })

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(13)
pdf.text('Premium Wholesale Crockery Supplier', pageWidth / 2, 87, { align: 'center' })

// White Contact Box
const boxY = 105
const boxHeight = 120
const boxMargin = 25

pdf.setFillColor(255, 255, 255)
pdf.roundedRect(boxMargin, boxY, pageWidth - (boxMargin * 2), boxHeight, 5, 5, 'F')

// Left Side - Phone & Email
const leftX = boxMargin + 18
let yPos = boxY + 25

// PHONE ICON - Modern phone receiver
pdf.setFillColor(200, 31, 45)
pdf.roundedRect(leftX - 8, yPos - 8, 12, 12, 2, 2, 'F')
pdf.setDrawColor(255, 255, 255)
pdf.setLineWidth(1.5)
// Phone handset shape
pdf.line(leftX - 4, yPos - 4, leftX - 1, yPos - 1)
pdf.line(leftX - 1, yPos - 1, leftX + 1, yPos + 1)
pdf.line(leftX + 1, yPos + 1, leftX + 4, yPos + 4)

pdf.setFont('helvetica', 'bold')
pdf.setFontSize(11)
pdf.setTextColor(200, 31, 45)
pdf.text('PHONE', leftX + 10, yPos - 1)

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(13)
pdf.setTextColor(40, 40, 40)
pdf.text('9074089284', leftX + 3, yPos + 12)
pdf.text('8590266100', leftX + 3, yPos + 24)

yPos += 48

// EMAIL ICON - Envelope
pdf.setFillColor(200, 31, 45)
pdf.roundedRect(leftX - 8, yPos - 8, 12, 9, 1, 1, 'F')
pdf.setDrawColor(255, 255, 255)
pdf.setLineWidth(1)
// Envelope flap
pdf.line(leftX - 7, yPos - 7, leftX - 2, yPos - 3)
pdf.line(leftX - 2, yPos - 3, leftX + 3, yPos - 7)

pdf.setFont('helvetica', 'bold')
pdf.setFontSize(11)
pdf.setTextColor(200, 31, 45)
pdf.text('EMAIL', leftX + 10, yPos - 1)

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(11)
pdf.setTextColor(40, 40, 40)
pdf.text('mail.randtmarketing@gmail.com', leftX + 3, yPos + 12)

// Right Side - Address
const rightX = pageWidth / 2 + 15
let addressYPos = boxY + 25

// LOCATION ICON - Map pin
pdf.setFillColor(200, 31, 45)
// Pin circle top
pdf.circle(rightX - 2, addressYPos - 3, 4, 'F')
// Pin point bottom
const pinPoints = [
  [rightX - 2, addressYPos + 3] as const,
  [rightX - 5, addressYPos - 1] as const,
  [rightX + 1, addressYPos - 1] as const
]
pdf.triangle(pinPoints[0][0], pinPoints[0][1], pinPoints[1][0], pinPoints[1][1], pinPoints[2][0], pinPoints[2][1], 'F')
// Inner white circle
pdf.setFillColor(255, 255, 255)
pdf.circle(rightX - 2, addressYPos - 3, 2, 'F')

pdf.setFont('helvetica', 'bold')
pdf.setFontSize(11)
pdf.setTextColor(200, 31, 45)
pdf.text('ADDRESS', rightX + 10, addressYPos - 1)

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(11)
pdf.setTextColor(40, 40, 40)
pdf.text('Pothiladu, Kallidumbu', rightX + 3, addressYPos + 12)
pdf.text('Edavanna', rightX + 3, addressYPos + 23)
pdf.text('Malappuram District', rightX + 3, addressYPos + 34)
pdf.text('Kerala, India', rightX + 3, addressYPos + 45)

// Bottom decorative line
pdf.setDrawColor(200, 31, 45)
pdf.setLineWidth(1.5)
pdf.line(boxMargin + 15, boxY + boxHeight + 15, pageWidth - boxMargin - 15, boxY + boxHeight + 15)

// Footer
pdf.setFont('helvetica', 'normal')
pdf.setFontSize(11)
pdf.setTextColor(255, 255, 255)
const today = new Date().toLocaleDateString('en-IN', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric' 
})
pdf.text(`Catalogue generated on ${today}`, pageWidth / 2, pageHeight - 24, { align: 'center' })

pdf.setFontSize(9)
pdf.text('© 2025 R&T Marketing. All rights reserved.', pageWidth / 2, pageHeight - 14, { align: 'center' })

// Add PDF metadata for security
pdf.setProperties({
  title: 'R&T Marketing Product Catalogue 2025',
  subject: 'Wholesale Crockery Products',
  author: 'R&T Marketing',
  keywords: 'crockery, wholesale, products, catalogue',
  creator: 'R&T Marketing Catalogue System'
});

// Save with clean filename
const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-')

// ============ SAVE PDF ============
pdf.save(`RT-Marketing-Catalogue-${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Catalogue downloaded successfully!', { id: 'pdf' })
  } catch (error) {
    console.error('PDF export error:', error)
    toast.error('Failed to create catalogue', { id: 'pdf' })
  } finally {
    setExporting(false)
  }
}

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }
  
  // Helper function to draw triangle on PDF
  const addTriangleToPDF = (pdf: jsPDF, x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    pdf.setDrawColor(200, 31, 45)
    pdf.line(x, y, x1, y1)
    pdf.line(x1, y1, x2, y2)
    pdf.line(x2, y2, x, y)
  }

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Toaster position="top-center" richColors />
      
      <div className="bg-[#C81F2D] border-b-4 border-[#C81F2D] shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src={LOGO_PATH} alt="R&T Marketing" className="h-14 w-14 object-contain rounded-lg shadow-md bg-white p-1" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-md">R&T MARKETING</h1>
                <p className="text-sm md:text-base text-white/95 mt-1 font-medium">Premium Wholesale Crockery</p>
              </div>
            </div>
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="bg-white text-[#E94A4A] px-6 py-3 rounded-sm hover:bg-gray-50 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg"
            >
              <Download size={20} />
              <span className="hidden md:inline">Download Catalogue</span>
              <span className="md:hidden">PDF</span>
            </button>
          </div>

          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 border-2 border-white/20 rounded-sm focus:border-white focus:outline-none bg-white/95 backdrop-blur-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide border-b-2 border-white/20">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-6 py-2 whitespace-nowrap font-semibold border-b-4 transition-all ${
                selectedCategory === 'ALL'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              All Products ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-2 whitespace-nowrap font-semibold border-b-4 transition-all ${
                  selectedCategory === cat.name
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white'
              }`}
              >
                {cat.name} ({products.filter(p => p.category?.name === cat.name).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-[#E94A4A] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading catalogue...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 mb-4">No products found</p>
            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('ALL')
              }}
              className="px-6 py-3 bg-[#E94A4A] text-white rounded-sm hover:bg-[#d13838] font-semibold"
            >
              View All Products
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-16">
              {groupedProducts.map(({ category, products }) => (
                <div key={category.id}>
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
                      <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-3 py-1 rounded-full">
                        {products.length} items
                      </span>
                    </div>
                    <div className="h-1 w-20 bg-[#E94A4A]"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.map((product) => (
                      <div 
                        key={product.id} 
                        className="bg-white border border-gray-200 hover:border-[#E94A4A] transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="flex">
                          <div className="w-1/3 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-6 border-r border-gray-100">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <span className="text-4xl text-gray-300">📦</span>
                              </div>
                            )}
                          </div>

                          <div className="w-2/3 p-6 flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-3 leading-tight">
                              {product.name}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex">
                                <span className="text-sm text-gray-500 w-24">Product Code:</span>
                                <span className="text-sm text-gray-700 font-mono">{product.id.substring(0, 8).toUpperCase()}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm text-gray-500 w-24">Quantity:</span>
                                <span className="text-sm text-gray-700 font-semibold">{product.qty_per_box}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm text-gray-500 w-24">Category:</span>
                                <span className="text-sm text-gray-700">{product.category?.name}</span>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Wholesale Price</div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-[#E94A4A]">₹{product.price.toFixed(2)}</span>
                                <span className="text-sm text-gray-500">per box</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredProducts.length > ITEMS_PER_PAGE && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-gray-700"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-sm font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-[#E94A4A] text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-gray-700"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{startIndex + 1}-{Math.min(endIndex, filteredProducts.length)}</span> of <span className="font-bold text-gray-900">{filteredProducts.length}</span> products
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border-t-4 border-[#C81F2D] mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src={LOGO_PATH} alt="R&T Marketing" className="h-12 w-12 object-contain rounded-lg shadow-sm" />
                <h3 className="text-2xl font-bold text-[#C81F2D]">R&T MARKETING</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your trusted partner for premium wholesale crockery and glassware since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#C81F2D]" />
                  <a href="tel:9074089284" className="hover:text-[#C81F2D] transition-colors">9074089284</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#C81F2D]" />
                  <a href="tel:8590266100" className="hover:text-[#C81F2D] transition-colors">8590266100</a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[#C81F2D]" />
                  <a href="mailto:mail.randtmarketing@gmail.com" className="hover:text-[#C81F2D] transition-colors">mail.randtmarketing@gmail.com</a>
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin size={16} className="text-[#C81F2D] mt-1 flex-shrink-0" />
                  <span>Pothiladu, Kallidumbu<br />Edavanna, Malappuram Dt<br />Kerala</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Categories</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {categories.map(cat => (
                  <span key={cat.id}>• {cat.name}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
            © 2026 R&T Marketing. All rights reserved.
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}