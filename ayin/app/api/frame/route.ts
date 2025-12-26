import { NextRequest, NextResponse } from 'next/server';

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const data = await req.json();
  console.log(data);

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ayin</title>
        <meta property="og:title" content="Ayin" />
        <meta property="og:image" content="${process.env.NEXT_PUBLIC_URL}/icon.png" />
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content="${process.env.NEXT_PUBLIC_URL}/icon.png" />
        <meta name="fc:frame:button:1" content="Launch Ayin" />
        <meta name="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_URL}/api/frame" />
      </head>
      <body>
        <p>Ayin</p>
      </body>
    </html>
  `);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';
