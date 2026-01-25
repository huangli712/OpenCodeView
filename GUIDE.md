# OpenCodeView User Guide

## Table of Contents

1. [Project Structure](#project-structure)
2. [Getting Started](#getting-started)
3. [API Endpoints](#api-endpoints)
4. [Configuration](#configuration)
5. [Features Guide](#features-guide)
6. [UI/UX Features](#uiux-features)
7. [Development](#development)
8. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
OpenCodeView/
├── backend/                        # Backend services
│   ├── cost.ts                    # Cost calculation logic
│   ├── sessions.ts                # Session analysis and statistics
│   ├── routes.ts                  # API route handlers
│   ├── fileutil.ts                # File system manager
│   ├── types.ts                   # TypeScript type definitions
│   └── server.ts                  # Bun HTTP server
├── frontend/
│   ├── index.html                 # Main HTML page
│   └── assets/
│       ├── app.js                 # Main application entry point
│       ├── api.js                 # API client with retry mechanism
│       ├── config.js              # Centralized configuration
│       ├── state.js               # Application state management
│       ├── style.css              # Stylesheet
│       ├── components/            # Reusable UI components
│       │   ├── charts.js          # Chart.js wrapper for data visualization
│       │   ├── pagination.js      # Pagination component
│       │   └── toasts.js          # Toast notification component
│       ├── utils/                 # Utility functions
│       │   ├── dom.js             # DOM helper functions
│       │   └── formatters.js      # Data formatting utilities
│       └── views/                 # View-specific logic
│           ├── about.js           # About/OpenCode info modal
│           ├── analytics.js       # Analytics view (daily/weekly/monthly/models/projects)
│           ├── dashboard.js       # Dashboard overview
│           └── sessions.js        # Session list and details view
├── config/
│   └── models.json                # Model pricing configuration
├── package.json
├── tsconfig.json
├── README.md
├── GUIDE.md                       # This file
├── CHANGELOG.md                   # Version history
└── start.sh                       # Quick start script
```

### Tech Stack

- **Backend**: Bun (JavaScript runtime)
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Visualization**: Chart.js (v4.4.1)
- **Language**: TypeScript

---

## Getting Started

### Prerequisites

- Node.js / Bun installed
- OpenCode CLI installed and configured
- OpenCode session data generated

### Installation

```bash
# Clone the repository
git clone https://github.com/huangli712/OpenCodeView.git
cd OpenCodeView

# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Or start production server
bun run start
```

### Quick Start Script

```bash
./start.sh
```

### Accessing the Application

Open your browser and navigate to: **http://localhost:3000**

---

## API Endpoints

### Rate Limiting

All API requests are rate-limited to **100 requests per minute per IP**.
- Exceeding the limit returns HTTP 429 with `Retry-After` header
- Maximum request body size: **10MB**
- IP detection uses `x-forwarded-for`, `x-real-ip`, or "unknown"

### Session Management

#### Get Session List
```
GET /api/sessions
```

**Query Parameters:**
- `limit` (number, optional): Number of sessions to return (default: 50, max: 1000)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "string",
      "projectName": "string",
      "startTime": number,
      "durationHours": number,
      "totalCost": number,
      "interactionCount": number,
      "modelsUsed": ["string"]
    }
  ],
  "summary": {
    "totalSessions": number,
    "totalInteractions": number,
    "totalCost": number,
    "totalTokens": {
      "input": number,
      "output": number,
      "cache_write": number,
      "cache_read": number,
      "total": number
    },
    "modelsUsed": ["string"]
  },
  "pagination": {
    "offset": number,
    "limit": number,
    "total": number,
    "hasMore": boolean
  }
}
```

#### Get Session Details
```
GET /api/sessions/:id
```

**Path Parameters:**
- `id`: Session ID

**Query Parameters:**
- `limit` (number, optional): Number of messages to return (default: 50, max: 1000)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "projectName": "string",
    "durationHours": number,
    "totalCost": number,
    "modelsUsed": ["string"],
    "interactionCount": number,
    "displayTitle": "string",
    "messages": [
      {
        "id": "string",
        "role": "user|assistant",
        "modelId": "string",
        "providerID": "string",
        "mode": "string",
        "agent": "string",
        "timestamp": number,
        "tokens": number,
        "cost": number,
        "title": "string",
        "fileCount": number,
        "diffCount": number,
        "prtFiles": [
          {
            "prtId": "string",
            "filePath": "string"
          }
        ]
      }
    ]
  },
  "pagination": {
    "offset": number,
    "limit": number,
    "total": number,
    "hasMore": boolean
  }
}
```

#### Get Most Recent Session
```
GET /api/sessions/recent
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "displayTitle": "string",
    "projectName": "string",
    "interactionCount": number,
    "totalTokens": number,
    "totalCost": number,
    "modelsUsed": ["string"],
    "durationHours": number,
    "burnRate": number,
    "activityStatus": "active|recent|idle|inactive"
  }
}
```

**Activity Status Values:**
- `active`: Session ended less than 1 minute ago
- `recent`: Session ended less than 5 minutes ago
- `idle`: Session ended less than 30 minutes ago
- `inactive`: Session ended more than 30 minutes ago
- `unknown`: Cannot determine (missing end time)

### Analytics Data

#### Get Analytics
```
GET /api/analytics
```

**Query Parameters:**
- `type` (string, required): Analytics type - `daily`, `weekly`, `monthly`, `models`, `projects`
- `weekStart` (number, optional): Day of week for weekly breakdown (0-6, default: 0)

**Response for Time-based (daily/weekly/monthly):**
```json
{
  "success": true,
  "type": "daily|weekly|monthly",
  "data": [
    {
      "date": "string",
      "sessions": number,
      "interactions": number,
      "tokens": number,
      "cost": number
    }
  ]
}
```

**Response for Models:**
```json
{
  "success": true,
  "type": "models",
  "data": [
    {
      "modelId": "string",
      "sessions": number,
      "interactions": number,
      "tokens": number,
      "cost": number
    }
  ]
}
```

**Response for Projects:**
```json
{
  "success": true,
  "type": "projects",
  "data": [
    {
      "projectName": "string",
      "sessions": number,
      "interactions": number,
      "tokens": number,
      "cost": number
    }
  ]
}
```

### System Information

#### Get Summary
```
GET /api/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": number,
    "totalInteractions": number,
    "totalCost": number,
    "totalTokens": number,
    "modelsUsed": ["string"],
    "dateRange": {
      "earliest": number,
      "latest": number
    }
  }
}
```

#### Validate Storage Path
```
GET /api/validate
```

**Response:**
```json
{
  "success": true,
  "valid": boolean,
  "path": "string",
  "hasSessions": boolean,
  "warnings": ["string"]
}
```

#### Get OpenCode Information
```
GET /api/opencode
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storagePath": "string",
    "configPath": "string",
    "homePath": "string",
    "hasOpenCode": boolean,
    "sessionCount": number,
    "version": "string",
    "mcp": {
      "path": "string",
      "exists": boolean,
      "servers": ["string"],
      "serverCount": number
    },
    "skills": {
      "path": "string",
      "exists": boolean,
      "count": number
    },
    "plugins": {
      "path": "string",
      "exists": boolean,
      "count": number
    },
    "config": {
      "path": "string",
      "jsonFiles": ["string"],
      "jsonFileCount": number
    }
  }
}
```

---

## Configuration

### Environment Variables

OpenCodeView can be configured using environment variables:

```bash
# Server port (default: 3000, range: 1-65535)
PORT=8080 bun run start

