import { NextResponse } from 'next/server';
import { getAllSeries, addSeries } from '@/lib/store';
import { slugify } from '@/lib/parser';
import { Series } from '@/types/video';

export async function GET() {
  const series = getAllSeries();
  return NextResponse.json(series);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, thumbnail, channelName, categories } = body;

    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });
    }

    const newSeries: Series = {
      id: 'series-' + Date.now(),
      slug: slugify(title) + '-' + Math.floor(Math.random() * 1000),
      title,
      description: description || '',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      channelName: channelName || 'Admin Review',
      categories: categories && categories.length ? categories : ['Tu Tiên'],
      totalEpisodes: 0,
      featured: false,
      updatedAt: new Date().toISOString().split('T')[0],
      episodes: [],
    };

    const saved = addSeries(newSeries);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server khi thêm bộ phim' }, { status: 500 });
  }
}
