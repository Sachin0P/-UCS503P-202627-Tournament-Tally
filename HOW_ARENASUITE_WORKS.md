# How ArenaSuite Works

A description of what the application does and how it behaves — not a build
spec, just an explanation of the system as it currently exists (built on
Node/Express + Angular). Useful as reference material when asking Claude to
reimplement it on a different stack.

## 1. What it is

A centralized college competition platform, organized around three
sections — **Sports**, **Academic**, **Esports** — where students discover
competitions, register individually or as a team, form or join teams, find
teammates, track fixtures and live results, while organizers create,
publish, and run competitions, and admins moderate the platform. Auth is
Google-only, restricted to one email domain (e.g. `thapar.edu`). Real-time
updates (live scores, standings, announcements, notifications) are pushed
over WebSockets.

Three roles exist: `participant` (what every new sign-in becomes by
default), `organizer` (granted automatically the moment a user creates an
Organization), `admin` (granted only via an env-configured bootstrap list,
or by an existing admin).

## 2. Data model

Everything lives in one relational database. Every table has an integer
primary key, and `created_at`/`updated_at` timestamps where noted. Foreign
keys are enforced.

```
users
  id, google_id (unique), name, email (unique), profile_picture (nullable),
  role ENUM('participant','organizer','admin') default 'participant',
  college (nullable), roll_number (nullable), branch (nullable),
  status ENUM('active','suspended') default 'active',
  created_at, updated_at

organizations
  id, name, description (nullable), logo (nullable), college (nullable),
  verified BOOLEAN default false, created_by -> users.id,
  created_at, updated_at

competitions
  id, organization_id -> organizations.id, name, description (nullable),
  category ENUM('SPORTS','ACADEMIC','ESPORTS'),
  type (nullable, free text e.g. "Cricket"/"Hackathon"/"BGMI"),
  banner (nullable), start_date, end_date, registration_deadline,
  venue (nullable), mode ENUM('online','offline') default 'offline',
  max_participants (nullable), max_teams (nullable),
  registration_fee default 0, rules (nullable),
  format ENUM('knockout','round_robin','league','group_knockout',
              'single_elimination','double_elimination','staged') default 'knockout',
  stages_json (nullable — JSON array of stage names, Academic only, e.g.
              ["Registration","Team Formation","Submission","Evaluation","Leaderboard","Results"]),
  status ENUM('draft','published','ongoing','completed','cancelled') default 'draft',
  created_by -> users.id, created_at, updated_at

teams
  id, competition_id -> competitions.id, name, logo (nullable),
  description (nullable), captain_id -> users.id, max_members default 4,
  required_skills (nullable), looking_for_members BOOLEAN default false,
  looking_for_role (nullable), status ENUM('active','disbanded') default 'active',
  created_at, updated_at
  UNIQUE(competition_id, name)

team_members
  id, team_id -> teams.id, user_id -> users.id,
  role ENUM('captain','member') default 'member',
  status ENUM('active','removed','left') default 'active', joined_at
  UNIQUE(team_id, user_id)

team_join_requests
  id, team_id -> teams.id, user_id -> users.id, message (nullable),
  status ENUM('pending','accepted','rejected','cancelled') default 'pending',
  created_at, updated_at

team_invitations
  id, team_id -> teams.id, user_id -> users.id (invitee),
  invited_by -> users.id,
  status ENUM('pending','accepted','rejected','cancelled') default 'pending',
  created_at, updated_at

looking_for_team_posts
  id, competition_id -> competitions.id, user_id -> users.id, role,
  skills (nullable), experience ENUM('Beginner','Intermediate','Advanced') nullable,
  description (nullable), status ENUM('open','closed') default 'open',
  created_at, updated_at
  UNIQUE(competition_id, user_id)

registrations
  id, competition_id -> competitions.id, user_id -> users.id,
  team_id -> teams.id (nullable — null means an individual registration),
  status ENUM('pending','approved','rejected','cancelled') default 'pending',
  registered_at, updated_at
  UNIQUE(competition_id, user_id)         -- one registration per user per competition
  UNIQUE(competition_id, team_id)         -- one registration per team (NULLs don't collide, so this doesn't block individual regs)

matches
  id, competition_id -> competitions.id, round (text label, e.g. "Semifinal"),
  round_order INTEGER (for sorting/bracket layout), team_a_id -> teams.id (nullable),
  team_b_id -> teams.id (nullable), score_a (nullable), score_b (nullable),
  winner_id -> teams.id (nullable), scheduled_at (nullable), venue (nullable),
  status ENUM('scheduled','live','completed','cancelled','postponed') default 'scheduled',
  next_match_id -> matches.id (nullable — the bracket match this one's winner feeds into),
  next_match_slot ENUM('A','B') nullable,
  created_at, updated_at

standings
  id, competition_id -> competitions.id, team_id -> teams.id,
  played default 0, won default 0, lost default 0, draw default 0,
  points default 0, score_difference default 0, rank (nullable),
  stats_json (nullable — free-form per-category extras: Esports
              kills/placement, Academic evaluator notes, etc.),
  updated_at
  UNIQUE(competition_id, team_id)

announcements
  id, competition_id -> competitions.id, title, message,
  created_by -> users.id, created_at

notifications
  id, user_id -> users.id,
  type ENUM('registrationApproved','registrationRejected','teamInvitation',
            'teamJoinRequest','matchScheduled','matchUpdated','announcement',
            'qualification','result'),
  message, reference_id (nullable, generic FK to whatever the notification is about),
  is_read BOOLEAN default false, created_at

reports
  id, reporter_id -> users.id,
  target_type ENUM('competition','team','user','announcement'), target_id,
  reason, status ENUM('open','resolved','dismissed') default 'open',
  created_at, resolved_at (nullable)
```

