'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaPencilAlt } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

countries.registerLocale(en);

interface UserProfileData {
  username: string | null;
  profile_bio: string | null;
  avatar: string | null;
  full_name: string | null;
  country: string | null;
  faith_role: string | null;
  faith_affiliation: string | null;
  social_links: { [key: string]: string } | null;
  is_verified: boolean;
  email?: string | null;
  user_id: string;
}

interface ProfilePageContentProps {
  profile: UserProfileData;
  currentUser: any;
}

export default function ProfilePageContent({ profile: initialProfile, currentUser }: ProfilePageContentProps) {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<UserProfileData>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(0);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientUser, setClientUser] = useState(currentUser);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setClientUser(user || null);
      } catch (err) {
        setClientUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    if (!currentUser) {
      validateAuth();
    } else {
      setAuthChecked(true);
    }
  }, [supabase.auth, currentUser]);

  useEffect(() => {
    setAvatarTimestamp(Date.now());
  }, []);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout;

    const fetchCountry = async () => {
      if (!clientUser || profile.country || !authChecked || !mounted) return;
      
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), 5000);

      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const data = await response.json();
        if (mounted && data.country_code) {
          setDetectedCountry(data.country_code);
          setEditValues(prev => ({ ...prev, country: data.country_code }));
        }
      } catch {
        if (mounted) setDetectedCountry(null);
      }
    };

    fetchCountry();
    return () => {
      mounted = false;
      controller?.abort();
      clearTimeout(timeoutId);
    };
  }, [clientUser, profile.country, authChecked]);

  const countryList = Object.entries(countries.getNames('en', { select: 'official' }))
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode) return '';
    return countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
      .map(code => String.fromCodePoint(code))
      .join('');
  };

  const checkUsernameUnique = async (inputUsername: string) => {
    try {
      const cleanUsername = inputUsername.replace(/@/g, '').trim();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      return error ? false : !data;
    } catch (err) {
      toast.error('Error checking username');
      return false;
    }
  };

  const handleUpdateField = async (field: keyof UserProfileData) => {
    if (!authChecked || !clientUser?.id || !editValues[field]) return;
    setLoading(true);
    setError(null);

    try {
      if (field === 'username') {
        const cleanedUsername = (editValues.username || '').replace(/@/g, '').trim();
        const isUnique = await checkUsernameUnique(cleanedUsername);
        if (!isUnique) throw new Error('Username taken');
        
        const { error } = await supabase
          .from('user_profiles')
          .update({ username: cleanedUsername })
          .eq('user_id', clientUser.id);

        if (error) throw error;

        setProfile(prev => ({ ...prev, username: cleanedUsername }));
        router.push(`/users/@${encodeURIComponent(cleanedUsername)}`);
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .update({ [field]: editValues[field] })
          .eq('user_id', clientUser.id);

        if (error) throw error;

        setProfile(prev => ({ ...prev, [field]: editValues[field] }));
      }

      setEditingField(null);
      toast.success(`${field.replace('_', ' ')} updated`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSocialLinks = async () => {
    if (!authChecked || !clientUser?.id) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ social_links: editValues.social_links })
        .eq('user_id', clientUser.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, social_links: editValues.social_links }));
      setEditingField(null);
      toast.success('Social links updated');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!authChecked || !clientUser?.id || !avatarFile) {
      toast.error('Unauthorized action');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (avatarFile.size > 2 * 1024 * 1024) throw new Error('File exceeds 2MB limit');

      const fileName = `${clientUser.id}-${Date.now()}-${avatarFile.name
        .replace(/\s/g, '-')
        .replace(/[^a-zA-Z0-9-.]/g, '')}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { 
          cacheControl: '3600',
          contentType: avatarFile.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = await supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar: publicUrl })
        .eq('user_id', clientUser.id);

      if (updateError) throw updateError;

      const oldAvatar = profile.avatar?.split('/avatars/')[1]?.split('?')[0];
      if (oldAvatar && oldAvatar !== fileName) {
        await supabase.storage.from('avatars').remove([oldAvatar]);
      }

      setProfile(prev => ({ ...prev, avatar: publicUrl }));
      setAvatarTimestamp(Date.now());
      setAvatarFile(null);
      setEditingField(null);
      toast.success('Avatar updated');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!authChecked || !clientUser?.id) return;
    setLoading(true);
    setError(null);

    try {
      if (profile.avatar) {
        const fileName = profile.avatar.split('/avatars/')[1]?.split('?')[0];
        if (fileName) await supabase.storage.from('avatars').remove([fileName]);
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          username: null,
          profile_bio: null,
          avatar: null,
          full_name: null,
          country: null,
          faith_role: null,
          faith_affiliation: null,
          social_links: null,
          is_verified: false,
        })
        .eq('user_id', clientUser.id);

      if (profileError) throw profileError;

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: clientUser.id }),
      });

      if (!response.ok) throw new Error('Account deletion failed');

      await supabase.auth.signOut();
      router.push('/');
      toast.success('Account deleted');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/');
      toast.success('Signed out');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };  

  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="loader">
          <div className="wrapper">
            <div className="circle" />
            <div className="line-1" />
            <div className="line-2" />
            <div className="line-3" />
            <div className="line-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="text-center py-10">Profile not found</div>;

  const isOwnProfile = clientUser?.id === profile.user_id;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
    {isOwnProfile ? 'My Profile' : `@${profile.username}'s Profile`}
  </h1>

  <div className="flex flex-col items-center mb-4 sm:mb-6">
    {editingField === 'avatar' ? (
      <div className="text-center w-full max-w-xs">
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer w-full">
            <span className="inline-flex items-center justify-center px-4 py-2 bg-[#207788] text-white text-sm font-medium rounded-md hover:bg-teal-900 w-full">
              Choose Avatar
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          {avatarFile && (
            <span className="text-xs text-gray-600 truncate w-full text-center">
              {avatarFile.name}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2 mb-2">Max 2MB</p>
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleAvatarUpload}
            disabled={!avatarFile || loading}
            className="text-sm bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 disabled:opacity-50 w-full"
          >
            {loading ? 'Uploading...' : 'Save'}
          </button>
          <button
            onClick={() => setEditingField(null)}
            className="text-sm bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div className="relative group w-full max-w-[120px] sm:max-w-[160px]">
        {profile.avatar && !avatarLoadFailed ? (
          <img
            src={`${profile.avatar}${avatarTimestamp ? `?t=${avatarTimestamp}` : ''}`}
            alt="Avatar"
            className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full border-4 border-teal-500 mb-4 object-cover mx-auto"
            onError={() => setAvatarLoadFailed(true)}
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full border-4 border-[#207788] bg-gray-200 flex items-center justify-center mx-auto">
            <FaUser className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-500" />
          </div>
        )}
        {isOwnProfile && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingField('avatar')}
              className="text-white hover:text-teal-300 p-2"
            >
              <FaPencilAlt className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    )}
    {isOwnProfile && profile.email && (
      <p className="text-sm sm:text-base font-semibold text-gray-800 mt-4 px-4 break-words text-center max-w-full">
        {profile.email}
      </p>
    )}
    {profile.username && (
      <p className="text-sm sm:text-base font-semibold text-gray-800 mt-2 px-4 break-words text-center max-w-full">
        @{profile.username}
      </p>
    )}
  </div>

  {error && (
    <p className="text-red-500 mb-4 text-center text-xs sm:text-sm" role="alert">
      {error}
    </p>
  )}

  <div className="grid grid-cols-1 gap-3">
    {[
      { field: 'username', label: 'Username' },
      { field: 'full_name', label: 'Full Name' },
      { field: 'profile_bio', label: 'Bio', textarea: true, rows: 3 },
      { field: 'country', label: 'Country', select: countryList },
      { field: 'faith_role', label: 'Faith Role' },
      { field: 'faith_affiliation', label: 'Faith Affiliation' },
    ].map(({ field, label, textarea, select, rows }) => (
      <div key={field} className="flex flex-col p-3 bg-white rounded-md shadow-sm">
        {editingField === field ? (
          <div className="flex-1 w-full">
            {textarea ? (
              <textarea
                value={editValues[field] || ''}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-teal-500"
                rows={rows}
              />
            ) : select ? (
              <select
                value={editValues[field] || profile[field as keyof UserProfileData] || ''}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select {label}</option>
                {select.map(({ code, name }) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editValues[field] || ''}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-teal-500"
              />
            )}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => handleUpdateField(field as keyof UserProfileData)}
                className="bg-teal-500 text-white px-4 py-2 text-sm rounded-md hover:bg-teal-600"
              >
                Save
              </button>
              <button
                onClick={() => setEditingField(null)}
                className="bg-gray-300 px-4 py-2 text-sm rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <strong className="text-sm">{label}:</strong> {field === 'country' && profile.country ? (
                <span className="text-sm">
                  {`${getFlagEmoji(profile.country)} ${countries.getName(profile.country, 'en')}`}
                </span>
              ) : (
                <span className="text-sm">
                  {profile[field as keyof UserProfileData] || 'Empty'}
                </span>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setEditingField(field)}
                className="text-gray-500 hover:text-teal-500 ml-2"
              >
                <FaPencilAlt className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    ))}

    <div className="p-4 bg-white rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-sm">Social Links:</strong>
        {isOwnProfile && (
          <button
            onClick={() => setEditingField('social_links')}
            className="text-gray-500 hover:text-teal-500"
          >
            <FaPencilAlt className="w-4 h-4" />
          </button>
        )}
      </div>
      {editingField === 'social_links' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {['twitter', 'facebook', 'instagram', 'website'].map((platform) => (
              <div key={platform} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </label>
                <input
                  type="url"
                  value={editValues.social_links?.[platform] || ''}
                  onChange={(e) => setEditValues({
                    ...editValues,
                    social_links: {
                      ...editValues.social_links,
                      [platform]: e.target.value
                    }
                  })}
                  className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-teal-500"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpdateSocialLinks}
              className="bg-teal-500 text-white px-4 py-2 text-sm rounded-md hover:bg-teal-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditingField(null)}
              className="bg-gray-300 px-4 py-2 text-sm rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.social_links && Object.entries(profile.social_links).map(([platform, url]) => (
            url && (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            )
          ))}
        </div>
      )}
    </div>

    <div className="p-4 bg-white rounded-md shadow-sm">
      <strong className="text-sm">Verified:</strong> {profile.is_verified ? 'Yes' : 'No'}
    </div>
  </div>

  {isOwnProfile && (
    <div className="mt-6 flex flex-col gap-3">
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Signing Out...' : 'Sign Out'}
      </button>
      <button
        onClick={() => setIsDeleteConfirmOpen(true)}
        disabled={loading}
        className="bg-red-700 text-white px-4 py-2 text-sm rounded-md hover:bg-red-800 disabled:opacity-50"
      >
        Delete Account
      </button>
    </div>
  )}

  {isDeleteConfirmOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Confirm Account Deletion</h3>
        <p className="mb-4 text-sm">This action cannot be undone. All your data will be permanently removed.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsDeleteConfirmOpen(false)}
            className="bg-gray-300 px-4 py-2 text-sm rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}