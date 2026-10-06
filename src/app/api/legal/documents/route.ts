import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { legalDocumentsMeta } from "@/lib/legal/service";

function readPublicLegal(filename: string): string {
  const filePath = path.join(process.cwd(), "public", "legal", filename);
  return fs.readFileSync(filePath, "utf-8");
}

export async function GET() {
  try {
    const meta = legalDocumentsMeta();
    return NextResponse.json({
      ...meta,
      terms: readPublicLegal("terms-of-use.md"),
      privacy: readPublicLegal("privacy-policy.md"),
    });
  } catch (err) {
    console.error("[GET /api/legal/documents]", err);
    return NextResponse.json({ error: "Documentos legais indisponíveis" }, { status: 500 });
  }
}
