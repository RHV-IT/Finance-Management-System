import { getConnections, addConnection } from "../../../dashboard/lib/GoogleDrive/config";
 
export async function GET() {
    console.log("API route hit — GET /api/config/connections");
    try {
        const connections = await getConnections();
        console.log("Connections fetched:", connections.length);
        return Response.json(connections);
    } catch (err) {
        console.error("FULL ERROR:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
export async function POST(req) {
    try {
        const body    = await req.json();
        const newConn = await addConnection(body);
        return Response.json({ ok: true, connection: newConn });
    } catch (err) {
        console.error("[POST /api/config/connections] ERROR:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
