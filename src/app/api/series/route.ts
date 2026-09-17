import { NextResponse } from 'next/server';
import { getAllSeries, addSeries, updateSeries } from '@/lib/store';
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, categories, description } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Thiếu ID hoặc tiêu đề phim' }, { status: 400 });
    }

    const updated = updateSeries(id, {
      title: title.trim(),
      slug: slugify(title) + '-' + id.slice(-4),
      categories: categories || undefined,
      description: description || undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy bộ phim' }, { status: 404 });
    }

    return NextResponse.json({ success: true, series: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi khi sửa bộ phim: ' + error?.message }, { status: 500 });
  }
}
