import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/jobs") return NextResponse.next();
  if (request.nextUrl.searchParams.has("portal")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.searchParams.set("portal", "job");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/jobs"],
};