Every foreign key is indexed, plus: `competitions(category, status)`,
`competitions(start_date)`, `competitions(registration_deadline)`,
`matches(competition_id, status)`, `notifications(user_id, is_read)`,
`standings(competition_id, rank)` — these are the columns filtered/sorted
on most.

## 3. Authentication & authorization

The frontend loads Google Identity Services and renders the real Google
button. Signing in hands back a signed ID token, which the frontend sends
to `POST /api/auth/google`. The backend verifies that token against Google
directly — it never trusts a client-supplied email or subject id — checks
that the email is verified and that its domain matches a configured value
(e.g. `thapar.edu`), and rejects with 403 otherwise.

The backend then finds-or-creates the local `users` row by Google's
subject id (falling back to a lookup by email). A brand-new user always
starts as `role = 'participant'`.

There's one exception: a configured list of admin emails. Any email on
that list gets promoted to `admin` the moment it signs in — whether that's
the very first login or a later one, if the email was added to the list
after the account already existed. This is one-directional: removing an
email from the list afterward does not revoke admin rights already
granted. Every other role change happens through the Admin Panel.

Once signed in, the backend issues its own short-lived session token (a
JWT, a handful of days), which the client attaches to every request and to
the WebSocket connection. On every authenticated request, the backend
re-loads the user from the database rather than trusting stale token
claims — so a role change or account suspension takes effect on the very
next request, not just the next login. Suspended accounts are rejected.

Every user is also required to have a roll number and branch filled in.
Whichever of the two is missing, the app redirects them to their profile
page instead of wherever they were trying to go — this is what happens
immediately after a brand-new user's first login (since login always lands
on the dashboard first, and the dashboard route enforces this), and it
keeps happening on every subsequent visit to a protected page until it's
filled in. There's no separate "onboarding" screen — it's the same profile
page a user would use to edit these fields later.

Ownership works through organizations: a competition (and everything
under it — teams, matches, standings, announcements) is owned via its
organization's creator. An organizer can only modify things under
organizations they personally created; an admin bypasses this check
entirely. There's no separate "become an organizer" application — creating
an organization *is* that action: the first time a `participant` creates
one, they're promoted to `organizer` as part of that same request.

## 4. How the frontend and backend talk to each other

Everything goes through JSON over HTTP under `/api`, plus one WebSocket
connection for live updates. This is the exact current contract:

