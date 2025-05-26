import { notFound } from 'next/navigation';
import { createClient, createStaticClient } from '@/utils/supabase/server';
import VerseCard from './VerseCard';
import InterpretationSection from './InterpretationSection';
import InboundReferences from './InboundReferences'; // New component
import Navigation from './Navigation';
import VersePageClient from './VersePageClient';
import type { Metadata } from 'next';

interface Verse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  original_text: string;
  transliteration: string;
  verbatim_english: string;
  kjv: string;
}

interface UserProfile {
  user_id: string;
  username: string | null;
  avatar: string | null;
}

interface VersePageProps {
  params: { book: string; chapter: string; verse: string };
}

const bookSlugToName: { [key: string]: string } = {
  'song-of-songs': 'Song of Songs',
  'song-of-solomon': 'Song of Songs',
};

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: verses, error } = await supabase
    .from('verses')
    .select('book, chapter, verse');

  if (error) {
    console.error('Error fetching verses in generateStaticParams:', error);
    return [];
  }

  if (!verses || verses.length === 0) {
    console.warn('No verses found in verses table');
    return [];
  }

  return verses.map((v) => ({
    book: v.book.replace(/\s+/g, '-').toLowerCase(),
    chapter: v.chapter.toString(),
    verse: v.verse.toString(),
  }));
}

export async function generateMetadata({
  params,
}: VersePageProps): Promise<Metadata> {
  const supabase = createClient();
  const book = bookSlugToName[params.book.toLowerCase()] || 'Song of Songs';
  const chapter = parseInt(params.chapter, 10);
  const verseNum = parseInt(params.verse, 10);

  if (isNaN(chapter) || isNaN(verseNum)) {
    return {
      title: 'Verse Not Found - Lions Bible',
      description: 'A Progressive Web App for Bible study and community engagement on lionsbible.com.',
    };
  }

  const { data } = await supabase
    .from('verses')
    .select('kjv')
    .eq('book', book)
    .eq('chapter', chapter)
    .eq('verse', verseNum)
    .single();

  return {
    title: data
      ? `${book} ${chapter}:${verseNum} - Lions Bible`
      : 'Verse Not Found - Lions Bible',
    description: data
      ? `Read ${book} ${chapter}:${verseNum} from the King James Version: "${data.kjv}". Explore original Hebrew, transliteration, and community interpretations on Lions Bible.`
      : 'A Progressive Web App for Bible study and community engagement on lionsbible.com.',
  };
}

export default async function VersePage({ params }: VersePageProps) {
  const supabase = createClient();
  const book = bookSlugToName[params.book.toLowerCase()] || 'Song of Songs';
  const chapter = parseInt(params.chapter, 10);
  const verseNum = parseInt(params.verse, 10);

  console.log('Query parameters:', { rawBook: params.book, transformedBook: book, chapter, verseNum });

  if (isNaN(chapter) || isNaN(verseNum)) {
    console.error('Invalid chapter or verse number:', { chapter, verseNum });
    notFound();
  }

  // Fetch the current verse
  const { data: verse, error } = await supabase
    .from('verses')
    .select('*')
    .eq('book', book)
    .eq('chapter', chapter)
    .eq('verse', verseNum)
    .single();

  console.log('Supabase query result:', { verse, error });

  if (error || !verse) {
    console.error('Error fetching verse or verse not found:', { error, book, chapter, verseNum, params });
    notFound();
  }

  // Fetch the current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  let userProfile: UserProfile | null = null;
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, username, avatar')
      .eq('user_id', user.id)
      .single();
    if (profileError) {
      console.error('Error fetching user profile:', profileError.message);
    } else {
      userProfile = profile;
    }
  }

  // Fetch the previous verse
  const { data: prevVerse } = await supabase
    .from('verses')
    .select('book, chapter, verse')
    .eq('book', book)
    .or(`and(chapter.eq.${chapter},verse.eq.${verseNum - 1}),and(chapter.eq.${chapter - 1},verse.gte.1)`)
    .order('chapter', { ascending: false })
    .order('verse', { ascending: false })
    .limit(1)
    .single();

  // Fetch the next verse
  const { data: nextVerse } = await supabase
    .from('verses')
    .select('book, chapter, verse')
    .eq('book', book)
    .or(`and(chapter.eq.${chapter},verse.eq.${verseNum + 1}),and(chapter.eq.${chapter + 1},verse.eq.1)`)
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true })
    .limit(1)
    .single();

  return (
    <VersePageClient
      verse={verse}
      prevVerse={prevVerse}
      nextVerse={nextVerse}
      userProfile={userProfile}
      params={params}
    />
  );
}