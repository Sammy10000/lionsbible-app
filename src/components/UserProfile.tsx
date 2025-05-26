'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaTimes } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation';

export default function UserProfile() {
  const supabase = createClient();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ 
    username: string | null;
    avatar: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
        if (user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('username, avatar')
            .eq('user_id', user.id)
            .maybeSingle();
          setProfile(profileData);
        }
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsSignUp(true);
          setIsModalOpen(false);
          setEmail('');
          setPassword('');
          setUsername('');
        } else if (event === 'SIGNED_IN' && session?.user) {
          fetchUser();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUsernameUnique = async (inputUsername: string) => {
    try {
      const normalizedUsername = inputUsername.trim().toLowerCase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .ilike('username', normalizedUsername)
        .maybeSingle();
      if (error) {
        console.error('Error checking username:', error.message, error);
        toast.error('Error checking username availability. Please try again.', { className: 'Toastify' });
        return false;
      }
      return !data;
    } catch (err) {
      console.error('Unexpected error checking username:', err);
      toast.error('Unexpected error checking username. Please try again.', { className: 'Toastify' });
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username) {
      toast.error('Username is required.', { className: 'Toastify' });
      setLoading(false);
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const isUnique = await checkUsernameUnique(normalizedUsername);
    if (!isUnique) {
      toast.error('Username already taken.', { className: 'Toastify' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        console.error('Signup error:', error.message);
        toast.error(error.message, { className: 'Toastify' });
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: data.user.id,
            username: normalizedUsername,
            is_verified: false,
          }, {
            onConflict: 'user_id'
          });
        if (profileError) {
          toast.error(`Failed to set profile: ${profileError.message}`, { className: 'Toastify' });
          setLoading(false);
          return;
        }

        setEmail('');
        setPassword('');
        setUsername('');
        toast.success('Account created successfully! Please log in.', { className: 'Toastify' });
        setIsSignUp(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Unexpected signup error:', err);
      toast.error('Unexpected error during signup.', { className: 'Toastify' });
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message, { className: 'Toastify' });
      } else {
        setEmail('');
        setPassword('');
        toast.success('Logged in successfully!', { className: 'Toastify' });
        setIsModalOpen(false);
        if (profile?.username) {
          router.push(`/users/@${profile.username}`);
        }
      }
    } catch (err) {
      toast.error('Unexpected error during login.', { className: 'Toastify' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    if (user && profile?.username) {
      router.push(`/users/@${profile.username}`);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        title="Profile or sign in"
        aria-label="Profile or sign in"
        className="flex items-center space-x-3 lg:space-x-0 lg:justify-center text-gray-500 hover:text-teal-500 hover:bg-gray-100 lg:hover:bg-transparent p-2 rounded-md"
        onClick={handleProfileClick}
      >
        {profile?.avatar && !avatarError ? (
          <img
            src={profile.avatar}
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-500">
              {profile?.username ? profile.username.slice(0, 2).toUpperCase() : <FaUser className="w-6 h-6" />}
            </span>
          </div>
        )}
      </button>

      {isModalOpen && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 top-90">
          <div className="bg-white rounded-lg py-5 px-5 sm:p-6 w-[90%] max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="relative top-1 right-1 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <FaTimes className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-center">
                {isSignUp ? 'Sign Up' : 'Log In'}
              </h2>
              <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
                {isSignUp && (
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-gray-800 mb-1">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Username"
                      aria-describedby="username-help"
                    />
                    <p id="username-help" className="text-sm text-gray-800 mt-1">
                      Choose a unique username
                    </p>
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-800 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Email"
                    aria-describedby="email-help"
                  />
                  <p id="email-help" className="text-sm text-gray-800 mt-1">
                    Enter your email address
                  </p>
                </div>
                <div className="mb-6">
                  <label htmlFor="password" className="block text-gray-800 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Password"
                    aria-describedby="password-help"
                  />
                  <p id="password-help" className="text-sm text-gray-800 mt-1">
                    Enter your password
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#207788] border border-[#9CA3AF] text-white px-4 py-2 rounded-md hover:bg-teal-600 disabled:opacity-50"
                  aria-label={isSignUp ? 'Sign up' : 'Log in'}
                >
                  {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
                </button>
              </form>
              <p className="mt-4 text-center">
                {isSignUp ? 'Already have an account?' : 'Need an account?'}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 underline underline-offset-4"
                  aria-label={isSignUp ? 'Switch to login' : 'Switch to sign up'}
                >
                  {isSignUp ? 'Log In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="Toastify"
      />
    </>
  );
}