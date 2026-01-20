# Changelog

## v0.4.3 (2026-01-21)
- Added PRT file modal viewer - click type to view full PRT file content
- Fixed PRT file type display parsing errors for complex types
- Removed synthetic field from PRTInfo interface
- Added rawData field to store complete PRT file data
- Simplified PRT modal to show raw JSON content
- Changed PRT type color from blue to green
- Removed square brackets from PRT type display

## v0.4.2 (2026-01-20)
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
