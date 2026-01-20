# Project Guide

## 📁 Project Structure

```
OpenCodeView/
├── backend/                    # Backend services
│   ├── types.ts            # TypeScript type definitions
│   ├── fileManager.ts      # File system management
│   ├── costCalculator.ts    # Cost calculation
│   ├── sessionAnalyzer.ts   # Session analysis
│   ├── routes.ts            # API route handlers
│   ├── websocket.ts         # WebSocket live monitoring
│   └── server.ts           # HTTP server
├── frontend/
│   ├── index.html            # Main page
│   └── assets/
│       ├── style.css          # Stylesheet
│       └── app.js            # Frontend logic
├── config/
│   └── models.json          # Model pricing configuration
├── package.json
├── tsconfig.json
├── README.md
├── CONFIG.md               # Configuration guide
├── CHANGELOG.md            # Version history
└── start.sh                # Quick start script
```

## 🌐 API Endpoints

### Session Management

| Endpoint | Method | Description | Parameters |
|---------|--------|-------------|------------|
| `/api/sessions` | GET | Get session list | `limit`, `offset` |
| `/api/sessions/recent` | GET | Get most recent session | - |
| `/api/sessions/:id` | GET | Get single session details | - |

### Analytics Data

| Endpoint | Method | Description | Parameters |
|---------|--------|-------------|------------|
| `/api/analytics` | GET | Get analytics data | `type`, `weekStart` |

Supported `type` values:
- `daily` - Daily statistics
- `weekly` - Weekly statistics
- `monthly` - Monthly statistics
- `models` - Model usage analysis
- `projects` - Project usage analysis

### Other

| Endpoint | Method | Description | Parameters |
|---------|--------|-------------|------------|
| `/api/summary` | GET | Get overall summary | - |
| `/api/validate` | GET | Validate OpenCode storage path | - |
| `/api/opencode` | GET | Get OpenCode information | - |

## 💰 Model Pricing Configuration

Model pricing is stored in `config/models.json`.

Add new model pricing example:

```json
{
  "claude-sonnet-4": {
    "input": 3.00,
    "output": 15.00,
    "cacheWrite": 0.50,
    "cacheRead": 0.05
  }
}
```

Price unit: **USD per million tokens**

## ⚙️ Configuration

### Environment Variables

```bash
# Server port (default: 3000)
PORT=8080 bun run start

# Custom OpenCode storage path
OPCODE_STORAGE_PATH=/custom/path bun run start
```

### Custom Storage Path

If your OpenCode storage path is not at the default location, modify `OPENCODE_STORAGE_PATH` in `backend/fileManager.ts`:

```typescript
const OPENCODE_STORAGE_PATH = "/your/custom/path";
```

## 📱 Features Guide

### Dashboard
- Total sessions and interactions count
- Total cost and token usage
- List of used models
- Date range overview

### Session List
- View all historical sessions
- Paginated browsing (10 per page by default)
- Click to view session details
- Token usage visualization breakdown

### Session Details
- Detailed session information (interactions, cost, duration, models used)
- Message history with pagination (10 messages per page)
- Each message displays role, timestamp, model, agent, tokens, cost
- PRT files displayed for each message
  - Shows list of PRT files associated with the message
  - Displays PRT file IDs
  - Shows count of PRT files

### Analysis Reports
- **Daily** - Daily usage statistics
- **Weekly** - Weekly usage statistics (configurable start day)
- **Monthly** - Monthly usage statistics
- **Models** - Usage costs by model
- **Projects** - Development costs by project

## 🎨 UI Features

- Responsive design (supports phone, tablet, desktop)
- Modern card-based layout
- Smooth animations and transitions
- Toast message notifications
- Loading state indicators
- Token usage visualization bars
- Dark mode friendly design

## 🔒 Security

- ✅ **Read-only access** - Does not modify original OpenCode data
- ✅ **File permissions** - Only writes to current directory
- ✅ **Type safety** - TypeScript compilation with strict checks
- ✅ **Error handling** - Comprehensive error capture and user feedback

## 🐛 Troubleshooting

### No Sessions Found

1. Check if OpenCode is installed
2. Verify if session data has been generated
3. Run `GET /api/validate` endpoint to verify path

### WebSocket Connection Failed

1. Verify server is running
2. Check browser console for error messages
3. Verify firewall settings
4. Refresh page and retry

### Inaccurate Cost Calculation

1. Check if `config/models.json` exists
2. Verify model IDs match configuration file
3. Update model pricing data
