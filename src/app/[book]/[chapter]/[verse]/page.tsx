// src/app/[book]/[chapter]/[verse]/page.tsx
import { notFound } from 'next/navigation';
import { createClient, createStaticClient } from '@/utils/supabase/server';
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
  params: Promise<{ book: string; chapter: string; verse: string }>;
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
    console.error('Error fetching verses:', error);
    return [];
  }

  if (!verses || verses.length === 0) {
    console.warn('No verses found');
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
  const { book: bookSlug, chapter, verse } = await params; // Await params
  const supabase = await createClient();
  const book = bookSlugToName[bookSlug.toLowerCase()] || 'Song of Songs';
  const chapterNum = parseInt(chapter, 10);
  const verseNum = parseInt(verse, 10);

  if (isNaN(chapterNum) || isNaN(verseNum)) {
    return {
      title: 'Verse Not Found - Lions Bible',
      description: 'A Progressive Web App for Bible study.',
    };
  }

  const { data } = await supabase
    .from('verses')
    .select('kjv')
    .eq('book', book)
    .eq('chapter', chapterNum)
    .eq('verse', verseNum)
    .single();

  return {
    title: data
      ? `${book} ${chapterNum}:${verseNum} - Lions Bible`
      : 'Verse Not Found - Lions Bible',
    description: data
      ? `Read ${book} ${chapterNum}:${verseNum}: "${data.kjv}".`
      : 'A Progressive Web App for Bible study.',
  };
}

export async function generateViewport() {
  return {
    themeColor: '#000000', // Moved from metadata
  };
}

export default async function VersePage({ params }: VersePageProps) {
  const { book: bookSlug, chapter, verse } = await params; // Await params
  const supabase = await createClient();
  const book = bookSlugToName[bookSlug.toLowerCase()] || 'Song of Songs';
  const chapterNum = parseInt(chapter, 10);
  const verseNum = parseInt(verse, 10);

  console.log('Query parameters:', { book, chapter: chapterNum, verse: verseNum });

  if (isNaN(chapterNum) || isNaN(verseNum)) {
    notFound();
  }

  const { data: verseData, error } = await supabase
    .from('verses')
    .select('*')
    .eq('book', book)
    .eq('chapter', chapterNum)
    .eq('verse', verseNum)
    .single();

  console.log('Supabase query result:', { verse: verseData, error });

  if (error || !verseData) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();
  let userProfile: UserProfile | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id, username, avatar')
      .eq('user_id', user.id)
      .single();
    userProfile = profile;
  }

  const { data: prevVerse } = await supabase
    .from('verses')
    .select('book, chapter, verse')
    .eq('book', book)
    .or(`and(chapter.eq.${chapterNum},verse.eq.${verseNum - 1}),and(chapter.eq.${chapterNum - 1},verse.gte.1)`)
    .order('chapter', { ascending: false })
    .order('verse', { ascending: false })
    .limit(1)
    .single();

  const { data: nextVerse } = await supabase
    .from('verses')
    .select('book, chapter, verse')
    .eq('book', book)
    .or(`and(chapter.eq.${chapterNum},verse.eq.${verseNum + 1}),and(chapter.eq.${chapterNum + 1},verse.eq.1)`)
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true })
    .limit(1)
    .single();

  return (
    <VersePageClient
      verse={verseData}
      prevVerse={prevVerse}
      nextVerse={nextVerse}
      userProfile={userProfile}
      params={{ book: bookSlug, chapter, verse }}
    />
  );
}