# Custom OpenCode storage path
OPCODE_STORAGE_PATH=/custom/path/to/opencode bun run start
```

### Cost Calculation System

**Initialization:**
- Pricing data loaded from `config/models.json` on server startup
- If pricing file is missing or invalid, cost calculations return 0
- Console warning displayed if initialization fails

**Cache Behavior:**
- Session costs cached after first calculation
- Maximum cache size: 1000 sessions
- Automatic eviction of oldest entries when cache is full
- Improves performance for repeated session queries

**Token Types Supported:**
- `input`: Input tokens from user/system prompts
- `output`: Output tokens generated by the model
- `cache_write`: Tokens written to cache
- `cache_read`: Tokens read from cache (cache hit)

**Missing Model Pricing:**
- If a model ID is not found in pricing configuration, cost is calculated as 0
- Warning logged for unknown models
- Ensure all used models are defined in `config/models.json`

### Model Pricing Configuration

Model pricing data is stored in `config/models.json`. This file defines the cost per million tokens for different models.

**Format:**
```json
{
  "model-id": {
    "input": 3.00,
    "output": 15.00,
    "cacheWrite": 0.50,
    "cacheRead": 0.05
  }
}
```

**Pricing Fields:**
- `input`: Input token cost (USD per million tokens)
- `output`: Output token cost (USD per million tokens)
- `cacheWrite`: Cache write cost (USD per million tokens, optional)
- `cacheRead`: Cache read cost (USD per million tokens, optional)

**Cost Calculation:**
```
Cost = (input_tokens / 1,000,000) * input_price +
       (output_tokens / 1,000,000) * output_price +
       (cache_write_tokens / 1,000,000) * cache_write_price +
       (cache_read_tokens / 1,000,000) * cache_read_price
