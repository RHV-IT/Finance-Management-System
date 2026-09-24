import { getDepartments, addDepartment } from "../../../dashboard/lib/GoogleDrive/departments";

export async function GET() {
    try {
        const departments = await getDepartments();
        return Response.json(departments);
    } catch (err) {
        console.error("[GET /api/config/departments] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body    = await req.json();
        const newDept = await addDepartment(body);
        return Response.json({ ok: true, department: newDept });
    } catch (err) {
        console.error("[POST /api/config/departments] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}