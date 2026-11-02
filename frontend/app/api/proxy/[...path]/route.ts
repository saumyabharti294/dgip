import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `${BACKEND}/api/${path}${req.nextUrl.search}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `${BACKEND}/api/${path}`;
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const body = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `${BACKEND}/api/${path}`;
  try {
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
