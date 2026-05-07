'use client'

import { useEffect, useState } from 'react'
import { websiteAPI, productAPI, categoryAPI, orderAPI, uploadAPI } from '@/services/techgear-api'
import { sendTelegramNotification } from '@/utils/telegram'
import Header from '@/components/Header'
import { Save, Globe, Smartphone, Monitor, Layout, Image, Palette, Type, Settings, FileText, AlertCircle, Plus, X, Trash2, Eye, EyeOff, Wallet, TrendingUp, Heart, Award, Mail, Box, ShoppingCart, Star } from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { isDeletedAtMissingError } from '@/lib/orderTrash'

function getMissionImagesArrayFromSettings(s) {
  if (!s) return []
  try {
    if (s.about_mission_images != null && s.about_mission_images !== '') {
      const arr = typeof s.about_mission_images === 'string' ? JSON.parse(s.about_mission_images) : s.about_mission_images
      if (Array.isArray(arr) && arr.length) return arr.filter(Boolean)
    }
  } catch {
    /* ignore */
  }
  if (s.about_mission_image) return [s.about_mission_image]
  return []
}


export default function Vebsayt() {
  const { toggleSidebar } = useLayout()
  const { t } = useLanguage()
  const [settings, setSettings] = useState({
    site_name: 'Mening Sexim',
    logo_url: '',
    banner_text: 'Sifatli mahsulotlar eng arzon narxlarda!',
    banner_text_uz: '',
    banner_text_ru: '',
    banner_text_en: '',
    phone: '+998901234567',
    address: 'Toshkent, Chilonzor tumani',
    work_hours: 'Dushanba-Shanba: 9:00-20:00',
    telegram_url: '@mysayt',
    instagram_url: '@mysayt',
    facebook_url: 'mysayt',
    humo_card: '',
    uzcard_card: '',
    visa_card: '',
    hero_desktop_url: '',
    hero_mobile_url: ''
  })

  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryRu, setNewCategoryRu] = useState('')
  const [newCategoryEn, setNewCategoryEn] = useState('')
  const [categoryImage, setCategoryImage] = useState('')
  const [uploadingCategory, setUploadingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [uploadingAboutHero, setUploadingAboutHero] = useState(false)
  const [uploadingAboutMission, setUploadingAboutMission] = useState(false)

  const [banners, setBanners] = useState([])
  const [siteBenefits, setSiteBenefits] = useState([])
  const [editingBenefit, setEditingBenefit] = useState(null)
  const [benefitForm, setBenefitForm] = useState({
    icon: 'truck',
    title_uz: '',
    title_ru: '',
    title_en: '',
    desc_uz: '',
    desc_ru: '',
    desc_en: '',
    sort_order: 0,
    is_active: true
  })
  const [products, setProducts] = useState([])
  const [webOrders, setWebOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sozlamalar')
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [bannerForm, setBannerForm] = useState({
    title: '',
    title_uz: '',
    title_ru: '',
    title_en: '',
    subtitle: '',
    subtitle_uz: '',
    subtitle_ru: '',
    subtitle_en: '',
    image_url: '',
    link: '',
    active: true
  })

  const [albumImages, setAlbumImages] = useState([])
  const [editingAlbumImage, setEditingAlbumImage] = useState(null)
  const [uploadingAlbumImage, setUploadingAlbumImage] = useState(false)
  const [albumImageForm, setAlbumImageForm] = useState({
    image_url: '',
    title_uz: '',
    title_ru: '',
    title_en: '',
    sort_order: 0,
    is_active: true,
    format: 'portrait'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Load website settings
      const settingsRes = await websiteAPI.getSettings()
      if (settingsRes.success) setSettings(settingsRes.settings)

      // Load banners
      const bannersRes = await websiteAPI.getBanners()
      setBanners(bannersRes || [])

      // Load site_benefits
      const benefitsRes = await websiteAPI.getBenefits()
      setSiteBenefits(benefitsRes || [])

      // Load categories
      const categoriesRes = await categoryAPI.getAll()
      setCategories(categoriesRes || [])

      // Load products for web display
      const productsRes = await productAPI.getAll()
      setProducts(productsRes || [])

      // Load website orders
      const ordersRes = await orderAPI.getAll({ source: 'website' })
      setWebOrders(ordersRes || [])

      // Load reviews
      const reviewsRes = await websiteAPI.getReviews()
      setReviews(reviewsRes.reviews || [])

      // Load subscriptions - (Coming soon in backend)
      // const subsRes = await websiteAPI.getSubscriptions()
      // setSubscriptions(subsRes || [])

      // Load album_images
      const albumRes = await websiteAPI.getAlbum()
      setAlbumImages(albumRes || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }



  function playNotificationSound() {
    const audio = new Audio('/notification.mp3')
    audio.play().catch(e => console.log('Audio play failed:', e))
  }

  const [savingSettings, setSavingSettings] = useState(false)
  async function handleSaveSettings() {
    if (!settings || Object.keys(settings).length === 0) return
    try {
      setSavingSettings(true)
      const keys = Object.keys(settings);
      
      // Filter out internal or unnecessary keys if any
      const keysToSave = keys.filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
      
      for (const key of keysToSave) {
        await websiteAPI.updateSetting(key, settings[key]);
      }
      
      alert(t('website.saveSuccess') || 'Muvaffaqiyatli saqlandi!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(t('common.saveError') || 'Saqlashda xatolik yuz berdi')
    } finally {
      setSavingSettings(false)
    }
  }


  async function handleSaveBanner() {
    if (!bannerForm.title_uz && !bannerForm.title_ru && !bannerForm.title_en) return alert(t('website.banners.requiredError'))
    try {
      const bannerData = {
        ...bannerForm,
        title: bannerForm.title_ru || bannerForm.title_uz || bannerForm.title_en,
        subtitle: bannerForm.subtitle_ru || bannerForm.subtitle_uz || bannerForm.subtitle_en
      }
      await websiteAPI.createBanner(bannerData)
      setIsAddingBanner(false)
      setBannerForm({ title: '', title_uz: '', title_ru: '', title_en: '', subtitle: '', subtitle_uz: '', subtitle_ru: '', subtitle_en: '', image_url: '', link: '', active: true })
      loadData()
      alert(t('website.banners.saveSuccess'))
    } catch (error) {
      console.error('Error saving banner:', error)
      alert(t('common.saveError'))
    }
  }

  async function handleToggleBanner(id, currentStatus) {
    try {
      await websiteAPI.createBanner({ id, is_active: !currentStatus })
      loadData()
    } catch (error) {
      console.error('Error toggling banner:', error)
    }
  }

  async function handleDeleteBanner(id) {
    if (!confirm(t('common.deleteConfirm'))) return
    try {
      await websiteAPI.deleteBanner(id)
      loadData()
    } catch (error) {
      console.error('Error deleting banner:', error)
    }
  }

  async function handleSaveBenefit() {
    try {
      const data = { ...benefitForm }
      if (editingBenefit) {
        await websiteAPI.updateBenefit(editingBenefit.id, data)
      } else {
        await websiteAPI.createBenefit(data)
      }
      setEditingBenefit(null)
      setBenefitForm({ icon: 'truck', title_uz: '', title_ru: '', title_en: '', desc_uz: '', desc_ru: '', desc_en: '', sort_order: 0, is_active: true })
      loadData()
      alert(t('website.saveSuccess'))
    } catch (err) {
      console.error(err)
      alert(t('common.saveError'))
    }
  }

  async function handleDeleteBenefit(id) {
    if (!confirm(t('common.deleteConfirm'))) return
    try {
      await websiteAPI.deleteBenefit(id)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleToggleBenefit(id, active) {
    try {
      await websiteAPI.updateBenefit(id, { is_active: !active })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }
  function handleEditBenefit(benefit) {
    setEditingBenefit(benefit)
    setBenefitForm({
      icon: benefit.icon || 'truck',
      title_uz: benefit.title_uz || benefit.title || '',
      title_ru: benefit.title_ru || '',
      title_en: benefit.title_en || '',
      desc_uz: benefit.desc_uz || benefit.desc || '',
      desc_ru: benefit.desc_ru || '',
      desc_en: benefit.desc_en || '',
      sort_order: benefit.sort_order || 0,
      is_active: benefit.is_active ?? true
    })
  }

  async function handleSaveAlbumImage() {
    try {
      const data = { ...albumImageForm }
      if (editingAlbumImage) {
        // Update album image (using create for now if backend supports upsert, or we can add update endpoint)
        await websiteAPI.createAlbumImage({ ...data, id: editingAlbumImage.id })
      } else {
        if (!albumImageForm.image_url?.trim()) return alert("Rasmni fayldan yuklang")
        await websiteAPI.createAlbumImage(data)
      }
      setEditingAlbumImage(null)
      setAlbumImageForm({ image_url: '', title_uz: '', title_ru: '', title_en: '', sort_order: 0, is_active: true, format: 'portrait' })
      loadData()
      alert(t('website.saveSuccess'))
    } catch (err) {
      console.error(err)
      alert(t('common.saveError'))
    }
  }

  async function handleDeleteAlbumImage(id) {
    if (!confirm(t('common.deleteConfirm'))) return
    try {
      await websiteAPI.deleteAlbumImage(id)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeleteAllAlbumImages() {
    if (albumImages.length === 0) return
    if (!confirm(`Barcha ${albumImages.length} ta albom rasmini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.`)) return
    try {
      for (const img of albumImages) {
        await websiteAPI.deleteAlbumImage(img.id)
      }
      setAlbumImages([])
      loadData()
      alert(t('website.saveSuccess'))
    } catch (err) {
      console.error(err)
      alert(t('common.saveError'))
    }
  }

  async function handleToggleAlbumImage(id, active) {
    try {
      // Toggle logic (using create for now if backend supports upsert)
      await websiteAPI.createAlbumImage({ id, is_active: !active })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const BENEFIT_ICONS = ['truck', 'shield-check', 'credit-card', 'package', 'headphones', 'award', 'zap']

  async function handleToggleProduct(id, currentStatus) {
    try {
      await productAPI.update(id, { is_active: !currentStatus })
      loadData()
    } catch (error) {
      console.error('Error toggling product:', error)
    }
  }

  async function handleOrderStatusChange(id, newStatus) {
    try {
      await orderAPI.updateStatus(id, newStatus)
      loadData()
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  async function handleCategoryImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploadingCategory(true)
      const res = await uploadAPI.uploadMultiple(file)
      if (res.urls && res.urls[0]) {
        setCategoryImage(res.urls[0])
      }
    } catch (error) {
      console.error('Error uploading category image:', error)
      alert(t('common.saveError'))
    } finally {
      setUploadingCategory(false)
    }
  }

  async function handleAboutHeroImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      setUploadingAboutHero(true)
      const res = await uploadAPI.uploadMultiple(file)
      if (res.urls && res.urls[0]) {
        setSettings(s => ({ ...s, about_hero_image: res.urls[0] }))
      }
    } catch (err) {
      console.error(err)
      alert('Rasm yuklashda xatolik: ' + (err?.message || ''))
    } finally {
      setUploadingAboutHero(false)
    }
  }

  async function handleAboutCompanyImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const res = await uploadAPI.uploadMultiple(file)
      if (res.urls && res.urls[0]) {
        setSettings(s => ({ ...s, about_company_image: res.urls[0] }))
        alert('Jamoa rasmi yuklandi')
      }
    } catch (err) {
      console.error(err)
      alert('Rasm yuklashda xatolik')
    }
  }

  async function handleAboutMissionImageUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      setUploadingAboutMission(true)
      const res = await uploadAPI.uploadMultiple(files)
      const newUrls = res.urls || []
      
      setSettings((s) => {
        const prev = getMissionImagesArrayFromSettings(s)
        const next = [...prev, ...newUrls]
        return {
          ...s,
          about_mission_images: JSON.stringify(next),
          about_mission_image: next[0] || s.about_mission_image || ''
        }
      })
    } catch (err) {
      console.error(err)
      alert('Rasm yuklashda xatolik: ' + (err?.message || ''))
    } finally {
      setUploadingAboutMission(false)
    }
    e.target.value = ''
  }

  function removeMissionImageAt(idx) {
    setSettings((s) => {
      const prev = getMissionImagesArrayFromSettings(s)
      const next = prev.filter((_, i) => i !== idx)
      return {
        ...s,
        about_mission_images: next.length ? JSON.stringify(next) : null,
        about_mission_image: next[0] || ''
      }
    })
  }

  async function handleAlbumImageUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const isMultiple = files.length > 1
    try {
      setUploadingAlbumImage(true)
      const res = await uploadAPI.uploadMultiple(files)
      const newUrls = res.urls || []

      if (!isMultiple) {
        setAlbumImageForm(f => ({ ...f, image_url: newUrls[0] }))
      } else {
        const maxSort = albumImages.length ? Math.max(...albumImages.map(i => i.sort_order ?? 0), -1) + 1 : 0
        const format = albumImageForm.format || 'portrait'
        let success = 0
        for (let i = 0; i < newUrls.length; i++) {
          const insertData = {
            image_url: newUrls[i],
            title_uz: '',
            title_ru: '',
            title_en: '',
            sort_order: maxSort + i,
            is_active: true,
            format,
          }
          await websiteAPI.createAlbumImage(insertData)
          success++
        }
        if (success > 0) {
          loadData()
          setAlbumImageForm(f => ({ ...f, image_url: '', title_uz: '', title_ru: '', title_en: '' }))
          alert(`${success} ta rasm muvaffaqiyatli qo'shildi`)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Rasm yuklashda xatolik: ' + (err?.message || ''))
    } finally {
      setUploadingAlbumImage(false)
    }
    e.target.value = ''
  }

  function handleEditCategory(cat) {
    setNewCategory(cat.name_uz || cat.name || '')
    setNewCategoryRu(cat.name_ru || '')
    setNewCategoryEn(cat.name_en || '')
    setCategoryImage(cat.image_url || '')
    setEditingCategoryId(cat.id)
  }

  function handleCancelEditCategory() {
    setNewCategory('')
    setNewCategoryRu('')
    setNewCategoryEn('')
    setCategoryImage('')
    setEditingCategoryId(null)
  }

  async function handleSaveCategory() {
    if (!newCategory.trim() && !newCategoryRu.trim() && !newCategoryEn.trim()) return
    const name = newCategory || newCategoryRu || newCategoryEn
    try {
      const data = {
        name,
        name_uz: newCategory || name,
        name_ru: newCategoryRu || name,
        name_en: newCategoryEn || name,
        image_url: categoryImage
      }
      if (editingCategoryId) {
        await categoryAPI.update(editingCategoryId, data)
        handleCancelEditCategory()
      } else {
        await categoryAPI.create(data)
        handleCancelEditCategory()
      }
      loadData()
      alert(t('website.categories.saveSuccess'))
    } catch (error) {
      console.error('Error saving category:', error)
      alert(t('common.saveError'))
    }
  }

  async function handleDeleteCategory(id) {
    if (!confirm(t('website.categories.deleteConfirm'))) return
    try {
      await categoryAPI.delete(id)
      if (editingCategoryId === id) handleCancelEditCategory()
      loadData()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(t('website.categories.deleteError'))
    }
  }

  // ... (handlers for settings, banners, products, orders remain)

  async function handleReviewStatus(id, newStatus) {
    try {
      await websiteAPI.updateReviewStatus(id, newStatus)
      loadData()
    } catch (error) {
      console.error('Error updating review:', error)
    }
  }

  async function handleDeleteReview(id) {
    if (!confirm(t('common.deleteConfirm'))) return
    try {
      await websiteAPI.deleteReview(id)
      loadData()
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  async function handleDeleteSubscription(id) {
    if (!confirm(t('website.subscriptions.deleteConfirm'))) return
    try {
      // (Coming soon in backend)
      loadData()
    } catch (error) {
      console.error('Error deleting subscription:', error)
      alert(t('common.saveError'))
    }
  }

  const tabs = [
    { id: 'sozlamalar', icon: Settings, label: t('website.tabs.settings') || 'Sozlamalar' },
    { id: 'biz-haqimizda', icon: FileText, label: t('website.tabs.about') || 'Biz haqimizda' },
    { id: 'foyda-kartalari', icon: Award, label: t('website.tabs.benefits') || 'Afzalliklar' },
    { id: 'albom-rasmlari', icon: Image, label: t('website.tabs.albumImages') || 'Galereya' },
    { id: 'kategoriyalar', icon: Layout, label: t('website.tabs.categories') || 'Kategoriyalar' },
    { id: 'sharhlar', icon: AlertCircle, label: t('website.tabs.reviews') || 'Sharhlar' },
    { id: 'obunalar', icon: Mail, label: t('website.tabs.subscriptions') || 'Obunalar' }
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#02020a] z-[100] flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-white/5 animate-[spin_3s_linear_infinite]"></div>
          <div className="absolute inset-0 w-24 h-24 rounded-full border-t-2 border-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-blue-500/10 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center">
              <Globe className="text-blue-400 animate-pulse" size={24} />
            </div>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6">

      {/* Header */}
      <Header title={t('common.website')} toggleSidebar={toggleSidebar} />


      {/* Compact Tabs Navigation */}
      <div className="sticky top-0 z-50 bg-[#02020a]/80 backdrop-blur-md -mx-4 px-4 py-4 border-b border-white/10 mb-8">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105 border border-blue-400/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
                <span className="text-sm">{tab.label || tab.id.charAt(0).toUpperCase() + tab.id.slice(1).replace('-', ' ')}</span>
                {tab.id === 'sharhlar' && reviews.filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {reviews.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'sozlamalar' && (
        <div className="space-y-6 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/30">
                <Settings className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Sayt Sozlamalari</h3>
                <p className="text-gray-400 font-medium">Bosh sahifa va umumiy ma'lumotlar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Branding Section */}
              <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-6">
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Layout size={14} /> BRANDING
                </h4>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sayt nomi</label>
                  <input
                    type="text"
                    value={settings.site_name || ''}
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl focus:border-blue-500/50 outline-none transition-all font-semibold text-white shadow-inner"
                    placeholder="Masalan: Nuur Home"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Bosh sahifa sarlavhasi (Uch tilda)</p>
                  {['uz', 'ru', 'en'].map(lang => (
                    <div key={lang} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">{lang.toUpperCase()} tili</label>
                      <input
                        type="text"
                        placeholder={`Sarlavha (${lang.toUpperCase()})`}
                        value={settings[`banner_text_${lang}`] !== undefined ? settings[`banner_text_${lang}`] : (settings.banner_text || '')}
                        onChange={(e) => setSettings({ ...settings, [`banner_text_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Localization Section */}
              <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-6">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Mail size={14} /> CONTACT & LOCALIZATION
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Telefon</label>
                    <input
                      type="tel"
                      value={settings.phone || ''}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                    <input
                      type="email"
                      value={settings.email || ''}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider ml-1">Telegram URL</label>
                    <input
                      type="text"
                      placeholder="https://t.me/..."
                      value={settings.telegram_url || ''}
                      onChange={(e) => setSettings({ ...settings, telegram_url: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider ml-1">Instagram URL</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/..."
                      value={settings.instagram_url || ''}
                      onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest pt-2">Manzil (Uch tilda)</p>
                  {['uz', 'ru', 'en'].map(lang => (
                    <input
                      key={lang}
                      type="text"
                      placeholder={`Manzil (${lang.toUpperCase()})`}
                      value={settings[`address_${lang}`] !== undefined ? settings[`address_${lang}`] : (settings.address || '')}
                      onChange={(e) => setSettings({ ...settings, [`address_${lang}`]: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-sm"
                    />
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Ish vaqti</label>
                  <input
                    type="text"
                    value={settings.work_hours || ''}
                    onChange={(e) => setSettings({ ...settings, work_hours: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white text-sm"
                    placeholder="9:00 - 18:00"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className={`${savingSettings ? 'opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20'} text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3`}
              >
                {savingSettings ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                {savingSettings ? 'Saqlanmoqda...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'biz-haqimizda' && (
        <div className="space-y-6 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-indigo-500/30">
                <FileText className="text-indigo-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Biz Haqimizda</h3>
                <p className="text-gray-400 font-medium">Sahifa mazmuni va tarixi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {/* Left: Hero Section */}
              <div className="space-y-6">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">HERO SECTION</h4>
                  
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase">Sarlavha (Uch tilda)</p>
                    {['uz', 'ru', 'en'].map(lang => (
                      <input
                        key={lang}
                        type="text"
                        placeholder={`Sarlavha (${lang.toUpperCase()})`}
                        value={settings[`about_hero_title_${lang}`] !== undefined ? settings[`about_hero_title_${lang}`] : (settings.about_hero_title || '')}
                        onChange={(e) => setSettings({ ...settings, [`about_hero_title_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-indigo-500/50 outline-none font-semibold text-white"
                      />
                    ))}
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase pt-2">Subtitr (Uch tilda)</p>
                    {['uz', 'ru', 'en'].map(lang => (
                      <textarea
                        key={lang}
                        rows={2}
                        placeholder={`Subtitr (${lang.toUpperCase()})`}
                        value={settings[`about_hero_subtitle_${lang}`] !== undefined ? settings[`about_hero_subtitle_${lang}`] : (settings.about_hero_subtitle || '')}
                        onChange={(e) => setSettings({ ...settings, [`about_hero_subtitle_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-indigo-500/50 outline-none font-semibold text-white resize-none"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                    <div className="w-20 h-20 rounded-xl bg-black/20 border border-white/10 overflow-hidden shadow-inner">
                      {settings.about_hero_image ? <img src={settings.about_hero_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-indigo-900/50"><Image /></div>}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Asosiy Hero rasm</span>
                      <input type="file" className="hidden" onChange={handleAboutHeroImageUpload} />
                      <div className="bg-indigo-500/10 border border-indigo-500/20 py-2 text-center rounded-xl text-indigo-400 font-bold text-xs hover:bg-indigo-500/20 transition-all">
                        {uploadingAboutHero ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-4">KORXONA HAQIDA (PASTKI BO'LIM)</h4>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase">Sarlavha (Uch tilda)</p>
                    {['uz', 'ru', 'en'].map(lang => (
                      <input
                        key={lang}
                        type="text"
                        placeholder={`Korxona nomi (${lang.toUpperCase()})`}
                        value={settings[`about_company_title_${lang}`] || ''}
                        onChange={(e) => setSettings({ ...settings, [`about_company_title_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white"
                      />
                    ))}
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase pt-2">Matn (Uch tilda)</p>
                    {['uz', 'ru', 'en'].map(lang => (
                      <textarea
                        key={lang}
                        rows={4}
                        placeholder={`Korxona haqida batafsil matn (${lang.toUpperCase()})`}
                        value={settings[`about_company_text_${lang}`] || ''}
                        onChange={(e) => setSettings({ ...settings, [`about_company_text_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-blue-500/50 outline-none font-semibold text-white resize-none text-sm"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                    <div className="w-20 h-20 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                      {settings.about_company_image ? <img src={settings.about_company_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-900/50"><Image /></div>}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Jamoa / Korxona rasmi</span>
                      <input type="file" className="hidden" onChange={handleAboutCompanyImageUpload} />
                      <div className="bg-blue-500/10 border border-blue-500/20 py-2 text-center rounded-xl text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition-all">
                        Rasm tanlash
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right: Mission & Stats */}
              <div className="space-y-6">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-4">MISSION & VISION</h4>
                  {['uz', 'ru', 'en'].map(lang => (
                    <div key={lang} className="space-y-2">
                      <p className="text-[10px] font-bold text-amber-400/50 uppercase">{lang.toUpperCase()} Tilida</p>
                      <input
                        type="text"
                        placeholder="Missiya sarlavhasi"
                        value={settings[`about_mission_title_${lang}`] !== undefined ? settings[`about_mission_title_${lang}`] : (settings.about_mission_title || '')}
                        onChange={(e) => setSettings({ ...settings, [`about_mission_title_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-amber-500/50 outline-none font-semibold text-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Asosiy matn"
                        value={settings[`about_mission_text1_${lang}`] !== undefined ? settings[`about_mission_text1_${lang}`] : (settings.about_mission_text1 || '')}
                        onChange={(e) => setSettings({ ...settings, [`about_mission_text1_${lang}`]: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-amber-500/50 outline-none font-semibold text-white resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">STATISTICS</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={num} className="bg-black/20 p-4 rounded-2xl border border-white/10 space-y-3 shadow-inner">
                        <input
                          type="text"
                          placeholder="Qiymat (masalan: 10,000+)"
                          value={settings[`stat${num}_value`] || ''}
                          onChange={(e) => setSettings({ ...settings, [`stat${num}_value`]: e.target.value })}
                          className="w-full bg-emerald-500/10 border-none p-1 rounded-lg outline-none text-xl font-black text-emerald-400 text-center"
                        />
                        {['uz', 'ru', 'en'].map(lang => (
                          <input
                            key={lang}
                            type="text"
                            placeholder={`Nomi (${lang.toUpperCase()})`}
                            value={settings[`stat${num}_label_${lang}`] !== undefined ? settings[`stat${num}_label_${lang}`] : (settings[`stat${num}_label`] || '')}
                            onChange={(e) => setSettings({ ...settings, [`stat${num}_label_${lang}`]: e.target.value })}
                            className="w-full bg-transparent border-none p-0 outline-none text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className={`${savingSettings ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 flex items-center gap-3`}
              >
                {savingSettings ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                {savingSettings ? 'Saqlanmoqda...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'foyda-kartalari' && (
        <div className="space-y-8 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-500/30">
                <Award className="text-emerald-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Afzalliklar (Benefit Cards)</h3>
                <p className="text-gray-400 font-medium">Bosh sahifada mijozlarga ko'rinadigan xizmat afzalliklari</p>
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Icon tanlash</label>
                    <select
                      value={benefitForm.icon}
                      onChange={(e) => setBenefitForm({ ...benefitForm, icon: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl focus:border-emerald-500/50 outline-none font-semibold text-white shadow-inner appearance-none cursor-pointer"
                    >
                      {BENEFIT_ICONS.map(ic => (
                        <option key={ic} value={ic} className="bg-gray-900">{ic.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {['uz', 'ru', 'en'].map(lang => (
                      <div key={lang} className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Sarlavha ({lang.toUpperCase()})</label>
                        <input
                          type="text"
                          value={benefitForm[`title_${lang}`] || ''}
                          onChange={(e) => setBenefitForm({ ...benefitForm, [`title_${lang}`]: e.target.value })}
                          className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-emerald-500/50 outline-none font-bold text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tartib raqami</label>
                    <input
                      type="number"
                      value={benefitForm.sort_order}
                      onChange={(e) => setBenefitForm({ ...benefitForm, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl focus:border-emerald-500/50 outline-none font-bold text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {['uz', 'ru', 'en'].map(lang => (
                      <div key={lang} className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tavsif ({lang.toUpperCase()})</label>
                        <textarea
                          rows={2}
                          value={benefitForm[`desc_${lang}`] || ''}
                          onChange={(e) => setBenefitForm({ ...benefitForm, [`desc_${lang}`]: e.target.value })}
                          className="w-full bg-black/20 border border-white/10 p-3 rounded-xl focus:border-emerald-500/50 outline-none font-medium resize-none text-sm text-gray-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                {editingBenefit && (
                  <button
                    onClick={() => {
                      setEditingBenefit(null)
                      setBenefitForm({ icon: 'truck', title_uz: '', title_ru: '', title_en: '', desc_uz: '', desc_ru: '', desc_en: '', sort_order: 0, is_active: true })
                    }}
                    className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                )}
                <button
                  onClick={handleSaveBenefit}
                  className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center gap-2"
                >
                  <Save size={16} />
                  {editingBenefit ? t('common.save') : t('common.add')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {siteBenefits.map(b => (
                <div key={b.id} className={`p-6 rounded-[2rem] border transition-all hover:shadow-2xl group relative overflow-hidden ${
                  b.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'
                }`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 border border-emerald-500/20 group-hover:border-emerald-400">
                      <Award size={24} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleBenefit(b.id, b.is_active)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-emerald-400 shadow-lg transition-all">
                        {b.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => handleEditBenefit(b)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-blue-400 shadow-lg transition-all">
                        <Palette size={16} />
                      </button>
                      <button onClick={() => handleDeleteBenefit(b.id)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-rose-400 shadow-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h5 className="text-lg font-black text-white mb-2 leading-tight">
                    {b[`title_${t('common.langCode')}`] || b.title_uz || b.title || 'No Title'}
                  </h5>
                  <p className="text-gray-400 text-sm font-medium line-clamp-2">
                    {b[`desc_${t('common.langCode')}`] || b.desc_uz || b.desc || ''}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">#{b.sort_order} order</span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${b.is_active ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {b.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'albom-rasmlari' && (
        <div className="space-y-8 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-purple-500/30">
                  <Image className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {t('website.tabs.albumImages')}
                  </h3>
                  <p className="text-gray-400 font-medium">Sayt galereyasi va bento-grid rasmlari</p>
                </div>
              </div>
              {albumImages.length > 0 && (
                <button onClick={handleDeleteAllAlbumImages} className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2">
                  <Trash2 size={16} /> Barchasini o'chirish
                </button>
              )}
            </div>

            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 mb-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Fayldan yuklash</span>
                    <div className={`w-full py-12 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                      uploadingAlbumImage ? 'bg-black/20 border-white/10' : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40'
                    }`}>
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleAlbumImageUpload} disabled={uploadingAlbumImage} />
                      <div className="p-4 bg-purple-500/20 text-purple-400 rounded-2xl"><Plus size={32} /></div>
                      <p className="font-black text-white">{uploadingAlbumImage ? 'Yuklanmoqda...' : 'Rasmlar tanlash'}</p>
                      <p className="text-xs text-purple-400/60 font-medium">Bir vaqtning o'zida ko'p rasm yuklash mumkin</p>
                    </div>
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tartib</label>
                      <input type="number" value={albumImageForm.sort_order} onChange={(e) => setAlbumImageForm({...albumImageForm, sort_order: parseInt(e.target.value) || 0})} className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500/50 transition-all font-bold text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Format</label>
                      <select value={albumImageForm.format || 'portrait'} onChange={(e) => setAlbumImageForm({...albumImageForm, format: e.target.value})} className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500/50 transition-all font-bold text-white appearance-none cursor-pointer">
                        <option value="portrait" className="bg-gray-900">Portrait</option>
                        <option value="square" className="bg-gray-900">Square</option>
                        <option value="landscape" className="bg-gray-900">Landscape</option>
                        <option value="large" className="bg-gray-900">Large Bento</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {['uz', 'ru', 'en'].map(lang => (
                    <div key={lang} className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sarlavha ({lang.toUpperCase()})</label>
                      <input type="text" value={albumImageForm[`title_${lang}`] || ''} onChange={(e) => setAlbumImageForm({...albumImageForm, [`title_${lang}`]: e.target.value})} className="w-full bg-black/20 border border-white/10 p-4 rounded-2xl outline-none focus:border-purple-500/50 transition-all font-bold text-white" />
                    </div>
                  ))}
                  <button onClick={handleSaveAlbumImage} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20 mt-4">
                    {editingAlbumImage ? t('common.save') : "Tanlanganlarni saqlash"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albumImages.map(img => (
                <div key={img.id} className="aspect-[4/5] rounded-[1.5rem] overflow-hidden relative group border border-white/10 shadow-lg transition-all hover:scale-[1.05] hover:border-purple-500/50">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4 backdrop-blur-sm">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest mb-2 line-clamp-1">{img.title_uz || img.title_ru}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteAlbumImage(img.id)} className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-lg">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => handleToggleAlbumImage(img.id, img.is_active)} className="p-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all shadow-lg">
                        {img.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {activeTab === 'kategoriyalar' && (
        <div className="space-y-6 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/30">
                <Layout className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Kategoriyalar</h3>
                <p className="text-gray-400 font-medium">Veb-saytdagi mahsulot bo'limlari</p>
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 mb-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {['uz', 'ru', 'en'].map(lang => (
                      <div key={lang} className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nomi ({lang.toUpperCase()})</label>
                        <input
                          type="text"
                          value={lang === 'uz' ? newCategory : lang === 'ru' ? newCategoryRu : newCategoryEn}
                          onChange={(e) => lang === 'uz' ? setNewCategory(e.target.value) : lang === 'ru' ? setNewCategoryRu(e.target.value) : setNewCategoryEn(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 p-3 rounded-xl outline-none font-bold text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <div className="w-20 h-20 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                      {categoryImage ? <img src={categoryImage} className="w-full h-full object-cover" /> : <Image className="text-gray-700" />}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Kategoriya rasmi</span>
                      <input type="file" className="hidden" onChange={handleCategoryImageUpload} />
                      <div className="py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase text-center hover:bg-blue-500/20 transition-all tracking-widest">
                        {uploadingCategory ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-4 h-full justify-end">
                  <button onClick={handleSaveCategory} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Save size={20} />
                    {editingCategoryId ? t('common.save') : "Kategoriya Qo'shish"}
                  </button>
                  {editingCategoryId && (
                    <button onClick={handleCancelEditCategory} className="w-full py-4 rounded-2xl bg-white/10 text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
                      Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="group relative">
                  <div className="aspect-square rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 shadow-lg transition-all group-hover:shadow-2xl group-hover:scale-[1.05] group-hover:border-blue-500/50">
                    <img src={cat.image_url || '/placeholder.png'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                      <h4 className="text-white font-black tracking-tight text-sm line-clamp-1">{cat.name_uz || cat.name}</h4>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => handleEditCategory(cat)} className="p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg text-blue-400 hover:bg-white/20 transition-all"><Palette size={16} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg text-rose-400 hover:bg-white/20 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sharhlar' && (
        <div className="space-y-8 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-8 md:p-12 border-b border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/30">
                <Star className="text-amber-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {t('website.tabs.reviews')}
                </h3>
                <p className="text-gray-400 font-medium">Mijozlar tomonidan qoldirilgan fikrlar</p>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map(review => (
                <div key={review.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 relative group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-1 mb-4 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <p className="text-gray-300 font-medium mb-4 italic">"{review.comment}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{review.customer_name}</span>
                    <button onClick={() => handleDeleteReview(review.id)} className="p-2 text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'obunalar' && (
        <div className="space-y-8 fade-in">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-8 md:p-12 border-b border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-gray-500/30">
                <Mail className="text-gray-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {t('website.tabs.subscriptions')}
                </h3>
                <p className="text-gray-400 font-medium">Yangiliklarga obuna bo'lgan foydalanuvchilar</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-8 py-6">{t('website.subscriptions.email')}</th>
                    <th className="px-8 py-6">{t('website.subscriptions.date')}</th>
                    <th className="px-8 py-6">{t('common.status')}</th>
                    <th className="px-8 py-6 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-8 py-6 font-black text-gray-200 group-hover:text-white">{sub.email}</td>
                      <td className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {sub.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => handleDeleteSubscription(sub.id)} className="p-2 text-rose-400 hover:bg-white/10 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}