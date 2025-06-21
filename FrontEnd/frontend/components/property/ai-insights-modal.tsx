'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Brain, FileText, Download, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateClient } from 'aws-amplify/api';
import { generatePropertyReport } from '@/lib/graphql/mutations';
import { getReportStatus } from '@/lib/graphql/queries';
import { useAuth } from '@/hooks/useAuth';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
}

export function AIInsightsModal({ isOpen, onClose, property }: AIInsightsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState('');
  const [executionArn, setExecutionArn] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const client = generateClient();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && property) {
      setError(null);
      setReportUrl(null);
      setExecutionArn(null);
      generateAIReport();
    }
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isOpen, property]);

  const generateAIReport = async () => {
    try {
      setIsGenerating(true);
      setGenerationPhase('Initializing AI analysis engine...');

      // Helper function to map listing type to enum value
      const mapListingType = (type: string): string => {
        const mappings: { [key: string]: string } = {
          'For Sale': 'FOR_SALE',
          'For Rent': 'FOR_RENT',
          'Sold': 'SOLD',
          'Rented': 'RENTED',
          'FOR_SALE': 'FOR_SALE',
          'FOR_RENT': 'FOR_RENT',
          'SOLD': 'SOLD',
          'RENTED': 'RENTED'
        };
        return mappings[type] || 'FOR_SALE';
      };

      // Helper function to map property type to enum value
      const mapPropertyType = (type: string): string => {
        const mappings: { [key: string]: string } = {
          'Single Family': 'SINGLE_FAMILY',
          'Condo': 'CONDO',
          'Townhouse': 'TOWNHOUSE',
          'Multi Family': 'MULTI_FAMILY',
          'Land': 'LAND',
          'Commercial': 'COMMERCIAL',
          'Other': 'OTHER',
          'SINGLE_FAMILY': 'SINGLE_FAMILY',
          'CONDO': 'CONDO',
          'TOWNHOUSE': 'TOWNHOUSE',
          'MULTI_FAMILY': 'MULTI_FAMILY',
          'LAND': 'LAND',
          'COMMERCIAL': 'COMMERCIAL',
          'OTHER': 'OTHER'
        };
        return mappings[type] || 'OTHER';
      };

      // Map property data to GenerateReportInput with validation
      const input = {
        title: property.title || 'Untitled Property',
        description: property.description || 'No description available',
        price: property.price || 0,
        address: property.address || 'Address not specified',
        city: property.city || 'Unknown City',
        state: property.state || 'Unknown State',
        zipCode: property.zipCode || '00000',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFeet: property.squareFeet || 0,
        propertyType: mapPropertyType(property.propertyType),
        listingType: mapListingType(property.listingType),
        yearBuilt: property.yearBuilt || null,
        lotSize: property.lotSize || null,
        amenities: property.amenities || [],
        reportType: 'MARKET_ANALYSIS',
        includeDetailedAmenities: true,
        cognitoUserId: user?.userId || undefined
      };

      console.log('GeneratePropertyReport input:', input);
      
      setGenerationPhase('Collecting property information...');
      
      const response = await client.graphql({
        query: generatePropertyReport,
        variables: { input },
        authMode: 'userPool',
      });
      
      if ('data' in response && response.data.generatePropertyReport) {
        const report = response.data.generatePropertyReport;
        
        // If we have a signed URL immediately, use it
        if (report.signedUrl) {
          setReportUrl(report.signedUrl);
          setIsGenerating(false);
        } 
        // Otherwise, start polling for report status
        else if (report.executionArn) {
          setExecutionArn(report.executionArn);
          setGenerationPhase('Starting comprehensive analysis...');
          startPolling(report.executionArn);
        } else {
          throw new Error('No execution ARN or signed URL received');
        }
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating AI report:', error);
      
      if (error.errors && error.errors.length > 0) {
        setError(`Error: ${error.errors[0].message}`);
      } else {
        setError('Failed to generate AI report. Please try again.');
      }
      setIsGenerating(false);
    }
  };

  const startPolling = (arn: string) => {
    let pollCount = 0;
    const maxPolls = 60; // Poll for max 2 minutes (60 * 2 seconds)
    
    const phases = [
      'Analyzing past transactions in the area...',
      'Searching for nearby schools and ratings...',
      'Looking for hospitals and medical facilities...',
      'Examining local shopping centers...',
      'Evaluating public transportation access...',
      'Calculating market trends...',
      'Comparing with similar properties...',
      'Analyzing crime statistics...',
      'Checking environmental factors...',
      'Reviewing zoning regulations...',
      'Calculating investment metrics...',
      'Evaluating rental potential...',
      'Analyzing neighborhood demographics...',
      'Studying price appreciation trends...',
      'Examining property tax history...',
      'Checking flood zone status...',
      'Reviewing HOA information...',
      'Analyzing walkability scores...',
      'Evaluating noise levels...',
      'Generating personalized insights...',
      'Compiling comprehensive report...',
      'Finalizing your analysis...'
    ];
    
    // Create a separate interval for rotating messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % phases.length;
      setGenerationPhase(phases[messageIndex]);
    }, 2000); // Change message every 2 seconds
    
    pollingInterval.current = setInterval(async () => {
      pollCount++;
      
      try {
        const statusResponse = await client.graphql({
          query: getReportStatus,
          variables: { executionArn: arn },
          authMode: 'userPool',
        });
        
        if ('data' in statusResponse && statusResponse.data.getReportStatus) {
          const status = statusResponse.data.getReportStatus;
          
          if ((status.status === 'SUCCEEDED' || status.status === 'COMPLETED') && status.signedUrl) {
            setReportUrl(status.signedUrl);
            setIsGenerating(false);
            clearInterval(messageInterval);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
            }
          } else if (status.status === 'FAILED') {
            setError(status.error || 'Report generation failed');
            setIsGenerating(false);
            clearInterval(messageInterval);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
            }
          }
        }
      } catch (error) {
        console.error('Error polling report status:', error);
      }
      
      if (pollCount >= maxPolls) {
        setError('Report generation timed out. Please try again.');
        setIsGenerating(false);
        clearInterval(messageInterval);
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-7 h-7" />
                AI Property Insights
              </h2>
              <p className="mt-1 text-purple-100">{property.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20">
              {/* Futuristic AI Animation */}
              <div className="relative w-32 h-32 mb-8">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-pulse"></div>
                
                {/* Middle ring spinning */}
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 animate-spin"></div>
                
                {/* Inner ring counter-spinning */}
                <div className="absolute inset-4 rounded-full border-4 border-transparent border-b-purple-600 border-l-pink-600 animate-spin-reverse"></div>
                
                {/* Center brain icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <Brain className="w-12 h-12 text-purple-600 animate-pulse" />
                    <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-pink-500 animate-sparkle" />
                    <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-purple-500 animate-sparkle-delayed" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-grey-900 mb-2">Generating AI Report</h3>
              <p className="text-sm text-grey-600 mb-4">{generationPhase}</p>
              
              {/* Progress indicator */}
              <div className="w-64 h-2 bg-grey-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 animate-progress"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
              <p className="text-lg font-medium text-grey-900">Unable to Generate Report</p>
              <p className="text-sm text-grey-600 mt-1">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  generateAIReport();
                }}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : reportUrl ? (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Your AI Property Report is Ready
                  </h3>
                </div>
                
                <p className="text-grey-600 mb-6">
                  Your comprehensive AI-generated property analysis report has been created. 
                  The report includes market analysis, investment insights, neighborhood data, 
                  and personalized recommendations.
                </p>
                
                <div className="flex gap-4">
                  <Button
                    onClick={() => window.open(reportUrl, '_blank')}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Report
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = reportUrl;
                      link.download = `${property.title.replace(/\s+/g, '_')}_AI_Report.pdf`;
                      link.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </div>
              </Card>
              
              {/* Report preview iframe */}
              <Card className="p-0 overflow-hidden">
                <iframe
                  src={reportUrl}
                  className="w-full h-[600px] border-0"
                  title="AI Property Report"
                />
              </Card>
            </div>
          ) : null}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes sparkle-delayed {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 2s linear infinite;
        }
        
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .animate-sparkle-delayed {
          animation: sparkle-delayed 2s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}