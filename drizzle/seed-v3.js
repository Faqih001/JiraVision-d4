// V3 demo seed for a fresh JiraVision database. Safe to re-run: skips when
// sprints already exist. Usage: node --env-file=.env.local ./drizzle/seed-v3.js
const postgres = require("postgres");
const bcrypt = require("bcryptjs");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
};

// deterministic pseudo-random for reproducible seeds
let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const TEAM = [
  { name: "Amara Okafor", email: "amara.okafor@example.com", role: "manager", title: "Engineering Manager", dept: "Engineering", skills: ["Leadership", "Architecture", "Planning"] },
  { name: "Dmitri Volkov", email: "dmitri.volkov@example.com", role: "user", title: "Backend Developer", dept: "Engineering", skills: ["Go", "Postgres", "APIs"] },
  { name: "Lena Ortiz", email: "lena.ortiz@example.com", role: "user", title: "Frontend Developer", dept: "Engineering", skills: ["React", "Next.js", "Design Systems"] },
  { name: "Kwame Mensah", email: "kwame.mensah@example.com", role: "user", title: "QA Engineer", dept: "Quality", skills: ["Testing", "Playwright", "Automation"] },
  { name: "Sofia Lindqvist", email: "sofia.lindqvist@example.com", role: "user", title: "Product Designer", dept: "Design", skills: ["Figma", "UX Research", "Prototyping"] },
  { name: "Ravi Chandran", email: "ravi.chandran@example.com", role: "user", title: "Data Analyst", dept: "Analytics", skills: ["SQL", "Dashboards", "Python"] },
];

const TASK_TITLES = [
  "Set up Neon branch workflow for preview environments",
  "Instrument realtime notification fan-out",
  "Migrate avatar uploads to object storage bucket",
  "Add burndown chart aggregation query",
  "Fix flaky sprint-overlap edge case in velocity calc",
  "Design empty states for analytics tabs",
  "Write migration test for schema 0001",
  "Audit dashboard queries for N+1 patterns",
  "Add keyboard shortcuts for task quick-add",
  "Implement saved-view persistence",
  "Wire AI standup digest into weekly report",
  "Harden rate limits on public form endpoints",
  "Refactor auth middleware to session helper",
  "Add CSV export for task lists",
  "Optimize dashboard image loading with next/image",
  "Create onboarding checklist modal flow",
  "Investigate timezone drift in due-date filters",
  "Add bulk status change to task table",
  "Prototype drag-and-drop kanban reordering",
  "Set up Playwright smoke suite on preview branches",
  "Document ADMIN_EMAILS bootstrap flow",
  "Add wellbeing check-in reminder notification",
  "Implement @mention parsing in comments",
  "Build sprint retro board with voting",
  "Profile slow query on team workload endpoint",
  "Add dark-mode contrast audit for charts",
  "Introduce component storybook parity check",
  "Wire health endpoint into status page",
  "Split monolithic dashboard route handler",
  "Add retry backoff for email sending",
  "Backfill gamification XP from completed tasks",
  "Create DORA-style deploy frequency widget",
  "Test RLS alternatives for shared workspace",
  "Add search-as-you-type with debounce",
  "Implement notification preferences toggles",
];

