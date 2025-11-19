# SMS Webhook Testing Guide

## Quick Test

Send a single test SMS:

```bash
cd backend
node test-sms.js "Need medical help at Koregaon Park urgently"
```

Send all predefined test messages:

```bash
cd backend
node test-sms.js
```

### Customizing the Simulator

You can override defaults via environment variables (either in `.env` or inline when running the script):

| Variable            | Description                                  | Default                 |
| ------------------- | -------------------------------------------- | ----------------------- |
| `SMS_TEST_URL`      | Base URL of the backend receiving `/api/sms` | `http://127.0.0.1:3000` |
| `SMS_TEST_FROM`     | Phone number the fake SMS originates from    | `+15555550123`          |
| `SMS_TEST_TO`       | Destination Twilio number                    | `+18005550123`          |
| `SMS_TEST_DELAY_MS` | Delay between batch messages                 | `500`                   |

Example with overrides:

```bash
SMS_TEST_URL=https://staging.example.com SMS_TEST_FROM=+14155551234 node test-sms.js
```

## Verify Results

### 1. Check Backend Response

The SMS simulator shows immediate feedback:

- ✅ Success: You'll see a TwiML response with a Report ID
- ❌ Error: Shows the error message

### 2. Verify in Database

```bash
# View all needs with coordinates (map-ready)
curl -s http://localhost:3000/api/needs/map | python -m json.tool

# View unverified tasks
curl -s http://localhost:3000/api/tasks/unverified | python -m json.tool

# View verified tasks
curl -s http://localhost:3000/api/tasks/verified | python -m json.tool
```

### 3. Check Dashboard

Open http://localhost:5173/dashboard to see:

- All incoming SMS reports in the sidebar
- Map pins showing exact locations (from OpenWeather geocoding)
- Real-time updates every 10 seconds

### 4. Test Volunteer Portal

Open http://localhost:5173/ to:

- See unverified tasks
- Click "Verify" to approve them
- Test offline mode (DevTools → Network → Offline)

## Test Custom Messages

### Single Message

```bash
node test-sms.js "Your custom message here"
```

### Examples by Location Pattern

```bash
# Pattern: "at [location]"
node test-sms.js "Need food at Aundh Circle"

# Pattern: "near [location]"
node test-sms.js "Stuck near Pune Railway Station"

# Pattern: "in [location]"
node test-sms.js "Medical emergency in Hadapsar"
```

## Test with Real Twilio

### Configure Twilio Webhook

1. Get your public URL (use ngrok or similar):

   ```bash
   npx localtunnel --port 3000
   ```

2. In Twilio Console, set webhook URL to:

   ```
   https://your-domain.com/api/sms
   ```

3. Send real SMS to your Twilio number

### Environment Variables Required

```env
# Backend .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
OPENWEATHER_API_KEY=your_api_key
GEOCODE_DEFAULT_REGION=Pune, India
MONGO_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_api_key
```

## Testing Workflow

### End-to-End Flow

1. **SMS arrives** → Webhook receives message
2. **Gemini AI** → Parses message, extracts need type, location, urgency
3. **OpenWeather API** → Geocodes location to lat/lon
4. **MongoDB** → Stores need with coordinates
5. **Dashboard** → Auto-refreshes, shows new pin on map
6. **Volunteer** → Sees task, clicks "Verify"
7. **Dashboard** → Pin turns green, now selectable for routing
8. **Manager** → Selects verified pins, clicks "Optimize Route"
9. **Backend** → Calculates TSP route
10. **Map** → Shows optimal path

### Test Each Component

#### 1. SMS Parsing (Gemini)

```bash
# Check what Gemini extracted
curl -s http://localhost:3000/api/needs/map | python -m json.tool | grep -A 3 "needType"
```

#### 2. Geocoding (OpenWeather)

```bash
# Verify coordinates are present
curl -s http://localhost:3000/api/needs/map | python -m json.tool | grep -E "(lat|lon)" | head -10
```

#### 3. Verification Flow

- Open volunteer portal: http://localhost:5173/
- Click "Verify" on a task
- Check dashboard to confirm pin color changed

#### 4. Route Optimization

- Open dashboard: http://localhost:5173/dashboard
- Click green verified pins
- Click "Optimize X Stops" button
- Verify blue route line appears

## Troubleshooting

### No coordinates in response

- Check `OPENWEATHER_API_KEY` is set in `.env`
- Verify API key is valid at https://openweathermap.org/api
- Check backend logs for geocoding errors

### SMS not processed

- Ensure backend is running: `npm run dev`
- Check MongoDB connection
- Verify Gemini API key is valid

### Dashboard not updating

- Check frontend dev server: `npm run dev` (in frontend folder)
- Verify proxy is working (should hit localhost:3000)
- Check browser console for errors

### Verification not working

- Ensure both backend and frontend are running
- Check IndexedDB in browser DevTools (Application tab)
- Verify `/api/tasks/verify` endpoint is accessible

## Performance Testing

Send bulk messages:

```bash
# Send 10 custom messages
for i in {1..10}; do
  node test-sms.js "Test message $i at location area $i"
  sleep 2
done
```

Monitor processing time in backend logs.
