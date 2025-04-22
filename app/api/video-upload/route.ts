import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Cloudinary Configuration
cloudinary.config({ 
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json({ error: "Cloudinary credentials not found" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const originalSize = formData.get('originalSize') as string | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Invalid file input' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'video-uploads',
          transformation: [
            { quality: "auto", fetch_format: "mp4" }, // fixed typo here
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryUploadResult);
        }
      );
      uploadStream.end(buffer);
    });

    const video = await prisma.video.create({
      data: {
        title: title || '',
        description: description || '',
        publicId: result.public_id,
        originalSize: originalSize || '',
        compressedSize: String(result.bytes),
        duration: result.duration || 0,
        cloudinaryId: result.public_id,
        userId: userId, // ensure `userId` exists in your Prisma schema
      }
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error('Upload video failed:', error);
    return NextResponse.json({ error: 'Upload video failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
