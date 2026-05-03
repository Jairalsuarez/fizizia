/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Button, Card, Icon, Skeleton } from '../../components/ui/'
import { getMyProfile, updateProfile } from '../../services/clientData'

export function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyProfile()
      setProfile(data)
      setFormData({
        full_name: data?.full_name || '',
        email: data?.email || '',
        phone: data?.phone || ''
      })
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadProfile()
  }, [])

  async function handleSaveProfile(e) {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await updateProfile(formData)
      setSuccess('Profile updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      return
    }
    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    try {
      setChangingPassword(true)
      setError(null)
      setSuccess(null)
      await updateProfile({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      setSuccess('Password updated successfully')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setShowPasswordSection(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <Card className="bg-dark-900 border-dark-700">
        <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Personal Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="bg-dark-900 border-dark-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Password</h2>
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
            >
              {showPasswordSection ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordSection && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-dark-300 text-sm font-medium mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-dark-300 text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-dark-300 text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card className="bg-dark-900 border-dark-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Contact Fizzia</h2>
          <p className="text-dark-300 text-sm mb-4">
            Need help or have questions? Reach out to us directly:
          </p>
          <a
            href="mailto:fizziadev@outlook.com"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-sm transition-colors"
          >
            <Icon name="mail" className="w-4 h-4" />
            <span>fizziadev@outlook.com</span>
          </a>
        </div>
      </Card>
    </div>
  )
}
