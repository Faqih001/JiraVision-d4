'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the CORS handler with no SSR
const CorsHandler = dynamic(() => import('@/app/providers/cors-handler'), { ssr: false });

export default function ClientCorsWrapper() {
  return process.env.NODE_ENV === 'development' ? <CorsHandler /> : null;
}
