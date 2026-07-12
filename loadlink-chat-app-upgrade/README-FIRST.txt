LOADLINK CHAT APP + SWIPE DOTS UPGRADE

This package is made for the current qamamatikinca-ux/matikinca-marketplace project.
It does not change any environment variables, API keys or Vercel settings.
It creates a reversible backup before changing existing files.

WHAT IT CHANGES
- Adds the swipe-position dots shown in your first screenshot to wide swipeable card rails.
- Removes “Industry update”.
- Removes “Jobs in this portal”.
- Removes “Find jobs portal” while keeping the proper main jobs heading.
- Removes “Available results”.
- Rebuilds /messages as a dedicated LoadLink-style chat app page.
- Adds unread counters to conversations and the floating chat icon.
- Adds active now / last active, typing status and estimated reply time.
- Adds private photo and document attachments up to 5 MB.
- Adds conversation search, listing shortcut, call shortcut and safer user-facing wording.
- Keeps the no-visible-login device-key chat flow.

INSTALL IN CODESPACES
1. Upload this whole extracted folder into the main marketplace project folder.
2. In the terminal, run:

node loadlink-chat-app-upgrade/install-loadlink-chat-app-upgrade.js

3. Open LOADLINK-CHAT-APP-UPGRADE.sql from the main project folder.
4. Copy all of it into Supabase > SQL Editor > New query, then press Run.
5. Back in the terminal, run:

npm run build

git add .
git commit -m "Upgrade LoadLink chat and swipe controls"
git push

BACKUP
The installer automatically saves every replaced file inside:
.loadlink-backup/chat-app-<date-and-time>/

IMPORTANT
Run the SQL file as one complete query. Do not paste environment-variable values into the SQL editor.