```

**Performance Optimization:**
- Session costs are cached (max 1000 entries)
- Cache automatically evicts oldest entries when full
- Reduces redundant calculations for repeated session queries

**Adding a New Model:**
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

### Storage Path Detection

OpenCodeView automatically searches for OpenCode storage in these locations (in order):

1. `~/.local/share/opencode/storage/message`
2. `~/.opencode/storage/message`
3. `~/.config/opencode/storage/message`

If your OpenCode uses a different location, set the `OPCODE_STORAGE_PATH` environment variable:

```bash
OPCODE_STORAGE_PATH=/custom/path/to/opencode bun run start
```

**OpenCode Configuration Paths Detected:**
- Home directory: User's home directory
- Storage path: Message storage location
- Config path: Configuration directory
- MCP path: `~/.config/opencode/mcp` (if exists)
- Skills path: `~/.config/opencode/skills` (if exists)
- Plugins path: `~/.config/opencode/plugins` (if exists)

**Version Detection:**
1. Attempts to run `opencode --version` CLI command
2. Fallback to reading `package.json` from:
   - `~/.config/opencode/package.json`
   - `~/.local/share/opencode/package.json`

### Frontend Configuration

Frontend configuration is in `frontend/assets/config.js`:

```javascript
export const config = {
  // Environment detection
  isDev: typeof window !== 'undefined' && window.location.hostname === 'localhost',

  // Pagination settings
  pagination: {
    defaultLimit: 10
  },

  // Chart configuration
  charts: {
    exponentialThreshold: 10000,
    defaultType: "bar",
    colors: {
      cost: "rgba(59, 130, 246, 0.8)",
      tokens: "rgba(16, 185, 129, 0.8)",
      sessions: "rgba(245, 158, 11, 0.8)",
      interactions: "rgba(139, 92, 246, 0.8)",
      grid: "rgba(0, 0, 0, 0.05)"
    },
    labels: {
      cost: "Cost ($)",
      tokens: "Tokens",
      sessions: "Sessions",
      interactions: "Interactions"
    },
    titles: {
      time: {
        cost: "Cost Over Time",
        tokens: "Tokens Over Time",
        sessions: "Sessions Over Time",
        interactions: "Interactions Over Time"
      },
      models: {
        cost: "Cost by Model",
        tokens: "Tokens by Model",
        sessions: "Sessions by Model",
        interactions: "Interactions by Model"
      },
      projects: {
        cost: "Cost by Project",
        tokens: "Tokens by Project",
        sessions: "Sessions by Project",
        interactions: "Interactions by Project"
      }
    },
    style: {
      borderWidth: 1,
      borderRadius: 4,
      titleFont: { size: 16, weight: "600" },
      alphaOpaque: "1"
    }
  },

  // API client settings
  api: {
    baseUrl: "/api",
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  },

  // UI settings
  ui: {
    toastDuration: 5000,
    updateInterval: 1000
  },

  // Display settings
  display: {
    maxIdLength: 50,
    maxTypeLength: 50,
    defaultLocale: "en-US"
  }
};
```

### Server Configuration

Backend server configuration (in `backend/server.ts`):

- **Default Port**: 3000
- **Port Range**: 1-65535
- **Max Request Size**: 10MB
- **Rate Limit**: 100 requests per minute per IP
- **Rate Limit Window**: 60 seconds

**Environment Variables:**

```bash
# Server port (default: 3000)
PORT=8080 bun run start

