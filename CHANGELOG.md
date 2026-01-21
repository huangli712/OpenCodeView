# Changelog

## v0.6.0 (2026-01-21)
- Refactored frontend into modular architecture
- Split app.js (1575 lines) into 12 focused modules
- Created utils/formatters.js for data formatting utilities
- Created utils/dom.js for DOM helper functions
- Created api.js for centralized API client
- Created state.js for application state management
- Created components/toasts.js for toast notifications
- Created components/pagination.js for pagination component
- Created components/charts.js for Chart.js wrapper
- Created views/dashboard.js for dashboard view
- Created views/sessions.js for sessions view
- Created views/analytics.js for analytics view
- Created views/about.js for about modal
- Reduced main app.js from 1575 lines to 279 lines (82% reduction)
- Fixed Chart.js import error - use window.Chart for CDN UMD version
- Changed all Chinese text to English
- Changed all locale formats from zh-CN to en-US
- Updated version to 0.6.0 across all files

## v0.5.2 (2026-01-21)
- Removed node:path dependency - use standard JavaScript path functions
- Refactored frontend - remove unused CSS and duplicate code
- Fixed syntax error - remove TypeScript type annotations from .js file
- Merge duplicate CSS - consolidate message and PRT styles
- Split message-time and message-tokens CSS classes
- Remove unused CSS and add missing .empty-state styles
- Move inline CSS styles from app.js to style.css
- Fix CSS syntax error - restore missing .message-agent selector
- Updated version to 0.5.2 across all files

## v0.5.1 (2026-01-21)
- Added bar charts for Models Analysis page
- Added 4 charts: Cost, Tokens, Sessions, Interactions by model
- Added bar charts for Projects Analysis page
- Added 4 charts: Cost, Tokens, Sessions, Interactions by project
- Sessions charts y-axis now displays only integer values
- Interactions charts y-axis now displays only integer values
- Tokens charts use scientific notation for values >= 10000
- Charts appear below data tables in all analytics views
- Updated version to 0.5.1 across all files

## v0.5.0 (2026-01-21)
- Added data visualization charts to Daily/Weekly/Monthly analytics
- Implemented 4 interactive charts: Cost, Tokens, Sessions, Interactions over time
- Integrated Chart.js library (v4.4.1) for chart rendering
- Added Monthly tab with monthly statistics view
- Fixed version number detection in About OpenCode modal (missing await keyword)
- Changed version detection to use `opencode --version` command with package.json fallback
- Removed status text from About modal ("OpenCode data found", "MCP directory not found", etc.)
- Changed PATH and COUNT values color to success green (--success)
- Split Sessions and Interactions into separate bar charts
- Moved charts below tables in analytics views
- Added spacing between tables and charts
- Updated version to 0.5.0 across all files

## v0.4.4 (2026-01-21)
- Removed Live Monitor feature and WebSocket backend module
- Deleted backend/websocket.ts
- Removed LiveSessionStatus interface from types.ts
- Removed Live Monitor tab from frontend
- Removed loadLiveMonitor and related methods from app.js
- Removed live-related CSS styles
- Updated documentation to remove Live Monitor references

## v0.4.3 (2026-01-21)
- Added PRT files display in message cards
- Backend: Added PART_STORAGE_PATH constant and loadPRTFiles() method
- Backend: Added PRTInfo interface to types.ts
- Backend: Modified handleGetSessionById to load PRT files for each message
- Frontend: Added PRT files section to message cards
- Frontend: Added updatePRTFilesDisplay() method to show PRT files
- Frontend: Added CSS styling for PRT files display
- Updated version number to 0.4.2

## v0.4.1 (2026-01-20)
- Fixed message pagination conflicting with session pagination
- Created independent renderMessagePagination() method
- Added distinct CSS classes for message pagination (message-page-btn)
- Used data-message-offset attribute instead of data-offset
- Modified setupMessagePaginationEvents() to only handle message pagination clicks
- Message pagination now correctly navigates messages, not sessions

## v0.4.0 (2026-01-20)
- Added message pagination to session details page
- Messages display 10 per page with Previous/Next navigation
- Backend /api/sessions/:id supports limit and offset parameters
- Added message pagination state tracking (currentSessionId, currentMessageOffset, currentMessageLimit)
- Implemented loadMessages() method with pagination support
- Added setupMessagePaginationEvents() for message pagination handling
- Reused existing pagination UI components
- Pagination info shows message range and total count

## v0.3.1 (2026-01-20)
- Display full message ID instead of truncated
- Reorder message metadata: Mode, Agent, Provider, Model, Tokens, Cost
- Show full timestamp with date and time (YYYY/MM/DD HH:mm:ss)
- Enhanced message info grid layout

## v0.3.0 (2026-01-20)
- Added message list display in session details page
- Messages show role (user/assistant), timestamp, token usage
- User messages display title and file modification info
- Assistant messages show model and agent information
- Enhanced session details with message history view
- Added message list styling with role-based color coding

## v0.2.0 (2026-01-20)
- Fixed sessions panel showing "Unknown" for all projects
- Fixed "Invalid Date" display for session start times
- Fixed pagination not showing all sessions (heuristic loading)
- Fixed incorrect pagination total and hasMore calculation
- Fixed "Back to List" button not working
- Fixed pagination state lost when returning from session details
- Fixed routes bug with sessions vs analyzer naming conflict
- Added session numbering display (format: "X / sessionId")
- Improved pagination styling (page info, buttons)
- Changed default page limit from 20 to 10 sessions
- Unified Models Used section styling across Dashboard and Session details
- Improved Back to List button styling
- Enhanced session loading to skip empty directories

## v0.1.0 (2025-01-19)
- Initial release with complete Python ocmonitor feature parity
- Bun + TypeScript + HTML/CSS tech stack
- WebSocket live monitoring (disabled due to Bun runtime limitation)
- Modernized responsive web interface
- Complete type safety
- Dashboard with session overview
- Session list with pagination
- Daily, weekly, monthly analytics
- Model and project analysis
- About OpenCode information panel