```
POST   /api/auth/google                                    -     exchange Google ID token for a session
GET    /api/auth/me                                         user  current user

GET    /api/users/:id                                        -     public profile
PUT    /api/users/me                                         user  update own college/rollNumber/branch

GET    /api/organizations                                    -     list, with creator name + competition count
GET    /api/organizations/:id                                 -     org + its upcoming/past competitions
POST   /api/organizations                                    user  create (promotes creator to organizer)
PUT    /api/organizations/:id                                owner update

GET    /api/competitions                                     -     list; filters: category, type, college,
                                                                     organizationId, mode, dateFrom, dateTo, q,
                                                                     free(true/false), registrationOpen(true/false),
                                                                     closingSoonDays, status, sort(recent|closingSoon|popular),
                                                                     mine(true), limit, offset. Drafts only visible to
                                                                     their owner or an admin.
GET    /api/competitions/:id                                  -     detail (same draft-visibility rule)
POST   /api/competitions                                     owner  create
PUT    /api/competitions/:id                                 owner  update
PATCH  /api/competitions/:id/status                          owner  {status} — draft/published/ongoing/completed/cancelled
DELETE /api/competitions/:id                                 owner  delete
POST   /api/competitions/:id/register                        user  register — body {} for individual, {teamId} for team

GET    /api/competitions/:id/teams                            -     list (optional ?lookingForMembers=true)
POST   /api/competitions/:id/teams                            user  create (caller becomes captain; blocked if
                                                                     already on a team in this competition)
GET    /api/teams/mine                                        user  teams the caller is an active member of
GET    /api/teams/:id                                          -     detail incl. members array
PUT    /api/teams/:id                                         owner* captain-or-admin
DELETE /api/teams/:id                                         owner* captain-or-admin
POST   /api/teams/:id/leave                                   user  self-remove (captain must transfer first)
POST   /api/teams/:id/transfer-captain                        owner* {userId}
DELETE /api/teams/:id/members/:userId                          owner* remove a member
POST   /api/teams/:id/join-request                            user  request to join {message?}
GET    /api/teams/:id/join-requests                            owner* list pending requests
PUT    /api/teams/:id/join-requests/:reqId                    owner* {action: accept|reject}
DELETE /api/teams/:id/join-requests/:reqId                     user  requester cancels their own
POST   /api/teams/:id/invite                                  owner* {userId}
GET    /api/teams/invitations/mine                            user  caller's pending invitations
PUT    /api/teams/invitations/:id                             user  {action: accept|reject}
DELETE /api/teams/invitations/:id                             owner* captain cancels

GET    /api/find-team/teams                                   -     teams with looking_for_members=true;
                                                                     filters competitionId, category, role, skill
GET    /api/find-team/posts                                    -     "looking for a team" posts; filters
                                                                     competitionId, category, role
POST   /api/find-team/posts                                   user  create own post
PUT    /api/find-team/posts/:id                                owner update own post
DELETE /api/find-team/posts/:id                                owner delete own post

GET    /api/competitions/:id/registrations                    owner  list, optional ?status=
GET    /api/registrations/mine                                user  caller's own registrations
PUT    /api/registrations/:id/approve                          owner
PUT    /api/registrations/:id/reject                           owner
DELETE /api/registrations/:id                                  owner* registrant/captain or admin cancels

GET    /api/competitions/:id/matches                           -     list, sorted by round_order then id
POST   /api/competitions/:id/matches                           owner  manual single match creation
POST   /api/competitions/:id/matches/generate                  owner  generate full fixture set (see §5);
                                                                     body {regenerate: bool} — refuses to
                                                                     overwrite if any match is live/completed
GET    /api/matches/mine                                      user  matches for teams the caller belongs to
GET    /api/matches/:id                                        -
PUT    /api/matches/:id                                        owner  update score/status/winner/schedule/venue
DELETE /api/matches/:id                                        owner

GET    /api/competitions/:id/standings                        -     current table
POST   /api/competitions/:id/standings/recompute               owner  force re-derive from matches
PUT    /api/competitions/:id/standings/score                   owner  {teamId, points, statsJson?} — Academic
                                                                     category only, direct entry (see §5)

GET    /api/competitions/:id/announcements                     -
POST   /api/competitions/:id/announcements                     owner  {title, message} — notifies every
                                                                     approved participant
DELETE /api/competitions/:id/announcements/:id                 owner

GET    /api/notifications                                      user  ?unreadOnly=true; response includes unreadCount
PUT    /api/notifications/:id/read                             user
PUT    /api/notifications/read-all                             user

GET    /api/admin/stats                                       admin  platform totals + per-category competition counts
GET    /api/admin/users                                       admin  ?role=, ?status=, ?q=
PUT    /api/admin/users/:id/status                             admin  {status: active|suspended}
PUT    /api/admin/users/:id/role                               admin  {role}
GET    /api/admin/organizations                                admin
PUT    /api/admin/organizations/:id/verify                     admin
GET    /api/admin/competitions                                 admin  every competition incl. drafts
PUT    /api/admin/competitions/:id/hide                        admin  force status -> cancelled
POST   /api/admin/reports                                      user   any signed-in user can file one:
                                                                     {targetType, targetId, reason}
GET    /api/admin/reports                                      admin  ?status=
PUT    /api/admin/reports/:id                                  admin  {status: resolved|dismissed}
```

`owner*` marks the handful of routes where the check is specifically the
resource's captain or original registrant, not general organization
ownership — everything else follows the ownership rule from §3.