# Custom OpenCode storage path
OPCODE_STORAGE_PATH=/custom/path/to/opencode bun run start
```

---

## Features Guide

### Dashboard

The Dashboard provides an at-a-glance overview of your OpenCode usage:

- **Summary Cards**: Total sessions, interactions, cost, and token usage
- **Date Range**: Shows the time period covered by your sessions
- **Models Used**: List of all AI models you've interacted with
- **Activity Status**: Visual indicator of recent activity

### Session List

Browse through all your historical OpenCode sessions:

- **Paginated Browsing**: Sessions displayed 10 per page with Previous/Next navigation
- **Session Cards**: Each card shows:
  - Session title/ID
  - Project name
  - Start time
  - Duration
  - Token usage with visual breakdown
  - Cost
- **Click to View**: Click any session to view detailed information
- **Token Visualization**: Color-coded bars showing input (green), output (blue), and cache (orange) tokens

### Session Details

Comprehensive view of individual session data:

- **Session Info**: Duration, total cost, interaction count, models used
- **Message History**: Paginated list of all messages in the session (10 per page)
- **Message Details**:
  - Role (user/assistant)
  - Full message ID
  - Timestamp (YYYY/MM/DD HH:mm:ss format)
  - Model ID
  - Provider ID
  - Mode
  - Agent (if applicable)
  - Token usage (input, output, cache write, cache read)
  - Cost
  - User message summary: Title, file count, diff count
- **PRT Files**: Shows associated Prompt/Response/Tool files for each message
  - PRT file IDs with types (prompt, response, tool)
  - Clickable PRT types to view full file content in modal
  - PRT file count per message
  - Raw JSON display of PRT data

### Analytics Reports

#### Daily Analysis
- Daily breakdown of usage statistics
- Track day-by-day patterns
- Charts: Cost, Tokens, Sessions, Interactions over time

#### Weekly Analysis
- Weekly breakdown with customizable start day (Sunday = 0, Saturday = 6)
- Identify weekly trends and patterns
- Charts: Cost, Tokens, Sessions, Interactions over time

#### Monthly Analysis
- Monthly usage statistics
- Long-term trend analysis
- Charts: Cost, Tokens, Sessions, Interactions over time

#### Models Analysis
- Cost breakdown by AI model
- Token usage per model
- Session count per model
- Interaction count per model
- Charts: Cost, Tokens, Sessions, Interactions by model

#### Projects Analysis
- Development costs by project
- Token usage per project
- Session count per project
- Interaction count per project
- Charts: Cost, Tokens, Sessions, Interactions by project

### Charts and Visualization

All analytics views include interactive charts powered by Chart.js:

- **Cost Charts**: Monetary cost over time or by category
- **Tokens Charts**: Token usage with scientific notation for large values (≥10,000)
- **Sessions Charts**: Session counts (integer y-axis values)
- **Interactions Charts**: Interaction counts (integer y-axis values)

**Chart Types:**
- **Time-based Analytics** (Daily, Weekly, Monthly):
  - Cost Over Time
  - Tokens Over Time
  - Sessions Over Time
  - Interactions Over Time

- **Model Analytics**:
  - Cost by Model
  - Tokens by Model
  - Sessions by Model
  - Interactions by Model

- **Project Analytics**:
  - Cost by Project
  - Tokens by Project
  - Sessions by Project
  - Interactions by Project

**Chart Features:**
- Responsive sizing
- Color-coded metrics (blue: cost, green: tokens, orange: sessions, purple: interactions)
- Customizable chart options (bar by default)
- Hover tooltips for detailed data
- Automatic scientific notation for large token values

### PRT (Prompt/Response/Tool) File Viewer

View detailed PRT file data for each message:

- **PRT Types**: Prompt, Response, Tool
- **Clickable Display**: Click any PRT type in message details to view full content
- **Modal Display**: PRT content shown in modal with JSON formatting
- **Raw Data**: Full JSON structure including:
  - PRT ID and type
  - Text content (if available)
  - Time data (start, end timestamps)
  - Associated message ID and session ID

---

## UI/UX Features

### Responsive Design

Optimized for all screen sizes:

- **Desktop**: Full-featured layout with side-by-side panels
- **Tablet**: Adjusted layouts with touch-friendly elements
- **Mobile**: Stack-based layouts with simplified navigation

### Visual Design

- **Modern Card-Based Layout**: Information organized in clean, distinct cards
- **Color-Coded Data**:
  - Success green for positive metrics
  - Primary blue for main actions
  - Warning orange for cache data
  - Red for errors
- **Smooth Animations**: Transitions and hover effects for better UX
- **Dark Mode Friendly**: High contrast colors work well in dark mode

### User Feedback

- **Toast Notifications**: Non-intrusive success/error messages (5 second duration)
- **Loading States**: Visual indicators during data fetching
- **Error Handling**: Clear error messages with helpful guidance
  - Development mode: Detailed error messages with status codes
  - Production mode: Generic error messages
- **Hover Effects**: Interactive feedback on clickable elements
- **Retry Logic**: Automatic retry for transient errors (network issues, server errors)

### State Management

The frontend uses a centralized state management system:

- **Current Tab**: Tracks active view (dashboard, sessions, daily, weekly, monthly, models, projects)
- **Pagination State**: Manages list pagination (offset, limit, hasMore)
- **Session Pagination**: Separate pagination for message lists within sessions
- **Current Session ID**: Tracks currently viewed session
- **State Persistence**: Maintains state across navigation

### Error Handling

**API Error Types:**
- `TIMEOUT`: Request exceeded 30 second timeout
- `NETWORK_ERROR`: Failed to connect to server
- `HTTP_ERROR`: HTTP status errors (4xx, 5xx)
- `API_ERROR`: API returned success=false
- `UNKNOWN`: Other unexpected errors

**Automatic Retry:**
- Retryable statuses: 408 (timeout), 429 (rate limit), 500, 502, 503, 504
- Max retries: 3 attempts
- Exponential backoff: Retry delay increases with each attempt

### Accessibility

- **Semantic HTML**: Proper use of semantic elements
- **High Contrast**: WCAG compliant color contrast
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Friendly**: Proper ARIA labels and roles

---

## Development

### Project Scripts

```bash
# Development mode with hot reload
bun run dev

