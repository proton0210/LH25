'use client';

import { useEffect, useState, useRef } from 'react';
import { Mail, Brain, Sparkles, CheckCircle, Zap, FileText, TrendingUp, Shield, Home, Clock, MapPin, DollarSign, BarChart3, AlertCircle, X } from 'lucide-react';
import { generateClient } from 'aws-amplify/api';
import { generatePropertyReport } from '@/lib/graphql/mutations';
import { getReportStatus } from '@/lib/graphql/queries';
import { useRouter } from 'next/navigation';

interface AIProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: any;
}

export function AIProcessingModal({ isOpen, onClose, property }: AIProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showingFeatures, setShowingFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionArn, setExecutionArn] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const client = generateClient();
  const router = useRouter();

  const steps = [
    { icon: Home, text: "Analyzing property details", color: "from-blue-500 to-indigo-600" },
    { icon: MapPin, text: "Evaluating neighborhood data", color: "from-purple-500 to-pink-600" },
    { icon: TrendingUp, text: "Processing market trends", color: "from-green-500 to-emerald-600" },
    { icon: DollarSign, text: "Calculating investment metrics", color: "from-orange-500 to-red-600" },
    { icon: FileText, text: "Generating comprehensive report", color: "from-indigo-500 to-purple-600" }
  ];

  const features = [
    { icon: BarChart3, title: "Market Analysis", description: "Compare with 500+ similar properties" },
    { icon: Shield, title: "Risk Assessment", description: "Investment safety score & projections" },
    { icon: Zap, title: "AI Insights", description: "Personalized recommendations" }
  ];

  // Helper functions to map property data
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

  const generateAIReport = async () => {
    if (!property) return;
    
    try {
      setError(null);
      console.log('Starting AI report generation for property:', property);
      
      // Map property data to GenerateReportInput matching the schema
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
        amenities: property.amenities || property.features || [],
        reportType: 'MARKET_ANALYSIS',
        includeDetailedAmenities: true
      };

      console.log('Sending mutation with input:', input);
      
      const result = await client.graphql({
        query: generatePropertyReport,
        variables: { input }
      });

      console.log('Mutation result:', result);
      
      if (result.data?.generatePropertyReport?.executionArn) {
        setExecutionArn(result.data.generatePropertyReport.executionArn);
        pollReportStatus(result.data.generatePropertyReport.executionArn);
      } else {
        throw new Error('No execution ARN received from server');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate AI insights. Please try again.');
    }
  };

  const pollReportStatus = (arn: string) => {
    console.log('Starting to poll report status for:', arn);
    
    pollingInterval.current = setInterval(async () => {
      try {
        const result = await client.graphql({
          query: getReportStatus,
          variables: { executionArn: arn }
        });

        console.log('Poll result:', result);

        if (result.data?.getReportStatus) {
          const status = result.data.getReportStatus.status;
          
          if (status === 'SUCCEEDED') {
            setReportGenerated(true);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
            }
          } else if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'ABORTED') {
            setError(`Report generation ${status.toLowerCase()}. Please try again.`);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
            }
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  useEffect(() => {
    if (isOpen && property) {
      // Reset states
      setProgress(0);
      setCurrentStep(0);
      setShowingFeatures(false);
      setError(null);
      setReportGenerated(false);
      
      // Start report generation
      generateAIReport();
      
      // Show features after 1 second
      setTimeout(() => setShowingFeatures(true), 1000);
      
      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            // Auto-close modal after reaching 100%
            setTimeout(() => {
              onClose();
            }, 500);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
      
      // Step animation
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            clearInterval(stepInterval);
            return steps.length - 1;
          }
          return prev + 1;
        });
      }, 2000);
      
      return () => {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [isOpen, property]);

  if (!isOpen) {
    return null;
  }

  const currentStepData = steps[currentStep];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative max-w-2xl w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-b from-white to-grey-50 rounded-3xl shadow-2xl overflow-hidden border border-grey-200">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-500/5 to-purple-600/5 animate-gradient-xy"></div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white text-grey-600 hover:text-grey-900 transition-all duration-200 shadow-lg z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Content */}
          <div className="relative p-10">
            {/* Header with progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Analysis in Progress
                </h2>
                <div className="flex items-center gap-2 text-grey-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{Math.ceil((100 - progress) / 10)}s remaining</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-2 bg-grey-200 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-grey-500">Initializing</span>
                <span className="text-xs text-grey-500 font-medium">{progress}%</span>
                <span className="text-xs text-grey-500">Complete</span>
              </div>
            </div>
            
            {/* Central Animation Area */}
            <div className="relative h-64 mb-8">
              {/* Background circuit pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-circuit-pattern"></div>
              </div>
              
              {/* Main AI Brain Animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Outer rotating ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-purple-300 animate-spin-slow"></div>
                  
                  {/* Middle pulsing ring */}
                  <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 animate-pulse"></div>
                  
                  {/* Data points orbiting */}
                  <div className="absolute inset-0">
                    {[0, 60, 120, 180, 240, 300].map((degree, index) => (
                      <div
                        key={index}
                        className="absolute top-1/2 left-1/2 w-3 h-3"
                        style={{
                          transform: `rotate(${degree + (currentStep * 60)}deg) translateX(80px)`,
                          transition: 'transform 2s ease-in-out'
                        }}
                      >
                        <div className={`w-full h-full rounded-full bg-gradient-to-r ${currentStepData.color} animate-pulse`}></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Center icon container */}
                  <div className="absolute inset-8 flex items-center justify-center">
                    <div className="relative">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${currentStepData.color} rounded-2xl blur-xl animate-pulse`}></div>
                      
                      {/* Icon background */}
                      <div className="relative bg-white rounded-2xl p-6 shadow-lg transform transition-all duration-500 hover:scale-105">
                        <Brain className="w-16 h-16 text-purple-600 animate-pulse-slow" />
                        
                        {/* Sparkles */}
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-pink-500 animate-sparkle" />
                        <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-purple-500 animate-sparkle-delayed" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current step indicator */}
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                  <currentStepData.icon className={`w-5 h-5 bg-gradient-to-r ${currentStepData.color} bg-clip-text text-transparent`} />
                  <span className="font-medium text-grey-800">{currentStepData.text}</span>
                </div>
              </div>
            </div>
            
            {/* Features grid */}
            <div className={`grid grid-cols-3 gap-4 mb-8 transition-all duration-1000 ${showingFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-white to-grey-50 p-4 rounded-xl border border-grey-200 shadow-sm hover:shadow-md transition-all duration-300"
                  style={{ 
                    animationDelay: `${index * 200}ms`,
                    animation: showingFeatures ? 'slideUp 0.5s ease-out forwards' : 'none'
                  }}
                >
                  <feature.icon className="w-8 h-8 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-grey-900 text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-grey-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
            
            {/* Bottom section */}
            <div className="space-y-4">
              {/* Email notification */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-grey-900">You'll Receive an Email</h3>
                </div>
                <p className="text-sm text-grey-700 leading-relaxed ml-11">
                  Once your AI insights are ready, we'll send you a detailed report directly to your email inbox within 2-3 minutes.
                </p>
              </div>
              
              {/* My Reports availability */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-grey-900">Available in My Reports</h3>
                </div>
                <p className="text-sm text-grey-700 leading-relaxed ml-11">
                  Your AI-generated insights will also be permanently saved in the <span className="font-semibold text-purple-600">"My Reports"</span> tab 
                  for easy access anytime.
                </p>
              </div>
              
              {/* What's included */}
              <div className="bg-gradient-to-br from-grey-50 to-white rounded-xl p-4 border border-grey-200">
                <h4 className="text-xs font-semibold text-grey-500 uppercase tracking-wider mb-2">Your Report Will Include:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-grey-700">Market Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-grey-700">Price Predictions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-grey-700">Investment ROI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-grey-700">Risk Assessment</span>
                  </div>
                </div>
              </div>
              
              {/* Error State */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Success State */}
              {reportGenerated && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-700">Report Generated Successfully!</p>
                      <p className="text-sm text-green-600">Redirecting to My Reports...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes gradient-xy {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(-20px) translateY(-20px);
          }
          50% {
            transform: translateX(20px) translateY(-10px);
          }
          75% {
            transform: translateX(-10px) translateY(20px);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }
        
        @keyframes sparkle-delayed {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(-180deg);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-gradient-xy {
          animation: gradient-xy 10s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
        
        .animate-sparkle-delayed {
          animation: sparkle-delayed 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .bg-circuit-pattern {
          background-image: 
            linear-gradient(90deg, #e5e7eb 1px, transparent 1px),
            linear-gradient(180deg, #e5e7eb 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}