'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Upload, 
  FileImage,
  Home,
  Loader2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
}

interface UploadStatusTrackerProps {
  executionArn?: string;
  propertyId?: string;
  onComplete?: () => void;
}

export function UploadStatusTracker({ executionArn, propertyId, onComplete }: UploadStatusTrackerProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<UploadStep[]>([
    {
      id: 'upload',
      title: 'Uploading Images',
      description: 'Uploading property images to secure storage',
      status: 'completed',
      progress: 100,
    },
    {
      id: 'validate',
      title: 'Validating Data',
      description: 'Checking property information and image formats',
      status: 'processing',
      progress: 60,
    },
    {
      id: 'process',
      title: 'Processing Images',
      description: 'Optimizing images for different screen sizes',
      status: 'pending',
    },
    {
      id: 'create',
      title: 'Creating Listing',
      description: 'Saving your property listing to the database',
      status: 'pending',
    },
    {
      id: 'index',
      title: 'Indexing for Search',
      description: 'Making your listing searchable',
      status: 'pending',
    },
  ]);

  const [overallProgress, setOverallProgress] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate async processing steps
    const simulateProgress = async () => {
      const stepDurations = [2000, 3000, 4000, 2000, 1000];
      let currentStep = 1; // Start from validate since upload is complete

      for (let i = currentStep; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
        
        setSteps(prev => {
          const newSteps = [...prev];
          // Complete current step
          if (i > 0) {
            newSteps[i - 1].status = 'completed';
            newSteps[i - 1].progress = 100;
          }
          // Start next step
          if (i < newSteps.length) {
            newSteps[i].status = 'processing';
            newSteps[i].progress = 0;
          }
          return newSteps;
        });

        // Animate progress for current step
        const progressInterval = setInterval(() => {
          setSteps(prev => {
            const newSteps = [...prev];
            if (newSteps[i] && newSteps[i].status === 'processing') {
              const currentProgress = newSteps[i].progress || 0;
              if (currentProgress < 90) {
                newSteps[i].progress = currentProgress + 10;
              }
            }
            return newSteps;
          });
          
          setOverallProgress((i + 1) * 20);
        }, 200);

        await new Promise(resolve => setTimeout(resolve, stepDurations[i] - 400));
        clearInterval(progressInterval);
      }

      // Complete all steps
      setSteps(prev => prev.map(step => ({ ...step, status: 'completed', progress: 100 })));
      setOverallProgress(100);
      setIsComplete(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        onComplete?.();
        router.push('/listings?status=success');
      }, 2000);
    };

    simulateProgress();
  }, []);

  const getStepIcon = (step: UploadStep) => {
    switch (step.id) {
      case 'upload':
        return <Upload className="w-5 h-5" />;
      case 'validate':
        return <AlertCircle className="w-5 h-5" />;
      case 'process':
        return <FileImage className="w-5 h-5" />;
      case 'create':
        return <Home className="w-5 h-5" />;
      case 'index':
        return <CheckCircle2 className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50 animate-pulse';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container mx-auto px-6 max-w-3xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {isComplete ? 'Property Listed Successfully!' : 'Processing Your Property'}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {isComplete 
                ? 'Your property is now live and visible to thousands of potential buyers'
                : 'Please wait while we process your property listing'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Steps */}
            <div className="space-y-4 mt-8">
              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index < steps.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${getStepColor(step.status)}`}>
                      {step.status === 'processing' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        getStepIcon(step)
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{step.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      
                      {step.status === 'processing' && step.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                    
                    {step.status === 'completed' && (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Success State */}
            {isComplete && (
              <div className="mt-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Your property listing has been created successfully and is now live!
                  </p>
                  
                  <Button 
                    onClick={() => router.push('/listings')}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                  >
                    View All Listings
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Additional Info */}
            {!isComplete && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    This process typically takes 1-2 minutes. You can safely leave this page 
                    and we'll notify you when your listing is ready.
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}