# Production server
bun run start

# Build frontend assets
bun run build
```

### Backend Architecture

**File Organization:**

- **cost.ts**: CostCalculator class for computing costs based on token usage and model pricing
  - Pricing data loaded from `config/models.json`
  - Supports: input, output, cache_write, cache_read pricing
  - Cost caching for performance (max 1000 entries)
  - Pricing is per 1M tokens
- **sessions.ts**: Sessions class for session analysis and statistics generation
  - Token aggregation (input, output, cache write, cache read)
  - Duration calculation in hours
  - Activity status determination (active/recent/idle/inactive)
  - Project name extraction from paths
  - Models used tracking
  - Burn rate calculation (cost per hour)
  - Analytics breakdowns: daily, weekly, monthly, models, projects
- **routes.ts**: API endpoint handlers
  - Session list with pagination and summary
  - Session details with message pagination and PRT files
  - Most recent session with activity status
  - Analytics endpoints (5 types)
  - Summary statistics
  - Validation and OpenCode info
- **fileutil.ts**: FileManager and utility functions
  - OpenCode storage path detection
  - Session loading and parsing
  - PRT (Prompt/Response/Tool) file handling
  - Pricing configuration loading
  - OpenCode installation detection
- **types.ts**: TypeScript type definitions for all data structures
  - Token usage, time data, model data
  - Session data, interaction files, message info
  - Analytics breakdowns (daily, weekly, monthly, models, projects)
  - PRT data and info
  - OpenCode installation info
- **server.ts**: Bun HTTP server with API routing
  - Static file serving
  - Rate limiting (100 req/min per IP)
  - Request size limit (10MB)
  - API routing
  - Graceful shutdown on SIGINT/SIGTERM

**Key Classes:**

- `FileManager`: Handles file system operations, session loading, PRT file access
- `Sessions`: Analyzes session data, calculates statistics, generates breakdowns
- `CostCalculator`: Computes costs based on token usage and model pricing with caching

### Frontend Architecture

**Modular Design (v0.6.0+):**

The frontend is organized into focused modules:

- **app.js**: Main application entry point (390 lines, OpenCodeView class)
  - Tab-based navigation with hash routing
  - Event listener management with cleanup
  - Session list and details loading
  - Pagination handling for both sessions and messages
  - PRT file modal display
  - About modal setup
  - Memory leak prevention with tracked handlers

- **api.js**: Centralized API client (API class)
  - Request/response handling with timeout (30s default)
  - Automatic retry mechanism (max 3 retries)
  - Retryable statuses: 408, 429, 500, 502, 503, 504
  - Environment-aware error messages
  - Methods: getSummary(), getSessions(), getSession(), getAnalytics(), getOpenCodeInfo()

- **config.js**: Frontend configuration
  - Environment detection (localhost = dev mode)
  - Pagination, charts, API, UI, and display settings
  - Centralized configuration management

- **state.js**: Application state management (AppState class)
  - Current tab tracking
  - Pagination state (list and message)
  - Current session ID tracking

- **components/**: Reusable UI components
  - `charts.js`: Chart.js wrapper for data visualization
    - Supports cost, tokens, sessions, interactions
    - Scientific notation for large values (≥10,000)
    - Integer y-axis for session/interaction counts
    - Multiple chart types: time-based, models, projects
  - `pagination.js`: Pagination component
  - `toasts.js`: Toast notification component

- **utils/**: Utility functions
  - `dom.js`: DOM helper functions (showLoading, hideLoading, createElement, etc.)
  - `formatters.js`: Data formatting (currency, tokens, dates)

- **views/**: View-specific logic
  - `dashboard.js`: Dashboard overview
  - `sessions.js`: Session list and details with PRT files
  - `analytics.js`: Analytics views (daily/weekly/monthly/models/projects)
  - `about.js`: About/OpenCode info modal

**Key Features:**

- Event-driven architecture with proper cleanup
- Memory leak prevention (tracked event handlers)
- Environment-based error messages (detailed in dev, generic in production)
- State management with reactive updates
- Tab-based navigation with hash routing
- Dual pagination (sessions list and message list)
- PRT (Prompt/Response/Tool) file support
- Modal system for About and PRT details

### Adding Features

**Backend:**

1. Define types in `types.ts`
2. Implement logic in appropriate module (e.g., `sessions.ts`)
3. Add route handler in `routes.ts`
4. Update `server.ts` if needed

**Frontend:**

1. Create component in `components/` or view in `views/`
2. Import and use in `app.js`
3. Add API methods in `api.js` if needed
4. Update `config.js` if new configuration needed
5. Add styles to `style.css`
6. Register event handlers with proper cleanup in `app.js`

**API Integration:**

- Use the `API` class methods for all backend communication
- Automatic retry logic handles transient errors
- Error messages are environment-aware
- All methods return promises with standardized response format:
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

**Adding New API Endpoint:**

1. Define types in `backend/types.ts`
2. Implement logic in appropriate module (e.g., `sessions.ts`)
3. Add route handler in `backend/routes.ts`
4. Add API method in `frontend/assets/api.js`
5. Use the new method in views/components as needed

### Testing

```bash
# Run backend tests (if available)
bun test

