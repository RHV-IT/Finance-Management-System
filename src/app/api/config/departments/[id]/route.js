import { updateDepartment, deleteDepartment } from "../../../../dashboard/lib/GoogleDrive/departments";

export async function PATCH(req, { params }) {
    try {
        const { id }  = params;
        const updates = await req.json();
        const updated = await updateDepartment(id, updates);
        return Response.json({ ok: true, department: updated });
    } catch (err) {
        console.error("[PATCH /api/config/departments/:id] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = params;
        await deleteDepartment(id);
        return Response.json({ ok: true });
    } catch (err) {
        console.error("[DELETE /api/config/departments/:id] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}