async function main() {
  const [existing] = await sql`select count(*)::int as n from sprints`;
  if (existing.n > 0) {
    console.log(`Sprints already exist (${existing.n}) — seed skipped. This script only fills empty databases.`);
    return;
  }

  const hash = await bcrypt.hash("password123", 10);

  // 1. Team users (keep any existing users, e.g. the e2e tester)
  const users = [];
  for (const m of TEAM) {
    const [row] = await sql`
      insert into users (name, email, password_hash, role, job_title, department, avatar, email_verified, status, skills, timezone)
      values (${m.name}, ${m.email}, ${hash}, ${m.role}, ${m.title}, ${m.dept},
        ${`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}`}, true, 'online',
        ${sql.json(m.skills)}, 'Africa/Nairobi')
      returning id, name
    `;
    users.push(row);
  }
  const allUsers = await sql`select id, name from users`;
  console.log(`Seeded ${users.length} team members (total ${allUsers.length} users incl. existing)`);

  // 2. Sprints
  const [sActive] = await sql`
    insert into sprints (name, description, start_date, end_date, status, capacity, completed)
    values (${'Sprint 12 — Realtime Foundations'}, ${'Notification fan-out, live queries, storage migration'},
      ${iso(addDays(-5))}, ${iso(addDays(6))}, 'active', 40, 0) returning id`;
  const [sPast] = await sql`
    insert into sprints (name, description, start_date, end_date, status, capacity, completed)
    values (${'Sprint 11 — V2 Launch'}, ${'Marketing site relaunch, SEO, fit quiz'},
      ${iso(addDays(-19))}, ${iso(addDays(-6))}, 'completed', 38, 34) returning id`;
  const [sFuture] = await sql`
    insert into sprints (name, description, start_date, end_date, status, capacity, completed)
    values (${'Sprint 13 — Dashboard Depth'}, ${'Main dashboard sections, CRUD parity, CMS groundwork'},
      ${iso(addDays(7))}, ${iso(addDays(20))}, 'planning', 42, 0) returning id`;
  console.log('Seeded 3 sprints (active/completed/planning)');

  // 3. Tasks
  const statuses = ['todo', 'in_progress', 'done', 'review', 'blocked'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  let doneCount = 0;
  const inserted = [];
  for (let i = 0; i < TASK_TITLES.length; i++) {
    const assignee = pick(allUsers);
    const sprint = i < 22 ? sActive : i < 28 ? sPast : sFuture;
    let status = pick(statuses);
    if (sprint.id === sPast.id) status = 'done';
    if (sprint.id === sFuture.id) status = 'todo';
    const storyPoints = [1, 2, 3, 5, 8][Math.floor(rnd() * 5)];
    if (status === 'done' && sprint.id === sActive.id) doneCount += storyPoints;
    const due = pick([addDays(-2), addDays(0), addDays(1), addDays(3), addDays(5), addDays(10), addDays(14)]);
    const updated = addDays(-Math.floor(rnd() * 6));
    const [t] = await sql`
      insert into tasks (title, description, status, priority, story_points, assignee_id, sprint_id, due_date, tags, created_at, updated_at)
      values (${TASK_TITLES[i]}, ${`Context: part of ${pick(['platform', 'product', 'quality', 'growth'])} track. Acceptance criteria in the spec.`},
        ${status}, ${pick(priorities)}, ${storyPoints}, ${assignee.id}, ${sprint.id}, ${iso(due)},
        ${sql.json([pick(['frontend', 'backend', 'infra', 'design', 'data']), pick(['tech-debt', 'feature', 'bug', 'chore'])])},
        ${(updated).toISOString()}, ${(updated).toISOString()})
      returning id`
    inserted.push(t.id);
  }
  await sql`update sprints set completed = ${doneCount} where id = ${sActive.id}`;
  console.log(`Seeded ${inserted.length} tasks (${doneCount} pts done in active sprint)`);

  // 4. Kanban columns + tasks
  const cols = [];
  for (const [idx, [title, color]] of [
    ['Backlog', 'bg-slate-400'], ['In Progress', 'bg-blue-500'], ['Review', 'bg-amber-500'], ['Done', 'bg-emerald-500'],
  ].entries()) {
    const [c] = await sql`insert into kanban_columns (title, color, "order") values (${title}, ${color}, ${idx}) returning id`;
    cols.push(c.id);
  }
  const kbTitles = [
    'Live cursor presence on board', 'Bulk archive closed sprints', 'Notification digest cadence setting',
    'Velocity variance alert', 'Retro action-item tracking', 'Board templates gallery', 'Workload heatmap',
    'Sprint goal health badge', 'Comment deep-links', 'Attachment preview cards', 'Subtask checklists',
    'Cycle-time report', 'Escalation SLA widget', 'Team status board', 'Focus mode for reviews',
    'Import from CSV', 'Webhook audit log', 'Read receipt for announcements',
  ];
  for (let i = 0; i < kbTitles.length; i++) {
    const columnId = pick(cols);
    await sql`
      insert into kanban_tasks (title, description, priority, status, column_id, assignee_id, sprint_id, due_date, "order", tags)
      values (${kbTitles[i]}, ${`Kanban item ${i + 1}`}, ${pick(priorities)},
        ${pick(['backlog', 'in_progress', 'review', 'done'])}, ${columnId}, ${pick(allUsers).id}, ${sActive.id},
        ${iso(pick([addDays(1), addDays(4), addDays(9)]))}, ${i},
        ${[pick(['ux', 'eng', 'ops'])]})
    `;
  }
  console.log(`Seeded 4 kanban columns + ${kbTitles.length} cards`);

  // 5. Wellbeing (last 14 days per user)
  const moods = ['great', 'good', 'neutral', 'stressed'];
  const workloads = ['underloaded', 'balanced', 'heavy'];
  for (const u of allUsers) {
    for (let d = 13; d >= 0; d--) {
      if (rnd() < 0.35) continue; // people skip days
      const score = 40 + Math.floor(rnd() * 55);
      await sql`
        insert into wellbeing_metrics (user_id, date, wellbeing_score, mood, workload, stress_level, overtime_hours)
        values (${u.id}, ${iso(addDays(-d))}, ${score}, ${pick(moods)}, ${pick(workloads)}, ${Math.floor(rnd() * 10)}, ${
          (rnd() * 4).toFixed(1)})
      `;
    }
  }
  console.log('Seeded wellbeing metrics (14-day window)');

  // 6. Gamification
  for (const u of allUsers) {
    const xp = 100 + Math.floor(rnd() * 900);
    await sql`
      insert into gamification (user_id, level, xp, tasks_completed, achievements, skill_trees, rewards)
      values (${u.id}, ${Math.max(1, Math.floor(xp / 250))}, ${xp}, ${Math.floor(rnd() * 20)},
        ${sql.json(['Early Bird', 'Bug Squasher'].slice(0, 1 + Math.floor(rnd() * 2)))}, ${sql.json({ focus: 3, craft: 2 })}, ${sql.json([])})
    `;
  }
  console.log('Seeded gamification rows');

  // 7. Ethical metrics (8 weekly points)
  for (let w = 7; w >= 0; w--) {
    await sql`
      insert into ethical_metrics (date, pay_equity_score, workload_balance_score, dei_task_distribution_score, overtime_compliance)
      values (${iso(addDays(-w * 7))}, ${65 + Math.floor(rnd() * 30)}, ${60 + Math.floor(rnd() * 35)},
        ${60 + Math.floor(rnd() * 35)}, ${70 + Math.floor(rnd() * 28)})
    `;
  }
  console.log('Seeded ethical metrics');

  // 8. Sprint analytics
  await sql`insert into sprint_analytics (sprint_id, velocity, completion_rate, quality_score, team_sentiment) values (${sPast.id}, 34, 89, 82, 'positive')`;
  await sql`insert into sprint_analytics (sprint_id, velocity, completion_rate, quality_score, team_sentiment) values (${sActive.id}, ${doneCount}, 55, 78, 'neutral')`;
  console.log('Seeded sprint analytics');

  // 9. AI insights
  for (const [type, title, description, status] of [
    ['risk', 'Two urgent tasks share one assignee', 'Dmitri owns both critical-path items this sprint; consider redistributing to unblock review flow.', 'active'],
    ['velocity', 'Cycle time down 18% vs Sprint 11', 'Review-stage wait shrank after the CI speedup. Same pattern applies to QA hand-offs.', 'active'],
    ['wellbeing', 'Kwame logged overtime 3 days running', 'Stress trend rising with the release freeze. Suggest lighter load next sprint.', 'active'],
    ['suggestion', '4 tasks stuck in review > 5 days', 'Stale reviews correlate with missing reviewers. Enable review reminders from the automation page.', 'dismissed'],
  ]) {
    await sql`
      insert into ai_insights (type, title, description, status, created_at, expires_at)
      values (${type}, ${title}, ${description}, ${status}, now(), ${addDays(7).toISOString()})
    `;
  }
  console.log('Seeded AI insights');

  // 10. Calendar events (next 7 days)
  for (const [title, type, offset, hour, organizer] of [
    ['Daily standup', 'meeting', 1, 9, users[0].id],
    ['Sprint 12 mid-check', 'sprint', 2, 14, users[0].id],
    ['Design review: dashboard depth', 'meeting', 3, 11, users[0].id],
    ['Demo prep', 'demo', 4, 15, users[0].id],
    ['Sprint 12 review + demo', 'sprint', 6, 13, users[0].id],
    ['1:1 Amara / Lena', 'meeting', 5, 10, users[0].id],
  ]) {
    const start = addDays(offset);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (type === 'demo prep' ? 60 : 30));
    await sql`
      insert into calendar_events (title, description, start_time, end_time, location, event_type, organizer_id, is_all_day, attendees, color)
      values (${title}, ${`Seeded event for ${type}`}, ${start.toISOString()}, ${end.toISOString()}, 'Hangout',
        ${type}, ${organizer}, false, ${sql.json([users[0].id, users[1].id, users[2].id])}, ${type === 'sprint' ? 'violet' : 'blue'})
    `;
  }
  console.log('Seeded calendar events');

  // 11. Notifications for every user (demo bell content)
  for (const u of allUsers) {
    await sql`
      insert into notifications (user_id, type, title, body, is_read, metadata, created_at)
      values (${u.id}, 'sprint', ${'Sprint 12 is halfway done'}, ${'22 of 40 points completed. Two urgent items still open.'}, false,
        ${sql.json({ link: '/dashboard/sprints' })}, ${addDays(-1).toISOString()}),
        (${u.id}, 'mention', ${'Amara mentioned you in a review'}, ${'"Can you take a look at the burndown aggregation?"'}, false,
        ${sql.json({ link: '/dashboard/tasks' })}, ${addDays(-0.2).toISOString()}),
        (${u.id}, 'wellbeing', ${'Overtime detected last week'}, ${'Your workload trend is rising — consider a lighter sprint next cycle.'}, true,
        ${sql.json({ link: '/dashboard/team-wellbeing' })}, ${addDays(-3).toISOString()})
    `;
  }
  console.log('Seeded notifications');

  console.log('\nSeed complete: ' +
    `${allUsers.length} users, 3 sprints, ${inserted.length} tasks, ${kbTitles.length} kanban cards, ` +
    'wellbeing/gamification/ethics/analytics/insights/calendar/notifications populated.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1; })
  .finally(() => sql.end());