# Manual testing
bun run dev
# Open http://localhost:3000
```

---

## Troubleshooting

### No Sessions Found

**Symptoms:** Dashboard shows "No sessions found"

**Solutions:**

1. **Check OpenCode Installation**
   ```bash
   opencode --version
   ```

2. **Verify Session Data Exists**
   ```bash
   # Check default storage paths
   ls ~/.local/share/opencode/storage/message
   ls ~/.opencode/storage/message
   ls ~/.config/opencode/storage/message
   ```

3. **Validate Storage Path**
   - Visit http://localhost:3000
   - Click "About OpenCode" button
   - Check if path is valid and sessions exist

4. **Set Custom Path** (if needed)
   ```bash
   OPCODE_STORAGE_PATH=/your/custom/path bun run start
   ```

### Inaccurate Cost Calculation

**Symptoms:** Costs shown don't match expected values

**Solutions:**

1. **Check models.json**
   ```bash
   cat config/models.json
   ```

2. **Verify Model IDs Match**
   - Ensure model IDs in `config/models.json` match your OpenCode usage
   - Check `modelsUsed` field in session details

3. **Update Model Pricing**
   - Edit `config/models.json` with current pricing
   - Restart server: `bun run start`

4. **Check Token Breakdown**
   - View session details
   - Verify input, output, cache_write, cache_read values
   - Ensure pricing fields are correct for each model

### API Connection Errors

**Symptoms:** "Failed to fetch" or network errors

**Solutions:**

1. **Check Server Status**
   ```bash
   # Verify server is running
   curl http://localhost:3000/api/validate
   ```

2. **Check Port Configuration**
   - Default port: 3000
   - If using custom port, ensure frontend matches
   - Set port: `PORT=3000 bun run start`

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for error messages
   - Check Network tab for failed requests

4. **Check CORS Issues**
   - Ensure frontend and backend share same origin
   - Dev mode: http://localhost:3000

### File Loading Errors

**Symptoms:** "Failed to load session" or PRT file errors

**Solutions:**

1. **Check File Permissions**
    ```bash
    # Ensure read access to storage path
    ls -la ~/.local/share/opencode/storage/message
    ```

2. **Validate Session Files**
    - Check session directories exist
    - Verify JSON files are valid
    - Check for corrupted session data

3. **Check PRT Files**
    - PRT files should be in session directory
    - Verify PRT file paths are accessible
    - PRT files use naming pattern: `prt_<messageId>_<prtId>.json`

4. **View PRT Content Issues**
    - PRT modal shows "Loading..." indefinitely
    - Check browser console for errors
    - Verify PRT file is valid JSON
    - Check message ID matches PRT file naming pattern

### Performance Issues

**Symptoms:** Slow loading or unresponsive interface

**Solutions:**

1. **Reduce Pagination Limit**
    - Edit `frontend/assets/config.js`
    ```javascript
    pagination: {
      defaultLimit: 5  // Reduce from 10
    }
    ```

2. **Filter Sessions**
    - Use date ranges to reduce data volume
    - Focus on recent sessions

3. **Check Server Resources**
    - Monitor CPU and memory usage
    - Consider upgrading hardware if needed

4. **Clear Browser Cache**
    - Clear cache and reload page
    - Try incognito/private mode

5. **Clear Session Cost Cache**
    - If cost calculation seems slow after model price updates
    - Restart server to clear internal caches

### Rate Limit Errors

**Symptoms:** HTTP 429 errors or "Too many requests" messages

**Solutions:**

1. **Reduce Request Frequency**
    - Implement client-side throttling
    - Cache API responses locally
    - Use pagination to load data in chunks

2. **Check Multiple Tabs**
    - Multiple browser tabs may share the same rate limit
    - Close unnecessary tabs

3. **Adjust Rate Limit** (server-side)
    - Edit `backend/server.ts`
    - Modify `RATE_LIMIT_MAX_REQUESTS` (default: 100)
    - Modify `RATE_LIMIT_WINDOW_MS` (default: 60,000ms = 1 minute)

### WebSocket/Live Monitor Issues

**Note:** Live Monitor feature has been removed in v0.4.4 due to Bun runtime limitations.

If you need real-time monitoring:
- Use polling instead of WebSocket
- Consider alternative runtime (Node.js) for WebSocket support

### Display Issues

**Symptoms:** Layout broken, missing styles, or visual glitches

**Solutions:**

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

2. **Check Browser Compatibility**
   - Use modern browser (Chrome, Firefox, Safari, Edge)
   - Update to latest version

3. **Check Console Errors**
   - Open Developer Tools (F12)
   - Review Console tab for JavaScript errors

4. **Verify style.css Loading**
   - Check Network tab in DevTools
   - Ensure `style.css` loaded successfully

### Version Detection Issues

**Symptoms:** OpenCode version shows "Unknown"

**Solutions:**

1. **Check opencode CLI**
   ```bash
   opencode --version
   ```

2. **Verify package.json Paths**
   - Check `~/.local/share/opencode/package.json`
   - Check `~/.config/opencode/package.json`

3. **Manual Version Check**
   - Edit `frontend/assets/views/about.js`
   - Hard-code version if needed

---

## Support and Contributing

### Getting Help

- **Issues**: Report bugs on [GitHub Issues](https://github.com/huangli712/OpenCodeView/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/huangli712/OpenCodeView/discussions)

### Contributing

Contributions are welcome! Here's how to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Backend**: TypeScript with strict type checking
- **Frontend**: Vanilla JavaScript with ES6+ features
- **CSS**: Modern CSS with CSS variables for theming
- **Commit Messages**: Conventional Commits format

---

## License

This project is licensed under the MIT License.

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

Current Version: **v0.7.3**
