import { seedDepartments } from "../../../../dashboard/lib/GoogleDrive/departments";

// ONE-TIME MIGRATION ROUTE. Hit this once (e.g. paste the URL in your
// browser, or `curl -X POST`) to populate config.departments for the
// first time. seedDepartments() itself refuses to run if config.departments
// already has data, so accidentally hitting this twice is safe — it just
// returns an error instead of wiping anything out.
//
// There's no login/auth check on this route, same as the rest of your API
// routes today (per "don't worry about the server" for now) — but unlike
// the others, this one only needs to work ONCE. Delete this whole file
// after you've run it successfully, so it's not sitting there indefinitely
// as an unauthenticated door into your config file.
export async function POST() {
    try {
        const departments = await seedDepartments();
        return Response.json({ ok: true, count: departments.length, departments });
    } catch (err) {
        console.error("[POST /api/config/departments/seed] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}