import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/projects', '/tasks', '/timesheets', '/resources']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check if user has auth token/session
    const userId = request.cookies.get('user_id')?.value
    
    if (!userId) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Allow login page to be accessible
  if (pathname === '/login') {
    const userId = request.cookies.get('user_id')?.value
    if (userId) {
      // Redirect to dashboard if already logged in
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
