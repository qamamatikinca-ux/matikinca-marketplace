LOADLINK EXPERIENCE UPGRADE V2
==============================

This package is made for the current matikinca-marketplace project.
It replaces only the files listed below and creates a timestamped backup first.

INCLUDED
--------
- Accurate, scroll-synchronised LoadLink gold swipe indicators.
- No swipe indicator on homepage Quick Links / discovery chips.
- Correct indicators for logistics news and Recent Activity card rails.
- Full-screen LoadLink chat page with activity, typing and last-active status.
- 50 free sent messages per day, with visible daily usage and Pro bypass.
- Optional listing-owner profile photo displayed in listings and chat.
- Cleaner, more organic List a Job page with a shorter correctly cropped hero image.
- Existing file sharing, unread badges, calling and conversation search retained.
- Environment variables and Vercel settings are never edited.

INSTALL FROM THE MAIN PROJECT FOLDER
------------------------------------
1. Extract the ZIP.
2. Run:

   node loadlink-experience-upgrade-v2/install-loadlink-experience-upgrade-v2.js

3. Open Supabase > SQL Editor > New query.
4. Paste and run the complete LOADLINK-EXPERIENCE-UPGRADE-V2.sql file.
5. Return to Codespaces and run:

   npm run build

6. When the build succeeds, run:

   git add .
   git commit -m "Install LoadLink experience V2"
   git push

BACKUP
------
The installer stores replaced files in:
.loadlink-backup/experience-v2-<timestamp>/

IMPORTANT
---------
Run the SQL before testing the daily counter and profile photos in chat.
The 50-message limit counts messages sent by the current device key from midnight
South African time. A Pro chat plan or a Pro listing owner key bypasses the limit.
