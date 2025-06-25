'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UploadStatusTracker } from '@/components/property/upload-status-tracker';

function UploadStatusContent() {
  const searchParams = useSearchParams();
  const executionArn = searchParams.get('executionArn');
  const propertyId = searchParams.get('propertyId');

  return (
    <UploadStatusTracker 
      executionArn={executionArn || undefined}
      propertyId={propertyId || undefined}
    />
  );
}

export default function UploadStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading upload status...</p>
        </div>
      </div>
    }>
      <UploadStatusContent />
    </Suspense>
  );
}