'use client';

import { useEffect } from 'react';
import { Mail, Brain, Sparkles, CheckCircle } from 'lucide-react';

interface AIProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIProcessingModal({ isOpen, onClose }: AIProcessingModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="relative max-w-lg w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-purple-600/10 animate-gradient-shift"></div>
          
          {/* Content */}
          <div className="relative p-8 text-center">
            {/* AI Animation */}
            <div className="relative w-40 h-40 mx-auto mb-8">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 animate-pulse"></div>
              
              {/* Multiple orbiting particles */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full animate-orbit"></div>
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 bg-pink-500 rounded-full animate-orbit-delayed-1"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rounded-full animate-orbit-delayed-2"></div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-3 bg-pink-600 rounded-full animate-orbit-delayed-3"></div>
              </div>
              
              {/* Center brain with glow effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative bg-white rounded-full p-6 shadow-lg">
                    <Brain className="w-16 h-16 text-purple-600 animate-pulse-slow" />
                  </div>
                </div>
              </div>
              
              {/* Sparkles around */}
              <Sparkles className="absolute top-4 right-4 w-6 h-6 text-pink-500 animate-sparkle" />
              <Sparkles className="absolute bottom-4 left-4 w-6 h-6 text-purple-500 animate-sparkle-delayed" />
            </div>
            
            <h2 className="text-2xl font-bold text-grey-900 mb-3">
              AI Agent Working on Your Report
            </h2>
            
            <p className="text-grey-600 mb-6 leading-relaxed">
              Our advanced AI is analyzing the property and generating comprehensive insights. 
              This process typically takes 2-3 minutes.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-3 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">You'll receive an email when ready</span>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-purple-600">
                <Mail className="w-5 h-5" />
                <span className="text-sm">Check your inbox in a few minutes</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
              <p className="text-sm text-grey-700">
                <span className="font-semibold">Pro Tip:</span> Your report will also be available in the 
                <span className="font-semibold text-purple-600"> My Reports</span> section once completed.
              </p>
            </div>
            
            {/* Processing status */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-grey-600">Processing your request</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          33% {
            transform: translateX(-30px) translateY(-30px);
          }
          66% {
            transform: translateX(30px) translateY(30px);
          }
        }
        
        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(70px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(70px) rotate(-360deg);
          }
        }
        
        @keyframes orbit-delayed-1 {
          from {
            transform: rotate(90deg) translateX(70px) rotate(-90deg);
          }
          to {
            transform: rotate(450deg) translateX(70px) rotate(-450deg);
          }
        }
        
        @keyframes orbit-delayed-2 {
          from {
            transform: rotate(180deg) translateX(70px) rotate(-180deg);
          }
          to {
            transform: rotate(540deg) translateX(70px) rotate(-540deg);
          }
        }
        
        @keyframes orbit-delayed-3 {
          from {
            transform: rotate(270deg) translateX(70px) rotate(-270deg);
          }
          to {
            transform: rotate(630deg) translateX(70px) rotate(-630deg);
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
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }
        
        .animate-orbit {
          animation: orbit 4s linear infinite;
        }
        
        .animate-orbit-delayed-1 {
          animation: orbit-delayed-1 4s linear infinite;
        }
        
        .animate-orbit-delayed-2 {
          animation: orbit-delayed-2 4s linear infinite;
        }
        
        .animate-orbit-delayed-3 {
          animation: orbit-delayed-3 4s linear infinite;
        }
        
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .animate-sparkle-delayed {
          animation: sparkle-delayed 2s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}