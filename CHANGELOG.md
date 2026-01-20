# Changelog

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
