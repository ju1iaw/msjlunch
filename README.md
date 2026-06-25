# Mission San Jose Lunch Menus

A web app for a school lunch program. Students browse daily menus, vote in polls, give
feedback, favorite dishes, and get notified when favorites are on an upcoming menu. Admins
manage dishes, menus, polls, the student-ID roster, and review feedback.

Dark green / white / black theme.

## Tech stack

- **Backend**: Node + Express + SQLite (`better-sqlite3`), image & CSV uploads via `multer`
- **Frontend**: React (Vite), React Router
- Monorepo via npm workspaces

## Getting started

```bash
npm install        # installs root + server + client deps
npm run dev        # runs API (http://localhost:4000) + client (http://localhost:5173)
```

Open **http://localhost:5173** for the student site and **http://localhost:5173/admin** for admin.

### Default logins / seed data

- **Admin**: `admin` / `admin123`
- Seeded sample dishes, a week of menus, one poll, and valid student IDs `1001`–`1005`
  (use these to test poll voting).
- **Students** log in passwordless with any email or phone number to save favorites &
  receive notifications.

## Production build

```bash
npm run build      # builds the client into client/dist
npm start          # Express serves the API + the built client on http://localhost:4000
```

## Features

### Students
- **Menu** tab: weekly calendar; click a day to see that day's dishes, ingredients & allergens.
- **Polls** tab: vote using a valid student ID (duplicate/invalid votes rejected); view results.
- **Feedback** tab: rate dishes by category (Taste, Portion Size, Freshness, Presentation) or
  leave open-ended general feedback.
- **Profile**: favorited dishes + notifications when favorites appear on upcoming menus.

### Admins
- Dishes: create (with photo, ingredients, allergens), edit, delete; see favorite counts.
- Menus: pick a date and select that day's dishes; edit/delete.
- Polls: create with deadline + options, view live results, delete.
- Roster: upload a CSV of valid student IDs each school year (replace or append).
- Feedback: review per-dish category ratings and general feedback.

## Notes
- Data is stored in `server/data/lunch.db` (created on first run). Delete it to reset.
- Uploaded photos are saved to `server/uploads/`.
- Auth tokens are stored in memory on the server, so restarting the server logs everyone out.
