'use client';

import { useState } from 'react';
import { FileText, Download, Calendar, HardDrive, ChevronLeft, ChevronRight, Loader2, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useReports } from '@/hooks/useReports';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function MyReportsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [allTokens, setAllTokens] = useState<(string | null)[]>([null]); // Store tokens for each page
  const itemsPerPage = 10;
  
  const { data, isLoading, error, refetch } = useReports(itemsPerPage, allTokens[currentPage - 1]);
  const { isPaidUser } = useAuth();

  // Format file size from bytes to MB
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Parse report type for display
  const formatReportType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Handle report download
  const handleDownload = (report: any) => {
    if (report.signedUrl) {
      window.open(report.signedUrl, '_blank');
    }
  };

  // Handle pagination
  const handleNextPage = () => {
    if (data?.nextToken && !allTokens.includes(data.nextToken)) {
      setAllTokens([...allTokens, data.nextToken]);
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!isPaidUser) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-grey-50 p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="text-center py-12">
              <CardContent>
                <FileSearch className="w-16 h-16 text-grey-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-grey-900 mb-2">Pro Feature</h2>
                <p className="text-grey-600 mb-6">
                  AI Reports are available for Pro users only. Upgrade to access comprehensive property analysis reports.
                </p>
                <Link href="/listings">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Upgrade to Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-grey-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/listings" className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Listings
            </Link>
            <h1 className="text-3xl font-bold text-grey-900 mt-4">My AI Reports</h1>
            <p className="text-grey-600 mt-2">View and download your generated property analysis reports</p>
          </div>

          {/* Reports List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-grey-900">Loading your reports...</p>
            </div>
          ) : error ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileSearch className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-grey-900 mb-2">Error Loading Reports</h2>
                <p className="text-grey-600 mb-4">We couldn't load your reports. Please try again.</p>
                <Button onClick={() => refetch()}>Retry</Button>
              </CardContent>
            </Card>
          ) : data?.items && data.items.length > 0 ? (
            <>
              <div className="grid gap-4 mb-6">
                {data.items.map((report) => (
                  <Card key={report.reportId} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-100 rounded-lg">
                              <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-grey-900 mb-1">
                                {report.propertyTitle}
                              </h3>
                              <div className="flex flex-wrap gap-4 text-sm text-grey-600">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Type:</span> {formatReportType(report.reportType)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(report.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="w-4 h-4" />
                                  {formatFileSize(report.size)}
                                </span>
                              </div>
                              <p className="text-xs text-grey-500 mt-2">
                                Report ID: {report.reportId}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            onClick={() => handleDownload(report)}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {(currentPage > 1 || data.nextToken) && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-grey-600">
                    Page {currentPage}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={!data.nextToken}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileSearch className="w-16 h-16 text-grey-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-grey-900 mb-2">No Reports Yet</h2>
                <p className="text-grey-600 mb-6">
                  You haven't generated any AI reports yet. Start by generating insights for a property.
                </p>
                <Link href="/listings">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Browse Properties
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}