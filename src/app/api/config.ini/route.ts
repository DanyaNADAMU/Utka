import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'xray', 'config.ini');
    const content = await fs.readFile(configPath, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to read xray/config.ini:', error);
    return new NextResponse('Error reading config.ini', { status: 500 });
  }
}
