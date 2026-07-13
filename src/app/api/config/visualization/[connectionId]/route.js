import { upsertVisualization, deleteVisualization } from "../../../../dashboard/lib/GoogleDrive/config";
 
export async function PUT(req, { params }) {
    try {
        const viz    = await req.json();
        const result = await upsertVisualization(params.connectionId, viz);
        return Response.json({ ok: true, visualization: result });
    } catch (err) {
        console.error("[PUT /api/config/visualizations/[connectionId]] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
export async function DELETE(req, { params }) {
    try {
        const { vizId } = await req.json();
        await deleteVisualization(params.connectionId, vizId);
        return Response.json({ ok: true });
    } catch (err) {
        console.error("[DELETE /api/config/visualizations/[connectionId]] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
