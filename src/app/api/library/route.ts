import { NextResponse } from "next/server";
import { getLibraryPathsInfo } from "@/lib/library-paths";

export async function GET() {
  const paths = getLibraryPathsInfo();
  return NextResponse.json({
    ...paths,
    isLocalApp: true,
    hint: "Samples copiados vão para Documents/BeatStack Library. Cole o caminho no browser de arquivos do DAW.",
  });
}
