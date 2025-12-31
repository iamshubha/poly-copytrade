# Markets Section - Testing & Verification Guide

## Server Status
✅ Server running at: **http://localhost:3000**

## Routes to Test

### 1. Public Markets Page (No Auth Required)
**URL:** `http://localhost:3000/markets`

**What to check:**
- ✅ Page loads without requiring login
- ✅ Markets are displayed with images, titles, prices
- ✅ Total markets count shows "500" (not "0")
- ✅ Pagination controls at the bottom
- ✅ Filter buttons (All, Politics, Sports, Crypto, etc.)
- ✅ Sort controls (Volume, Liquidity, End Date)
- ✅ Search box works
- ✅ Live data indicator shows green checkmark or "Active"

### 2. Public Market Detail Page (No Auth Required)
**URL:** `http://localhost:3000/markets/{marketId}`

**Example:** Pick any market from the list and click on it

**What to check:**
- ✅ Market details display (title, description, image)
- ✅ Current prices for Yes/No
- ✅ Volume and liquidity stats
- ✅ "View on Polymarket" external link
- ✅ "Sign In to Trade" button (for non-auth users)
- ✅ Back button works

### 3. API Endpoint (Public)
**URL:** `http://localhost:3000/api/markets`

**Test in terminal:**
```bash
# Get first 5 markets
curl "http://localhost:3000/api/markets?limit=5" | jq '.data.data[].title'

# Test pagination
curl "http://localhost:3000/api/markets?limit=5&offset=10" | jq '.data.total, (.data.data | length)'

# Search
curl "http://localhost:3000/api/markets?search=trump&limit=3" | jq '.data.data[].title'
```

## Browser Console Checks

Open browser DevTools (F12) → Console tab and check for:

1. **Console logs should show:**
```
[Markets] Fetching with params: limit=20&offset=0&sortBy=volume&sortOrder=desc
[Markets] Response status: 200
[Markets] API Response: {success: true, hasData: true, ...}
[Markets] Component state: {marketsLength: 20, totalMarkets: 500, ...}
```

2. **Network tab should show:**
- Request to `/api/markets?limit=20&offset=0&sortBy=volume&sortOrder=desc`
- Status: 200 OK
- Response contains data array with 20 markets

## Known Issues & Solutions

### Issue 1: Page shows "Loading..." forever
**Solution:** 
- Check browser console for errors
- Verify API endpoint returns data: `curl http://localhost:3000/api/markets?limit=2`
- Clear browser cache and reload (Cmd+Shift+R / Ctrl+Shift+F5)

### Issue 2: Total Markets shows "0"
**Cause:** Frontend isn't parsing API response correctly

**Fix Applied:**
- Updated response parsing to handle nested structure: `json.data.data`
- Added console logging to debug
- Fixed React Query v5 syntax (`placeholderData` instead of `keepPreviousData`)

### Issue 3: Images not loading
**Check:**
- Network tab shows image requests
- CORS might be blocking (check console for CORS errors)
- Polymarket S3 bucket might have changed URLs

### Issue 4: Pagination not working
**Test:**
- Click "Next" button
- URL params should include `?offset=20`
- Different markets should load
- "Previous" button appears

## Live Data Verification

Markets should show **real trading volume**:

**Expected top markets (as of Dec 2024):**
1. "Russia x Ukraine ceasefire in 2025?" - ~$73M volume
2. "Will the Carolina Panthers win Super Bowl 2026?" - ~$53M volume
3. "Maduro out in 2025?" - ~$34M volume

If you see these titles with high volumes, **live data is working! ✅**

## UI Components Checklist

- [ ] Header with "📊 Polymarket Markets" logo
- [ ] "Sign In →" link in top right
- [ ] Stats cards showing Total/Page/Live Status
- [ ] Search input with magnifying glass icon
- [ ] Category filter pills
- [ ] Sort buttons (Volume, Liquidity, etc.)
- [ ] Markets grid (2-3 columns on desktop)
- [ ] Market cards with:
  - [ ] Market image
  - [ ] Title
  - [ ] Description (2 lines)
  - [ ] Volume ($Xk)
  - [ ] Liquidity ($Xk)
  - [ ] Yes/No prices (in cents)
  - [ ] End date
  - [ ] Category badge
- [ ] Pagination bar at bottom:
  - [ ] "Previous" button
  - [ ] Page numbers (1, 2, 3, 4, 5)
  - [ ] "Next" button
  - [ ] "Showing X - Y of Z markets" text

## Performance Checks

- **Initial load:** Should complete in < 3 seconds
- **Pagination:** Should load next page in < 1 second (data cached)
- **Search:** Should filter immediately (client-side)
- **Auto-refresh:** Should refetch every 30 seconds (check Network tab timestamp)

## Mobile Responsiveness

Test on mobile viewport (DevTools → Toggle device toolbar):

- [ ] Single column layout on mobile
- [ ] Touch-friendly buttons
- [ ] Readable text sizes
- [ ] Pagination controls stack vertically if needed

## Comparison: Old vs New

### Old Dashboard Markets (`/dashboard/markets`)
- ❌ Requires authentication
- ❌ Limited to 50 markets
- ❌ No pagination
- ❌ Hard-coded cursor
- ❌ Possibly stale data

### New Public Markets (`/markets`)
- ✅ Public access (no auth)
- ✅ Up to 500 markets
- ✅ Full pagination (20 per page)
- ✅ Live data from Gamma API
- ✅ Auto-refresh every 30s
- ✅ Better UI/UX

## Next Steps If Issues Persist

1. **Check server logs:**
```bash
tail -f /Users/shubhabanerjee/.cursor/projects/Users-shubhabanerjee-ai-trade-dex-copytrade/terminals/3.txt
```

2. **Test API directly:**
```bash
curl -v "http://localhost:3000/api/markets?limit=2" | jq '.'
```

3. **Restart server:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill
# Restart
cd /Users/shubhabanerjee/ai/trade/dex/copytrade && bun run dev
```

4. **Clear Next.js cache:**
```bash
rm -rf .next
bun run dev
```

## Success Criteria

✅ **All systems operational if:**
- Public `/markets` page loads without authentication
- Shows 500 total markets with real data
- Pagination works (click Next → different markets load)
- Market cards display with images, prices, volume
- Individual market detail pages load
- No console errors
- Live data with millions in volume

---

**Last Updated:** December 31, 2025 11:15 PM
**Status:** ✅ API Working | 🔄 Frontend Testing Required
**Server:** http://localhost:3000

