'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  Package, Search, Plus, Edit, Trash2, Eye, EyeOff,
  Upload, LogOut, Download, ExternalLink, X, Save,
  AlertCircle, CheckCircle, FolderOpen, Palette, Tag, Filter
} from 'lucide-react';
import Image from 'next/image';
import { uploadProductImage, deleteProductImage } from '@/lib/utils/supabase-storage';
import { productSchema } from '@/lib/validations/product';


// Color Presets - 22 Beautiful Colors
const COLOR_PRESETS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Slate", value: "#64748B" },
  { name: "Gray", value: "#6B7280" },
  { name: "Zinc", value: "#71717A" },
  { name: "Stone", value: "#78716C" },
  { name: "Brown", value: "#92400E" },
];

interface Product {
  id: string;
  name: string;
  product_code: string;
  category_id: string;
  category?: {
    name: string;
    color: string;
  };
  price: number;
  qty_per_box: string;
  image_url: string;
  image_size?: number;
  is_hidden: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  display_order?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const LOGO_PATH = '/r-t logo.jpg'

  // Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: COLOR_PRESETS[0].value,
  });
  const [categoryErrors, setCategoryErrors] = useState<any>({});

  const [storageUsed, setStorageUsed] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    category_id: '',
    price: '',
    qty_per_box: '',
    image: null as File | null,
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    calculateStorageUsed();
  }, []);

  // Auto-hide notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        console.log('Fetched products with is_hidden:', data.slice(0, 3)); // Log first 3 for debugging
        setProducts(data as Product[]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setNotification({ type: 'error', message: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, display_order')
        .order('display_order');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // app/admin/page.tsx

  const calculateStorageUsed = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('image_size');
        
      if (data) {
        // Fix: Add types to parameters
        const totalBytes = data.reduce((sum: number, p: any) => sum + (p.image_size || 0), 0);
        setStorageUsed(totalBytes / (1024 * 1024)); // Convert to MB
      }
    } catch (error) {
      console.error('Error calculating storage:', error);
    }
  };


  const handleLogout = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
    setNotification({
      type: 'error',
      message: 'Failed to logout'
    });
    return;
  }
  
  router.push('/login');
  router.refresh();
};

  // ========== PRODUCT HANDLERS ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setFormErrors({});

    try {
      const validationResult = productSchema.safeParse({
        name: formData.name,
        category_id: formData.category_id,
        price: parseFloat(formData.price),
        qty_per_box: formData.qty_per_box,
        image_url: null,
        image_size: null,
      });

      if (!validationResult.success) {
        const errors: any = {};
        validationResult.error.issues.forEach((err) => {
          const field = err.path[0];
          errors[field] = err.message;
        });
        setFormErrors(errors);
        setUploading(false);
        return;
      }

      if (storageUsed > 900) {
        setNotification({ 
          type: 'error', 
          message: `Storage almost full! ${storageUsed.toFixed(0)}MB of 1GB used.` 
        });
      }

      let imageUrl = editingProduct?.image_url || '';
      let fileSize = editingProduct?.image_size || 0;

      if (formData.image) {
        try {
          const uploadResult = await uploadProductImage(formData.image);
          imageUrl = uploadResult.url;
          fileSize = uploadResult.size;

          if (editingProduct?.image_url) {
            await deleteProductImage(editingProduct.image_url);
          }
        } catch (error: any) {
          setNotification({ type: 'error', message: `Image upload failed: ${error.message}` });
          setUploading(false);
          return;
        }
      } else if (!editingProduct) {
        setFormErrors({ image: 'Product image is required' });
        setUploading(false);
        return;
      }

      const productData = {
        name: formData.name,
        product_code: formData.product_code.toUpperCase(),
        category_id: formData.category_id,
        price: parseFloat(formData.price),
        qty_per_box: formData.qty_per_box,
        image_url: imageUrl,
        image_size: fileSize,
        is_hidden: editingProduct?.is_hidden ?? false,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        setNotification({ type: 'success', message: 'Product updated successfully!' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        setNotification({ type: 'success', message: 'Product added successfully!' });
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
      calculateStorageUsed();
    } catch (error: any) {
      console.error('Save error:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to save product' });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      product_code: '',
      category_id: '',
      price: '',
      qty_per_box: '',
      image: null,
    });
    setFormErrors({});
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      product_code: product.product_code,
      category_id: product.category_id,
      price: product.price.toString(),
      qty_per_box: product.qty_per_box,
      image: null,
    });
    setShowAddModal(true);
  };

  const toggleVisibility = async (id: string, currentlyHidden: boolean) => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      if (!user) {
        setNotification({ 
          type: 'error', 
          message: 'You must be logged in to update products' 
        });
        return;
      }

      const newHiddenState = !currentlyHidden;
      console.log('Attempting to update product:', id, 'to is_hidden:', newHiddenState);

      // Try update with more detailed error info
      const { data, error } = await supabase
        .from('products')
        .update({ is_hidden: newHiddenState })
        .eq('id', id)
        .select('id, name, is_hidden')
        .single();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Successfully updated product:', data);

      // Update local state immediately
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === id ? { ...p, is_hidden: newHiddenState } : p
        )
      );

      // Show success notification
      setNotification({ 
        type: 'success', 
        message: newHiddenState 
          ? 'Product hidden from catalog & PDF ✓' 
          : 'Product visible in catalog & PDF ✓' 
      });

    } catch (error: any) {
      console.error('Toggle visibility error:', error);
      setNotification({ 
        type: 'error', 
        message: `Failed to update: ${error.message || 'Check RLS policies'}` 
      });
    }
  };

  const deleteProduct = async (id: string, imageUrl: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;

    try {
      await deleteProductImage(imageUrl);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotification({ type: 'success', message: 'Product deleted successfully' });
      fetchProducts();
      calculateStorageUsed();
    } catch (error: any) {
      console.error('Delete error:', error);
      setNotification({ type: 'error', message: 'Failed to delete product' });
    }
  };

  // ========== CATEGORY HANDLERS ==========
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryErrors({});

    if (!categoryForm.name.trim()) {
      setCategoryErrors({ name: 'Category name is required' });
      return;
    }

    try {
      const categoryData = {
        name: categoryForm.name.trim(),
        color: categoryForm.color,
        display_order: editingCategory?.display_order || categories.length + 1,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        setNotification({ type: 'success', message: 'Category updated successfully!' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);

        if (error) throw error;
        setNotification({ type: 'success', message: 'Category created successfully!' });
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchCategories();
      fetchProducts();
    } catch (error: any) {
      console.error('Category save error:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to save category' });
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      color: COLOR_PRESETS[0].value,
    });
    setCategoryErrors({});
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      color: category.color || COLOR_PRESETS[0].value,
    });
    setShowCategoryModal(true);
  };

  const deleteCategory = async (id: string) => {
    const productsInCategory = products.filter(p => p.category_id === id);

    if (productsInCategory.length > 0) {
      setNotification({ 
        type: 'error', 
        message: `Cannot delete category with ${productsInCategory.length} product(s). Remove products first.` 
      });
      return;
    }

    if (!confirm('Delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotification({ type: 'success', message: 'Category deleted successfully' });
      fetchCategories();
    } catch (error: any) {
      console.error('Delete category error:', error);
      setNotification({ type: 'error', message: 'Failed to delete category' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const visibleCount = products.filter(p => !p.is_hidden).length;
  const hiddenCount = products.filter(p => p.is_hidden).length;
  const storagePercentage = (storageUsed / 1024) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 py-3">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image 
                src={LOGO_PATH} 
                alt="R&T Marketing" 
                width={48} 
                height={48}
                className="rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">R&T Marketing</h1>
                <p className="text-xs text-gray-500">Product Manager</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a 
                href="/catalogue" 
                target="_blank"
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                title="View Catalog"
              >
                <ExternalLink className="w-4 h-4 text-gray-700" />
              </a>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'products'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <Package className="w-4 h-4" />
              <span>Products</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'categories'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <FolderOpen className="w-4 h-4" />
              <span>Categories</span>
            </button>
          </div>

          {/* Products Tab Content */}
          {activeTab === 'products' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-gray-600 font-medium">Total</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{products.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Eye className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs text-gray-600 font-medium">Visible</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{visibleCount}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <EyeOff className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-xs text-gray-600 font-medium">Hidden</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">{hiddenCount}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs text-gray-600 font-medium">Storage</span>
                  </div>
                  <p className="text-sm font-bold text-purple-600">
                    {storageUsed.toFixed(1)}MB
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className={`h-1 rounded-full transition-all ${storagePercentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Search + Category Filter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products, codes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Categories Stats */}
          {activeTab === 'categories' && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Categories</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{categories.length}</p>
                </div>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                  <Tag className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 pb-24 max-w-[1600px] mx-auto">
        {activeTab === 'products' ? (
          // ========== PRODUCTS VIEW ==========
          loading ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-pulse" />
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategory !== 'all' ? 'No products found' : 'No products yet'}
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Add First Product
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="lg:hidden space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all overflow-hidden ${
                      product.is_hidden ? 'opacity-60 border-orange-300' : ''
                    }`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border relative">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain p-1.5"
                          />
                          {product.is_hidden && (
                            <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">
                              Hidden
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="mt-1 space-y-1">
                          <p className="text-xs font-mono text-gray-600">#{product.product_code}</p>
                          <span 
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: product.category?.color ? `${product.category.color}20` : '#DBEAFE',
                              color: product.category?.color || '#1E40AF'
                            }}
                          >
                            {product.category?.name || 'N/A'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <p className="text-lg font-bold text-red-600">
                              ₹{product.price.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500">{product.qty_per_box}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleVisibility(product.id, product.is_hidden)}
                              className={`p-2 rounded-lg transition ${
                                !product.is_hidden
                                  ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                              }`}
                              title={!product.is_hidden ? 'Hide from catalog' : 'Show in catalog'}
                            >
                              {!product.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id, product.image_url)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Enhanced Larger Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Image</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product Details</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className={`hover:bg-gray-50 transition-colors group ${product.is_hidden ? 'bg-orange-50/30' : ''}`}>
                          <td className="px-6 py-5">
                            <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 group-hover:border-gray-300 transition-all shadow-sm relative">
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-2" />
                              {product.is_hidden && (
                                <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                  Hidden
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="max-w-sm">
                              <p className="font-bold text-gray-900 text-base leading-snug mb-1">{product.name}</p>
                              {product.image_size && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                  {(product.image_size / 1024).toFixed(0)} KB
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <code className="inline-block px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-mono text-gray-800 font-semibold">
                              {product.product_code || 'N/A'}
                            </code>
                          </td>

                          <td className="px-6 py-5">
                            <span 
                              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm"
                              style={{
                                backgroundColor: product.category?.color ? `${product.category.color}20` : '#DBEAFE',
                                color: product.category?.color || '#1E40AF',
                                border: `1.5px solid ${product.category?.color || '#1E40AF'}40`
                              }}
                            >
                              {product.category?.name || 'Uncategorized'}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm text-gray-700 font-semibold">{product.qty_per_box || 'N/A'}</p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-lg font-bold text-red-600">₹{product.price ? product.price.toLocaleString('en-IN') : '0'}</p>
                          </td>

                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm ${
                              !product.is_hidden ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              {!product.is_hidden ? <><Eye className="w-4 h-4" />Visible</> : <><EyeOff className="w-4 h-4" />Hidden</>}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleVisibility(product.id, product.is_hidden)}
                                className={`p-2.5 rounded-lg transition-all hover:scale-110 ${
                                  !product.is_hidden ? 'bg-green-50 text-green-600 hover:bg-green-100 shadow-sm' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 shadow-sm'
                                }`}
                                title={!product.is_hidden ? 'Hide from catalog & PDF' : 'Show in catalog & PDF'}
                              >
                                {!product.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleEdit(product)} 
                                className="p-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all hover:scale-110 shadow-sm"
                                title="Edit product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteProduct(product.id, product.image_url)} 
                                className="p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all hover:scale-110 shadow-sm"
                                title="Delete product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : (
          // ========== CATEGORIES VIEW ==========
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">No categories yet</p>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    resetCategoryForm();
                    setShowCategoryModal(true);
                  }}
                  className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Add First Category
                </button>
              </div>
            ) : (
              <>
                {/* Mobile View - Category Cards */}
                <div className="lg:hidden space-y-3">
                  {categories.map((category) => {
                    const productCount = products.filter(p => p.category_id === category.id).length;
                    return (
                      <div
                        key={category.id}
                        className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: category.color || '#3B82F6' }}
                            >
                              <Tag className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{category.name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">{productCount} product{productCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View - Larger Category Grid */}
                <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-5">
                  {categories.map((category) => {
                    const productCount = products.filter(p => p.category_id === category.id).length;
                    return (
                      <div
                        key={category.id}
                        className="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all p-6 group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: category.color || '#3B82F6' }}
                          >
                            <Tag className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all hover:scale-110"
                              title="Edit category"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all hover:scale-110"
                              title="Delete category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 text-xl mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Package className="w-4 h-4" />
                          {productCount} product{productCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Floating Add Buttons */}
      {activeTab === 'products' && (
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="fixed bottom-6 right-6 w-16 h-16 lg:w-14 lg:h-14 bg-red-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-red-700 transition hover:scale-110 z-10"
        >
          <Plus className="w-7 h-7 lg:w-6 lg:h-6" />
        </button>
      )}

      {activeTab === 'categories' && (
        <button
          onClick={() => {
            setEditingCategory(null);
            resetCategoryForm();
            setShowCategoryModal(true);
          }}
          className="fixed bottom-6 right-6 w-16 h-16 lg:w-14 lg:h-14 bg-red-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-red-700 transition hover:scale-110 z-10"
        >
          <Plus className="w-7 h-7 lg:w-6 lg:h-6" />
        </button>
      )}

      {/* Product Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ASHOKA MINI MILK MUG"
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                    placeholder="800A1ACE"
                    className="w-full px-4 py-2.5 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                  {formErrors.product_code && <p className="text-red-600 text-xs mt-1">{formErrors.product_code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && <p className="text-red-600 text-xs mt-1">{formErrors.category_id}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="620.00"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                  {formErrors.price && <p className="text-red-600 text-xs mt-1">{formErrors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="text"
                    value={formData.qty_per_box}
                    onChange={(e) => setFormData({ ...formData, qty_per_box: e.target.value })}
                    placeholder="Box of 24 PCS"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                  {formErrors.qty_per_box && <p className="text-red-600 text-xs mt-1">{formErrors.qty_per_box}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image {!editingProduct && '*'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-red-500 transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                    className="hidden"
                    id="image-upload"
                    required={!editingProduct}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {formData.image ? formData.image.name : editingProduct ? 'Change image (optional)' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </label>
                </div>
                {formErrors.image && <p className="text-red-600 text-xs mt-1">{formErrors.image}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingProduct ? 'Update' : 'Add'} Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Mugs & Cups"
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                {categoryErrors.name && <p className="text-red-600 text-xs mt-1">{categoryErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Category Color *
                </label>

                {/* Color Preview */}
                <div className="mb-3 p-4 rounded-lg border-2" style={{ backgroundColor: `${categoryForm.color}15`, borderColor: categoryForm.color }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md flex items-center justify-center"
                      style={{ backgroundColor: categoryForm.color }}
                    >
                      <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{categoryForm.name || 'Category Name'}</p>
                      <code className="text-xs text-gray-600">{categoryForm.color}</code>
                    </div>
                  </div>
                </div>

                {/* Color Picker Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color: color.value })}
                      className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${
                        categoryForm.color === color.value 
                          ? 'ring-2 ring-offset-2 ring-gray-900 shadow-lg' 
                          : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    resetCategoryForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCategory ? 'Update' : 'Create'} Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}