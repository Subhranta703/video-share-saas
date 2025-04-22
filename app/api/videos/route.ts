import {NextRequest , NextResponse} from "next/server"
import { PrismaClient } from "@prisma/client/extension"

const prisma = new PrismaClient()
export async function GET(request: NextRequest) {
    try {
        await prisma.video.findMany({
            oderBy:{createdAt: "desc"}
        })
        return NextResponse.json(videos)
    } catch (error) {
        return NextResponse.json({error: "fetching video"},
            {status: 500})
    }finally{
        await prisma.$disconnect()
    }
        
};