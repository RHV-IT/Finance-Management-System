import { getConnectionById, updateConnection, deleteConnection } from "../../../../lib/GoogleDrive/config";
 
export async function GET(req, { params }) {
    try {
        const conn = await getConnectionById(params.id);
        if (!conn) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json(conn);
    } catch (err) {
        console.error("[GET /api/config/connections/[id]] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
export async function PATCH(req, { params }) {
    try {
        const updates = await req.json();
        const updated = await updateConnection(params.id, updates);
        return Response.json({ ok: true, connection: updated });
    } catch (err) {
        console.error("[PATCH /api/config/connections/[id]] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
export async function DELETE(req, { params }) {
    try {
        await deleteConnection(params.id);
        return Response.json({ ok: true });
    } catch (err) {
        console.error("[DELETE /api/config/connections/[id]] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}