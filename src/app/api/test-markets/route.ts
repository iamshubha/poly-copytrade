import { NextRequest, NextResponse } from "next/server";

// Use direct HTTP fetch as fallback since SDK has bundling issues in Next.js
export async function GET(req: NextRequest) {
  try {
    console.log('[TEST-MARKETS] Fetching markets via direct HTTP...');
    
    const response = await fetch('https://clob.polymarket.com/markets?next_cursor=MA==', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Disable caching to avoid 2MB limit error
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[TEST-MARKETS] Response:', {
      dataLength: data.data?.length || 0,
      nextCursor: data.next_cursor,
    });
    
    const markets = (data.data || []).slice(0, 5);
    
    return NextResponse.json({
      success: true,
      data: markets,
      count: markets.length,
    });
  } catch (error: any) {
    console.error('[TEST-MARKETS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
