import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { updateProfile, updatePassword, getMyProfile, uploadProfilePhoto } from '../../services/clientData'
import { useToast } from '../../components/Toast'
import { CropModal, getUploadWarning, MAX_SIZE_MB } from '../../components/CropModal'

export function SettingsPage() {
  const { session, updateUser } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('perfil')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [fileWarning, setFileWarning] = useState(null)
  const photoInputRef = useRef(null)
  const [formData, setFormData] = useState({ full_name: '', phone: '' })
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  useEffect(() => {
    const load = async () => {
      const p = await getMyProfile()
      setProfile(p)
      if (p) {
        setFormData({
          full_name: p.full_name || '',
          phone: p.phone || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const displayName = profile?.full_name || 'Usuario'
  const displayAvatar = profile?.avatar_url
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const { data, error: err } = await updateProfile(formData)
      setSaving(false)
      if (err) {
        setError(err.message)
      } else {
        setSuccess('Perfil actualizado correctamente')
        if (data) setProfile({ ...profile, ...data })
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {
      setSaving(false)
      setError('Error al guardar')
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (passwordData.new !== passwordData.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (passwordData.new.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSaving(true)
    try {
      const { error: err } = await updatePassword(passwordData.current, passwordData.new)
      setSaving(false)
      if (err) {
        setError(err.message)
      } else {
        setSuccess('Contraseña actualizada correctamente')
        setPasswordData({ current: '', new: '', confirm: '' })
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {
      setSaving(false)
      setError('Error al actualizar')
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const warning = getUploadWarning(file)
    if (warning) {
      setFileWarning(warning)
      setTimeout(() => setFileWarning(null), 4000)
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    setFileWarning(null)
    setPendingFile(file)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handlePhotoConfirm = async (croppedFile) => {
    setPendingFile(null)
    setUploadingPhoto(true)
    setError('')
    setSuccess('')
    try {
      const { url, error: err } = await uploadProfilePhoto(session.user.id, croppedFile)
      setUploadingPhoto(false)
      if (err) throw err
      setProfile(prev => ({ ...prev, avatar_url: url }))
      updateUser({ avatar_url: url })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      setUploadingPhoto(false)
      setError(err.message || 'Error al subir la foto')
    }
  }

  const handlePhotoCancel = () => {
    setPendingFile(null)
  }

  const removePhoto = async () => {
    if (!session?.user?.id) return
    setUploadingPhoto(true)
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', session.user.id)
      if (err) throw err
      setProfile(prev => ({ ...prev, avatar_url: null }))
      updateUser({ avatar_url: null })
      await supabase.storage.from('avatars').remove([`${session.user.id}.jpg`])
      toast.success('Foto eliminada')
    } catch {
      setError('Error al eliminar la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const inputClass = "w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 transition-all"

  if (loading) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div className="h-8 w-48 bg-dark-800 rounded animate-pulse" />
        <div className="h-12 bg-dark-800 rounded-xl animate-pulse" />
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-dark-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-dark-800 rounded animate-pulse" />
              <div className="h-4 w-56 bg-dark-800 rounded animate-pulse" />
              <div className="h-3 w-32 bg-dark-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-12 bg-dark-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-dark-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-dark-800 rounded-xl animate-pulse" />
            <div className="h-12 w-40 bg-dark-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Configuración</h1>

      <div className="flex gap-1 bg-dark-900/50 border border-dark-800 rounded-xl p-1">
        {[
          { key: 'perfil', label: 'Perfil', icon: 'person' },
          { key: 'seguridad', label: 'Seguridad', icon: 'lock' },
          { key: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-fizzia-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-rounded text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-fizzia-500/10 border border-fizzia-500/30 rounded-xl p-3 text-fizzia-400 text-sm text-center">
          {success}
        </div>
      )}

      {fileWarning && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm text-center">
          {fileWarning}
          <p className="text-yellow-400/70 text-xs mt-1">Máximo {MAX_SIZE_MB} MB · Formatos: JPG, PNG, WebP</p>
        </div>
      )}

      {pendingFile && (
        <CropModal
          imageFile={pendingFile}
          onConfirm={handlePhotoConfirm}
          onCancel={handlePhotoCancel}
        />
      )}

      {activeTab === 'perfil' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-fizzia-500/20 border-2 border-fizzia-500/40 flex items-center justify-center text-fizzia-400 text-2xl font-bold overflow-hidden">
                {displayAvatar ? (
                  <img key={displayAvatar} src={displayAvatar} alt="" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
                accept="image/*"
              />
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto || !!pendingFile}
                  className="cursor-pointer p-1.5 rounded-full text-white hover:text-fizzia-400 transition-colors disabled:opacity-50"
                  title="Cambiar foto"
                >
                  <span className="material-symbols-rounded text-base">photo_camera</span>
                </button>
                {displayAvatar && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={uploadingPhoto}
                    className="cursor-pointer p-1.5 rounded-full text-white hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Eliminar foto"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </button>
                )}
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-fizzia-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{displayName}</h3>
              <p className="text-dark-400 text-sm">{session?.user?.email}</p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !!pendingFile}
                className="text-fizzia-400 text-xs font-medium mt-1 hover:text-fizzia-300 transition-colors disabled:opacity-50"
              >
                Cambiar foto de perfil
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={inputClass}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
                placeholder="+52 55 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                value={session?.user?.email || ''}
                className={`${inputClass} opacity-60 cursor-not-allowed`}
                disabled
                title="El email no se puede cambiar"
              />
              <p className="text-dark-500 text-xs mt-1">El email no se puede cambiar</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer px-6 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="space-y-4">
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Cambiar contraseña</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="relative">
                <label className="block text-sm text-dark-300 mb-1.5">Contraseña actual</label>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className={`${inputClass} pr-12`}
                  placeholder="Tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  className="cursor-pointer absolute right-3 top-[38px] text-dark-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPasswords.current ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="relative">
                <label className="block text-sm text-dark-300 mb-1.5">Nueva contraseña</label>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className={`${inputClass} pr-12`}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  className="cursor-pointer absolute right-3 top-[38px] text-dark-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPasswords.new ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="relative">
                <label className="block text-sm text-dark-300 mb-1.5">Confirmar nueva contraseña</label>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className={`${inputClass} pr-12`}
                  placeholder="Repite la contraseña"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  className="cursor-pointer absolute right-3 top-[38px] text-dark-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer px-6 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 transition-all"
              >
                {saving ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>

          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">Cerrar sesión</h3>
            <p className="text-dark-400 text-sm mb-4">Cierra tu sesión en todos los dispositivos</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="cursor-pointer px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {activeTab === 'notificaciones' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Preferencias de notificación</h3>
          <p className="text-dark-400 text-sm">Las notificaciones por email se enviarán automáticamente cuando:</p>
          <ul className="mt-4 space-y-3">
            {[
              'Se actualice el estado de tu proyecto',
              'Se agregue un nuevo archivo a tu proyecto',
              'Recibas un mensaje del equipo',
              'Se genere una nueva factura',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="material-symbols-rounded text-fizzia-400 text-lg mt-0.5">check_circle</span>
                <span className="text-dark-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
