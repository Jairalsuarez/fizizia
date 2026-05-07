import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { supabase } from '../../services/supabase'
import { getMyProfile, updatePassword, updateProfile } from '../../api/profilesApi'
import { useToast } from '../../components/Toast'
import { avatars } from '../../data/avatarOptions'
import { AvatarIcon } from '../../data/avatars.jsx'
import { appThemeOptions, useAppTheme } from '../../theme/appTheme'
import { readStoredValue, writeStoredValue } from '../../utils/persistedState'

const defaultNotifications = [
  'Se actualice el estado de un proyecto',
  'Recibas un mensaje del equipo',
  'Se registre un nuevo pago o factura',
]

export function AccountSettingsPage({
  fallbackName = 'Usuario',
  theme = 'fizzia',
  notifications = defaultNotifications,
}) {
  const { session, updateUser } = useAuth()
  const toast = useToast()
  const { theme: selectedTheme, palette, setTheme } = useAppTheme(theme)
  const [activeTab, setActiveTab] = useState(() => readStoredValue(`settings-tab-${theme}`, 'perfil', value => ['perfil', 'seguridad', 'tema', 'notificaciones'].includes(value)))
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [previewAvatarId, setPreviewAvatarId] = useState(null)
  const [formData, setFormData] = useState({ full_name: '', phone: '' })
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  useEffect(() => {
    writeStoredValue(`settings-tab-${theme}`, activeTab)
  }, [activeTab, theme])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const p = await getMyProfile()
      if (cancelled) return
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
    return () => { cancelled = true }
  }, [])

  const displayName = profile?.full_name || fallbackName
  const selectedAvatarId = profile?.avatar_id || '1'
  const inputClass = `w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none ${palette.focusBorder} transition-all`

  const flashSuccess = (message) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const { data, error: err } = await updateProfile(formData)
      if (err) {
        setError(err.message)
        return
      }
      if (data) {
        setProfile(prev => ({ ...prev, ...data }))
        updateUser(data)
      }
      flashSuccess('Perfil actualizado correctamente')
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (passwordData.new !== passwordData.confirm) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (passwordData.new.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }
    setSaving(true)
    try {
      const { error: err } = await updatePassword(passwordData.current, passwordData.new)
      if (err) {
        setError(err.message)
        return
      }
      setPasswordData({ current: '', new: '', confirm: '' })
      flashSuccess('Contrasena actualizada correctamente')
    } catch {
      setError('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAvatar = async (avatarId) => {
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ avatar_id: avatarId })
        .eq('id', session?.user?.id)
      if (err) throw err
      setProfile(prev => ({ ...prev, avatar_id: avatarId }))
      updateUser({ avatar_id: avatarId })
      toast.success('Avatar actualizado')
      setShowAvatarPicker(false)
      setPreviewAvatarId(null)
    } catch {
      toast.error('Error al actualizar avatar')
    }
  }

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
            </div>
          </div>
          <div className="space-y-4">
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
      <div>
        <h1 className="text-2xl font-bold text-white">Configuracion</h1>
        <p className="text-dark-400 text-sm mt-1">Gestiona tu perfil y preferencias</p>
      </div>

      <div className="flex gap-1 bg-dark-900/50 border border-dark-800 rounded-xl p-1">
        {[
          { key: 'perfil', label: 'Perfil', icon: 'person' },
          { key: 'seguridad', label: 'Seguridad', icon: 'lock' },
          { key: 'tema', label: 'Tema', icon: 'palette' },
          { key: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? palette.activeButton : 'text-dark-400 hover:text-white hover:bg-white/5'
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
        <div className={`${palette.notice} border rounded-xl p-3 text-sm text-center`}>
          {success}
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => { setShowAvatarPicker(true); setPreviewAvatarId(selectedAvatarId) }}
              className={`cursor-pointer w-20 h-20 rounded-full bg-white border-2 ${palette.border} flex items-center justify-center overflow-hidden transition-colors group relative`}
            >
              <AvatarIcon id={selectedAvatarId} size={80} />
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-rounded text-white text-xl">edit</span>
              </div>
            </button>
            <div>
              <h3 className="text-white font-semibold">{displayName}</h3>
              <p className="text-dark-400 text-sm">{session?.user?.email}</p>
              <button
                type="button"
                onClick={() => { setShowAvatarPicker(true); setPreviewAvatarId(selectedAvatarId) }}
                className={`${palette.text} ${palette.hoverText} text-xs font-medium mt-1 transition-colors`}
              >
                Cambiar avatar
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
              <label className="block text-sm text-dark-300 mb-1.5">Telefono</label>
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
              className={`cursor-pointer px-6 py-3 ${palette.bg} text-white font-semibold rounded-xl ${palette.hoverBg} disabled:opacity-50 transition-all`}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="space-y-4">
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Cambiar contrasena</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {[
                { key: 'current', label: 'Contrasena actual', placeholder: 'Tu contrasena actual' },
                { key: 'new', label: 'Nueva contrasena', placeholder: 'Minimo 6 caracteres' },
                { key: 'confirm', label: 'Confirmar nueva contrasena', placeholder: 'Repite la contrasena' },
              ].map(field => (
                <div className="relative" key={field.key}>
                  <label className="block text-sm text-dark-300 mb-1.5">{field.label}</label>
                  <input
                    type={showPasswords[field.key] ? 'text' : 'password'}
                    value={passwordData[field.key]}
                    onChange={(e) => setPasswordData({ ...passwordData, [field.key]: e.target.value })}
                    className={`${inputClass} pr-12`}
                    placeholder={field.placeholder}
                    minLength={field.key === 'current' ? undefined : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(p => ({ ...p, [field.key]: !p[field.key] }))}
                    className="cursor-pointer absolute right-3 top-[38px] text-dark-500 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-rounded text-xl">
                      {showPasswords[field.key] ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              ))}
              <button
                type="submit"
                disabled={saving}
                className={`cursor-pointer px-6 py-3 ${palette.bg} text-white font-semibold rounded-xl ${palette.hoverBg} disabled:opacity-50 transition-all`}
              >
                {saving ? 'Actualizando...' : 'Actualizar contrasena'}
              </button>
            </form>
          </div>

          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">Cerrar sesion</h3>
            <p className="text-dark-400 text-sm mb-4">Cierra tu sesion en todos los dispositivos</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="cursor-pointer px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition-all"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      )}

      {activeTab === 'tema' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Color del tema</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {appThemeOptions.map(option => {
              const isSelected = selectedTheme === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTheme(option.key)}
                  className={`cursor-pointer flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? `${option.borderStrong} ${option.activeBg}`
                      : 'border-dark-700 bg-dark-950/50 hover:border-dark-600'
                  }`}
                >
                  <span className={`h-8 w-8 rounded-full ${option.swatch} shadow-lg ${option.shadow}`} />
                  <span>
                    <span className="block text-sm font-medium text-white">{option.label}</span>
                    <span className="block text-xs text-dark-500">{isSelected ? 'Activo' : 'Disponible'}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'notificaciones' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Preferencias de notificacion</h3>
          <p className="text-dark-400 text-sm">Las notificaciones por email se enviaran automaticamente cuando:</p>
          <ul className="mt-4 space-y-3">
            {notifications.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`material-symbols-rounded ${palette.text} text-lg mt-0.5`}>check_circle</span>
                <span className="text-dark-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowAvatarPicker(false); setPreviewAvatarId(null) }}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Elige tu avatar</h3>
              <button onClick={() => { setShowAvatarPicker(false); setPreviewAvatarId(null) }} className="cursor-pointer text-dark-400 hover:text-white transition-colors">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="flex flex-col items-center py-8 bg-dark-950/50">
              <div className={`w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg ${palette.shadow}`}>
                <AvatarIcon id={previewAvatarId || selectedAvatarId} size={128} />
              </div>
              <p className="text-white font-medium mt-4 text-sm">
                {avatars.find(a => a.id === (previewAvatarId || selectedAvatarId))?.label}
              </p>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-4 gap-3">
                {avatars.map(av => (
                  <button
                    key={av.id}
                    onClick={() => setPreviewAvatarId(av.id)}
                    className={`cursor-pointer aspect-square rounded-full border-2 transition-all flex items-center justify-center overflow-hidden bg-white ${
                      previewAvatarId === av.id
                        ? `${palette.borderStrong} ring-2 ${palette.ring} scale-105`
                        : selectedAvatarId === av.id
                          ? palette.borderSoft
                          : 'border-dark-700 hover:border-dark-600'
                    }`}
                    title={av.label}
                  >
                    <AvatarIcon id={av.id} size={48} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-dark-700">
              <button
                onClick={() => handleSelectAvatar(previewAvatarId || selectedAvatarId)}
                className={`cursor-pointer w-full py-3 ${palette.bg} text-white font-semibold rounded-xl ${palette.hoverBg} transition-all`}
              >
                Usar este avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