Every list endpoint that returns competitions includes computed fields —
`organizer_name`, `organizer_college` (joined from the organization),
`registrations_count` (approved registrations), `teams_count` (distinct
teams with an approved registration) — so competition cards never need a
second request to render fully.

For real-time: one WebSocket connection per open browser tab. On connect,
the server checks the same session token used for REST calls and joins the
socket to a room keyed by that user's id — this is how personal
notifications reach them. A competition detail page additionally joins a
room keyed by that competition's id for as long as the page stays open —
this is how live scores/standings/announcements reach everyone currently
looking at that competition, and only them. The server never broadcasts to
everyone; it only ever targets one of those two room types.

The events it sends, each one also written to the `notifications` table
when it concerns a specific person (so it's still visible later even if
they weren't connected at the time):

- `scoreUpdated`, `matchStatusUpdated` — to the competition room, whenever
  a match's score or status changes.
- `standingsUpdated` — to the competition room, after any standings
  recompute (fixture generation, a match completing, or a manual Academic
  score entry).
- `announcementCreated` — to the competition room, when one is published.
- `registrationApproved` / `registrationRejected` — to the competition
  room, and as a personal notification to every affected user (the
  individual, or every active member of the team).
- `teamJoinRequest` — personal notification to the team's captain.
- `notification` — generic event to a user's personal room any time a row
  is inserted into `notifications` for them; the client prepends it to an
  in-memory list and bumps the unread badge live.

## 5. The interesting logic

**Generating fixtures.** The organizer triggers this once a competition
has approved team registrations (at least two). For round-robin formats it
uses the circle method — fix one team, rotate the rest each round, so
every team plays every other team exactly once; an odd number of teams
gets a bye slot added first. For knockout formats, the team count is
rounded up to the next power of two, and byes aren't just appended at the
end — they're distributed using the standard recursive bracket-seeding
order (seed 1 stays seed 1; going from N seeds to 2N seeds, each seed `s`
becomes the pair `[s, 2N+1-s]` — so 8 slots seed as `[1,8,4,5,2,7,3,6]`).
That spreads byes across separate first-round matches instead of letting
two of them land in the same match, which would otherwise produce a match
with no real teams in it at all. Round labels follow from the match count
remaining: one match left is the Final, two is the Semifinal, four is the
Quarterfinal. Every match except the final also records which slot of
which next match its eventual winner should land in. Regenerating fixtures
for a competition that already has some is refused once any match has
gone live or completed — it won't silently wipe a tournament in progress.

**Completing a match.** If an update marks a match completed without an
explicit winner, the winner is derived from the scores (higher wins, a tie
is a draw with no winner). If that match feeds into a bracket, the winner
is written straight into the next match's team slot. Any time a match
becomes completed, standings for that competition get recomputed.

**Standings** for Sports and Esports are never edited by hand — they're
entirely derived by replaying every completed match: every team starts at
zero, a win is +3 points, a draw is +1 point each side, a loss is 0;
score difference accumulates each match's own-score-minus-opponent-score
for both sides; the final ranking sorts by points, then score difference,
then wins. Academic competitions don't have a match ladder to derive
anything from, so their standings work differently — an organizer enters a
team's score directly, and the whole table for that competition gets
re-ranked by points every time one changes.

**What's blocked, and why.** A user can be an active member of at most one
team per competition — checked before a team is created and before any
join request or invitation is accepted. A user can have at most one
registration per competition; for a team registration, that check extends
to every member of the team, not just whoever's submitting it — one member
already being registered (individually, or via a different team) blocks
the whole team's registration. A team can register at most once. Team
registrations respect the competition's max-teams cap. Registration is
only accepted while the competition is published and before its deadline.
Publishing an announcement notifies every currently-approved participant —
for a team registration that means every active member, not just the
person who registered the team.

## 6. What each screen does

The visual style throughout is intentionally minimal: a neutral light
background, near-black text, and one small accent color per category for
wayfinding (emerald for Sports, indigo for Academic, rose for Esports) used
sparingly — on small tag pills and section headings, not as a whole-page
theme. The same handful of components repeat everywhere: a colored
status/category pill, a plain white bordered card, a simple top tab bar, an
empty-state block, a loading spinner, toast notifications for action
feedback. Every list has distinct loading, empty, and populated states.

**Pages anyone can view** (registering, joining, etc. require sign-in):

- **Home** — a hero with two calls to action, the three category cards,
  then four competition grids: Upcoming, Registration Closing Soon (next
  ~14 days), Popular (by registration count), Recently Added.
- **Category pages** (Sports / Academic / Esports) — the same browsing
  experience as Explore, locked to one category, with a title band tinted
  in that category's color.
- **Explore** — search, category/mode/free-paid/sort filters, a
  competition-card grid.
- **Competition details** — banner, name, organizer (linking to their
  org profile), category and status, dates/venue/deadline/fee, and a
  register panel that adapts to context: a sign-in prompt if anonymous,
  the current registration's status if already registered, otherwise an
  "Register Individually" button plus one button per team the visitor
  captains in that competition (or a prompt to create/join one). Five
  tabs: Overview (description/rules/format), Teams & Participants (team
  cards plus a create-team form), Fixtures & Matches (a bracket for
  knockout formats, a simple list otherwise), Standings & Results,
  Announcements (with a compose form for the owning organizer). Live
  while open — the four relevant WebSocket events patch the page in
  place.
- **Organization profile** — name, logo, description, upcoming and past
  competitions.
- **Team detail** — members (captain can remove or transfer captaincy),
  an edit form, pending join requests the captain can accept or reject,
  leave/disband.
- **Find a Team** — two tabs: teams currently recruiting (with a
  request-to-join action), and people posting that they need a team
  (with an invite action letting a captain choose which of their teams to
  invite that person into).

**Pages that require signing in:**

- **Profile** — doubles as the mandatory onboarding screen described in
  §3 and the everyday "edit my details" page; same form either way.
- **Notifications** — list, unread highlighting, mark-one/mark-all-read.
- **Participant dashboard** — stat tiles (registered competitions, active
  teams, upcoming matches, approved registrations) and four lists: My
  Competitions, My Teams, Upcoming Matches, Recent Results.
- **Organize** (landing) — a straight link into the organizer dashboard
  if the visitor already owns an organization, otherwise an inline
  "create your organization" form — which is the entire "become an
  organizer" flow.

**Organizer pages** (visible to `organizer` and `admin` roles):

- **Dashboard** — stat tiles across everything the organizer owns (total
  and active competitions, registrations, teams, upcoming/completed
  matches) and a preview of their competitions.
- **My Competitions** — the full list, with inline publish/unpublish/
  cancel and a link into each one's management page.
- **Create Competition** — a four-step wizard: basic info (organization,
  name, description, category, type, banner); event details (dates,
  deadline, mode, venue, capacity, fee, rules); format (a set of
  Sports/Esports bracket formats, or a comma-separated stage list for
  Academic); preview, with Save Draft or Publish.
- **Manage Competition** — five tabs: Registrations (approve/reject),
  Teams (roster), Fixtures & Live Scores (generate/regenerate fixtures,
  then every match as an editable row for score and status — this is
  what drives the live updates on the public details page), Standings
  (the Academic score-entry form where applicable), Announcements
  (compose and history).
- **Settings** — edit the organizations the user owns.

**Admin pages** (`admin` role only): a platform-wide stats dashboard; a
user directory with role and suspend/unsuspend controls; an organization
list with a verify action; every competition on the platform including
drafts, with a hide (force-cancel) action; a report queue with
resolve/dismiss actions.

**Navigation** present everywhere: Home, Sports, Academic, Esports, Find a
Team, My Competitions, Organize are always visible; Organizer Dashboard and
Admin Panel links only appear for users with that role; a notifications
link with an unread badge and an account menu only appear when signed in.
On narrow screens the same links move into a hamburger menu rather than
disappearing.

## 7. Configuration

The backend's behavior is controlled by a handful of environment values:
which port it listens on, where its frontend origin is (for CORS/WebSocket
origin checks, if frontend and backend are served separately), where its
database file lives, the secret and expiry used to sign session tokens,
the Google OAuth client id (needed on both sides — the frontend to render
the sign-in button, the backend to verify tokens against the same client),
which email domain is allowed to sign in at all, and the comma-separated
bootstrap admin email list described in §3.

## 8. Feature scope

What exists today: Google auth restricted to one domain; the three roles
plus the roll-number/branch onboarding requirement; a homepage and the
three category sections; discovery with search and filters; competition
details with all five tabs; a participant dashboard; an organizer
dashboard including the four-step creation wizard; individual and team
registration with organizer approval; team creation with join-requests and
invitations; Find a Team in both directions; fixture generation for
round-robin and seeded knockout brackets; match and score management;
derived standings for Sports/Esports and directly-entered standings for
Academic; announcements; real-time notifications and live score/standings/
announcement updates over WebSockets; organization profiles; and an admin
panel covering users, organizations, competitions, and reports.

What's deliberately absent: payments, AI features, streaming, social
feeds, recommendation systems.
