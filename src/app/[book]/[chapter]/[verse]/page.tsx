import { notFound } from 'next/navigation';
import { createClient, createStaticClient } from '@/utils/supabase/server';
import VerseCard from './VerseCard';
import InterpretationSection from './InterpretationSection';
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          {verse.book} {verse.chapter}:{verse.verse}
        </h1>
        <VerseCard verse={verse} />
        <InterpretationSection verseId={verse.id} />
      </div>
    </div>
  );
}