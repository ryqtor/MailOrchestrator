import { clerkMiddleware } from '@clerk/nextjs/server';

// Ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists in edge runtime to prevent MIDDLEWARE_INVOCATION_FAILED on Vercel
if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
    'pk_test_Y2xlcmsuaW5jbHVkZWQuY2xlcmsuYWNjb3VudHMuZGV2JA';
}

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
