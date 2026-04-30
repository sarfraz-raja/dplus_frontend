import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Edit3, Eye, EyeOff, KeyRound, Mail, Phone, Save, ShieldCheck, Trash2, User, UserCircle2 } from 'lucide-react';
import { SET_USER } from '../store/reducers/auth-reducer';
import AuthActions from '../store/actions/auth-actions';
import { isReadOnlyFrontendMode } from '../utils/url';
import { baseassetUrl } from '../utils/url';

const EMPTY_PROFILE = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  title: 'Admin',
  avatar: '',
};

const readUser = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('user') || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
};

const Profile = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPasswordLocked, setCurrentPasswordLocked] = useState(true);
  const [newPasswordLocked, setNewPasswordLocked] = useState(true);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const applyUserToForm = (user) => {
    if (!user || typeof user !== 'object') return;
    
    // Map backend field names to form
    const fullName = user?.fullName || user?.name || `${user?.firstName || user?.firstname || ''} ${user?.lastName || user?.lastname || ''}`.trim() || 'User';
    const displayFullName = (fullName && fullName !== 'undefined') ? fullName : 'User';
    
    setProfile({
      fullName: displayFullName,
      firstName: user?.firstName || user?.firstname || '',
      lastName: user?.lastName || user?.lastname || '',
      username: user?.username || 'user',
      email: user?.email || '',
      phone: user?.phone || '',
      title: user?.title || user?.role || user?.rolename || 'Admin',
      avatar: (user?.avatar && user?.avatar !== 'undefined' && user?.avatar !== 'null') ? user?.avatar : '',
    });
  };

  // Fetch profile from backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        // Try to fetch profile from backend API
        const result = await dispatch(AuthActions.fetchProfile());
        if (cancelled) return;
        
        if (result?.ok) {
          // Data was fetched and set in Redux/localStorage
          applyUserToForm(result.profile);
        } else {
          // Fallback: Try to read from localStorage
          applyUserToForm(readUser());
        }
      } catch (error) {
        console.warn("[Profile] Error fetching profile:", error);
        applyUserToForm(readUser());
      }
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const onProfileSync = () => applyUserToForm(readUser());
    window.addEventListener('dy3-profile-updated', onProfileSync);
    window.addEventListener('storage', onProfileSync);
    return () => {
      window.removeEventListener('dy3-profile-updated', onProfileSync);
      window.removeEventListener('storage', onProfileSync);
    };
  }, []);

  const handleChange = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  // Handle avatar upload directly to backend
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isReadOnlyFrontendMode) {
      setStatus('Read-only mode — avatar upload is disabled.');
      window.setTimeout(() => setStatus(''), 2800);
      return;
    }

    setUploadingAvatar(true);
    setStatus('Uploading avatar...');

    // Upload to backend (don't show preview - wait for URL from backend)
    const { ok, avatar } = await dispatch(AuthActions.uploadAvatar(file));
    
    if (ok && avatar) {
      setStatus('Avatar uploaded successfully!');
      // Update profile with actual URL from backend // 1. Update local component state
      setProfile((current) => ({ ...current, avatar }));

      // 2. Update LocalStorage so TopBar sees it immediately and after re-login
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, avatar: avatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 3. Optional: Trigger event for TopBar
      window.dispatchEvent(new Event('dy3-profile-updated'));
    } else {
      setStatus('Failed to upload avatar. Please try again.');
    }
        
    setUploadingAvatar(false);
    window.setTimeout(() => setStatus(''), 3500);
  };


  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    if (isReadOnlyFrontendMode) {
      setStatus('Read-only mode — avatar removal is disabled.');
      window.setTimeout(() => setStatus(''), 2800);
      return;
    }

    setSaving(true);
    setStatus('Removing avatar...');
    
    // Update backend with empty avatar
    const updated = { ...profile, avatar: '' };
    const { ok, serverSynced } = await dispatch(AuthActions.updateProfile(updated));

    if (ok && serverSynced) {
      setProfile((current) => ({ ...current, avatar: '' }));
      setStatus('Avatar removed successfully!');
    } else {
      setStatus('Failed to remove avatar. Please try again.');
    }

    setSaving(false);
    window.setTimeout(() => setStatus(''), 3500);
  };

  const handleSave = async () => {
    if (isReadOnlyFrontendMode) {
      setStatus('Read-only mode — changes are not saved.');
      window.setTimeout(() => setStatus(''), 2800);
      return;
    }

    if ((currentPassword || newPassword) && (!currentPassword || !newPassword)) {
      setStatus('Enter current and new password.');
      window.setTimeout(() => setStatus(''), 2800);
      return;
    }

    setSaving(true);
    setStatus('Saving changes...');
    
    const existing = readUser();
    
    // Parse full name into first and last name
    const fullNameTrimmed = profile.fullName.trim() || 'User';
    const nameParts = fullNameTrimmed.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const next = {
      ...existing,
      firstName: firstName,
      lastName: lastName,
      lastname: lastName,
      fullName: fullNameTrimmed,
      name: fullNameTrimmed,
      username: profile.username.trim() || existing?.username || 'admin',
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      title: profile.title || existing?.title || existing?.role || existing?.rolename || 'Admin',
      avatar: profile.avatar || existing?.avatar || '',
      ...(currentPassword && newPassword ? { currentPassword, newPassword } : {}),
    };

    const { ok, serverSynced, status: errStatus, message: errMessage } = await dispatch(AuthActions.updateProfile(next));

    if (ok && serverSynced) {
      setStatus(currentPassword ? 'Profile and password updated successfully.' : 'Profile saved successfully.');
    } else if (errStatus === 401) {
      setStatus('Current password is incorrect.');
    } else {
      setStatus(errMessage || 'Failed to save profile. Please try again.');
    }

    setCurrentPassword('');
    setNewPassword('');
    setSaving(false);
    window.setTimeout(() => setStatus(''), 4200);
  };

  const saveDisabled = saving || refreshing || uploadingAvatar || isReadOnlyFrontendMode;

  const sectionClass =
    'relative w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-lg sm:rounded-[28px] sm:p-6 lg:p-8 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(9,0,26,0.94)_0%,rgba(10,18,64,0.94)_50%,rgba(7,18,36,0.96)_100%)] dark:shadow-[0_24px_80px_rgba(3,8,24,0.45)]';

  const inputClass =
    'box-border w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#F26522]/45 sm:px-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25';

  const labelClass =
    'mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/45';

  return (
    <div className="h-full w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
      <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
        {/* Hero Section */}
        <section className={`${sectionClass} pt-5 sm:pt-6`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,101,34,0.08),transparent_22%),radial-gradient(circle_at_right,rgba(59,130,246,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(242,101,34,0.16),transparent_22%),radial-gradient(circle_at_right,rgba(59,130,246,0.18),transparent_28%)]" />
          <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#F26522]">Profile</p>
              <div className="mt-3 flex min-w-0 flex-row items-start gap-3 sm:items-center sm:gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-visible rounded-[16px] border border-[#F26522]/30 bg-gradient-to-br from-slate-100 to-slate-50 shadow-md sm:h-20 sm:w-20 sm:rounded-[18px] lg:h-28 lg:w-28 lg:rounded-[22px] dark:from-[#080F22] dark:to-[#0a1220] dark:shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar.startsWith('/uploads') ? `${baseassetUrl}${profile.avatar}` : profile.avatar}
                      alt={profile?.fullName || 'DataPlus User'}
                      className="h-full w-full rounded-[16px] object-cover sm:rounded-[18px] lg:rounded-[22px]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[16px] sm:rounded-[18px] lg:rounded-[22px]">
                      <UserCircle2 className="h-8 w-8 text-[#F26522]/70 sm:h-10 sm:w-10 lg:h-14 lg:w-14" />
                    </div>
                  )}

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadOnlyFrontendMode}
                    className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:bg-slate-300 hover:text-slate-900 disabled:opacity-40 sm:h-7 sm:w-7 dark:bg-[#081224] dark:text-white/90 dark:hover:bg-[#0d1730] dark:hover:text-white"
                    title="Edit profile image"
                  >
                    <Edit3 className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                  </button>

                  {/* Remove Button */}
                  {profile?.avatar && !isReadOnlyFrontendMode && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm transition-all hover:bg-red-200 hover:text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      title="Remove profile image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-lg font-extrabold leading-tight tracking-[0.02em] text-slate-900 sm:text-xl md:text-2xl lg:text-3xl dark:text-white">
                    {profile?.fullName || 'DataPlus User'}
                  </h1>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 sm:text-xs md:mt-2 md:text-sm dark:text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#F26522] sm:h-4 sm:w-4" />
                    <span className="break-words">{String(profile?.title || 'Admin').toUpperCase()}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-auto lg:max-w-[min(100%,20rem)] lg:items-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveDisabled}
                className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#F26522]/35 bg-[#F26522]/15 px-4 py-2.5 text-sm font-semibold text-[#F26522] transition-all hover:bg-[#F26522]/20 disabled:pointer-events-none disabled:opacity-45 sm:min-h-0 sm:w-auto sm:min-w-[160px] lg:min-w-[180px]"
              >
                <Save className="h-4 w-4 shrink-0" />
                {refreshing ? 'Loading…' : uploadingAvatar ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
              </button>
              {status ? (
                <p className="text-center text-xs leading-snug text-slate-500 sm:text-sm lg:max-w-xs lg:text-right dark:text-white/55">{status}</p>
              ) : null}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </section>

        {/* Account Settings */}
        <section className={sectionClass}>
          <div className="mb-5 min-w-0 sm:mb-6">
            <h2 className="text-base font-bold tracking-[0.02em] text-slate-900 sm:text-lg dark:text-white">Account Settings</h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
           <label className="block min-w-0">
              <span className={labelClass}><UserCircle2 className="h-4 w-4 text-[#F26522]" />Full Name</span>
              <input type="text" value={profile?.fullName || ''} onChange={(e) => handleChange('fullName', e.target.value)} className={inputClass} placeholder="Enter full name" />
            </label>

            <label className="block min-w-0">
              <span className={labelClass}><User className="h-4 w-4 text-[#F26522]" />Username</span>
              <input type="text" value={profile?.username || ''} onChange={(e) => handleChange('username', e.target.value)} className={inputClass} placeholder="Enter username" />
            </label>

            <label className="block min-w-0">
              <span className={labelClass}><Mail className="h-4 w-4 text-[#F26522]" />Email ID</span>
              <input type="email" value={profile?.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={inputClass} placeholder="Enter email address" />
            </label>

            <label className="block min-w-0">
              <span className={labelClass}><Phone className="h-4 w-4 text-[#F26522]" />Mobile Number</span>
              <input type="tel" value={profile?.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className={inputClass} placeholder="Enter phone number" />
            </label>

            <label className="block min-w-0">
              <span className={labelClass}><KeyRound className="h-4 w-4 text-[#F26522]" />Current Password</span>
              <div className="relative">
                <input type={showCurrentPassword ? 'text' : 'password'} readOnly={currentPasswordLocked} onFocus={() => setCurrentPasswordLocked(false)} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputClass} pr-11`} placeholder="Enter current password" />
                <button type="button" onClick={() => setShowCurrentPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#F26522] dark:text-white/35">{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>

            <label className="block min-w-0">
              <span className={labelClass}><KeyRound className="h-4 w-4 text-[#F26522]" />New Password</span>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} readOnly={newPasswordLocked} onFocus={() => setNewPasswordLocked(false)} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputClass} pr-11`} placeholder="Enter new password" />
                <button type="button" onClick={() => setShowNewPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#F26522] dark:text-white/35">{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
