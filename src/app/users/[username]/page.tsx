import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ProfilePageContent from '@/components/ProfilePageContent';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface UserProfileData {
  user_id: string;
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
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createServerComponentClient({ cookies });
  
  const decodedUsername = decodeURIComponent(params.username);
  const cleanUsername = decodedUsername.replace(/^@+/g, '').trim();

  if (!decodedUsername.startsWith('@')) {
    const encodedUsername = encodeURIComponent(cleanUsername);
    redirect(`/users/@${encodedUsername}`);
  }

  const { data: profileData, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (!profileData || error) {
    return (
      <div className="min-h-screen bg-gray-100 py-10 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Profile Not Found</h1>
        <p className="text-gray-600">@{cleanUsername} doesn't exist</p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  let fullProfile: UserProfileData = profileData;

  if (user?.id === profileData.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();
    if (userData) fullProfile.email = userData.email;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <ProfilePageContent 
        profile={fullProfile} 
        currentUser={user} 
      />
    </div>
  );
}