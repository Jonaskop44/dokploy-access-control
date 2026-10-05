import { NextResponse, type NextRequest } from "next/server";
import { axiosInstance } from "@/api/axios-instance";

const LOGIN_PATH = "/";
const DASHBOARD_PATH = "/dashboard";
const REFRESH_URL = axiosInstance.getUri({ url: "/api/v1/auth/refresh" });

// The access cookie only lives a few minutes. The refresh cookie keeps the
// session alive: persistent with "remember me", per browser session without.
// Returns the rotated cookies, or an empty list if the session is gone.
const refreshSession = async (request: NextRequest) => {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  if (!refreshToken) return [];

  const headers = new Headers({ cookie: `refreshToken=${refreshToken}` });
  const clientIp = request.headers.get("x-forwarded-for");
  // Keeps the API's per-IP throttling per user instead of per frontend server.
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  try {
    const response = await fetch(REFRESH_URL, { method: "POST", headers });
    return response.ok ? response.headers.getSetCookie() : [];
  } catch {
    return [];
  }
};

const getRedirectPath = (isLoggedIn: boolean, pathname: string) => {
  const isLoginPage = pathname === LOGIN_PATH;

  if (isLoggedIn && isLoginPage) return DASHBOARD_PATH;
  if (!isLoggedIn && !isLoginPage) return LOGIN_PATH;
  return null;
};

export async function proxy(request: NextRequest) {
  const hasAccessToken = request.cookies.has("accessToken");
  const renewedCookies = hasAccessToken ? [] : await refreshSession(request);
  const isLoggedIn = hasAccessToken || renewedCookies.length > 0;

  const redirectPath = getRedirectPath(isLoggedIn, request.nextUrl.pathname);
  const response = redirectPath
    ? NextResponse.redirect(new URL(redirectPath, request.url))
    : NextResponse.next();

  for (const cookie of renewedCookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
