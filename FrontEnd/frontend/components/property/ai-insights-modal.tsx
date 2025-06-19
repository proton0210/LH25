'use client';

import { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, MapPin, DollarSign, Home, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
}

export function AIInsightsModal({ isOpen, onClose, property }: AIInsightsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (isOpen && property) {
      // Simulate AI analysis
      setIsLoading(true);
      setTimeout(() => {
        setInsights(generateMockInsights(property));
        setIsLoading(false);
      }, 2000);
    }
  }, [isOpen, property]);

  if (!isOpen || !property) return null;

  const generateMockInsights = (prop: any) => {
    const basePrice = prop.price;
    const pricePerSqft = Math.round(basePrice / prop.squareFeet);
    const marketValue = basePrice * (0.9 + Math.random() * 0.2); // ±10% variation
    const rentEstimate = prop.listingType === 'For Sale' ? Math.round(basePrice * 0.005) : prop.price;
    const appreciation = 3 + Math.random() * 4; // 3-7% appreciation
    
    return {
      marketAnalysis: {
        currentPrice: basePrice,
        estimatedMarketValue: Math.round(marketValue),
        pricePerSqft,
        marketTrend: marketValue > basePrice ? 'above' : 'below',
        percentDiff: Math.abs(Math.round(((marketValue - basePrice) / basePrice) * 100))
      },
      investment: {
        monthlyRent: rentEstimate,
        annualROI: ((rentEstimate * 12) / basePrice * 100).toFixed(1),
        capRate: ((rentEstimate * 12 - basePrice * 0.02) / basePrice * 100).toFixed(1),
        appreciation: appreciation.toFixed(1)
      },
      neighborhood: {
        walkScore: Math.floor(60 + Math.random() * 40),
        transitScore: Math.floor(50 + Math.random() * 50),
        schoolRating: Math.floor(6 + Math.random() * 4),
        crimeRate: ['Very Low', 'Low', 'Moderate'][Math.floor(Math.random() * 3)]
      },
      risks: [
        prop.squareFeet < 1000 && 'Small property size may limit buyer pool',
        prop.bedrooms === 0 && 'Studio apartments have limited family appeal',
        prop.price > 1000000 && 'High price point narrows potential buyers',
        prop.listingType === 'For Rent' && rentEstimate > 3000 && 'High rent may increase vacancy risk'
      ].filter(Boolean),
      opportunities: [
        prop.city === 'Austin' && 'Fast-growing tech hub with strong job market',
        prop.city === 'Miami' && 'Popular destination for remote workers',
        prop.squareFeet > 2000 && 'Spacious property suitable for families',
        prop.bedrooms >= 3 && 'High demand from families',
        appreciation > 5 && 'Area showing strong appreciation potential'
      ].filter(Boolean)
    };
  };

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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-grey-900">Analyzing property data...</p>
              <p className="text-sm text-grey-600 mt-1">Our AI is crunching the numbers</p>
            </div>
          ) : insights && (
            <div className="space-y-6">
              {/* Market Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Market Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-grey-600">Listed Price</p>
                    <p className="text-2xl font-bold text-grey-900">
                      ${insights.marketAnalysis.currentPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">AI Estimated Value</p>
                    <p className="text-2xl font-bold text-grey-900">
                      ${insights.marketAnalysis.estimatedMarketValue.toLocaleString()}
                    </p>
                    <p className={`text-sm ${insights.marketAnalysis.marketTrend === 'above' ? 'text-green-600' : 'text-red-600'}`}>
                      {insights.marketAnalysis.percentDiff}% {insights.marketAnalysis.marketTrend} market
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Price per Sq Ft</p>
                    <p className="text-xl font-semibold">${insights.marketAnalysis.pricePerSqft}</p>
                  </div>
                </div>
              </Card>

              {/* Investment Metrics */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Investment Potential
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-grey-600">Est. Monthly Rent</p>
                    <p className="text-xl font-semibold">${insights.investment.monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Annual ROI</p>
                    <p className="text-xl font-semibold text-green-600">{insights.investment.annualROI}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Cap Rate</p>
                    <p className="text-xl font-semibold">{insights.investment.capRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Appreciation</p>
                    <p className="text-xl font-semibold text-purple-600">+{insights.investment.appreciation}%/yr</p>
                  </div>
                </div>
              </Card>

              {/* Neighborhood Insights */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-600" />
                  Neighborhood Insights
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-grey-600">Walk Score</p>
                    <p className="text-xl font-semibold">{insights.neighborhood.walkScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Transit Score</p>
                    <p className="text-xl font-semibold">{insights.neighborhood.transitScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">School Rating</p>
                    <p className="text-xl font-semibold">{insights.neighborhood.schoolRating}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-grey-600">Crime Rate</p>
                    <p className="text-xl font-semibold">{insights.neighborhood.crimeRate}</p>
                  </div>
                </div>
              </Card>

              {/* Risks & Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {insights.risks.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Potential Risks
                    </h3>
                    <ul className="space-y-2">
                      {insights.risks.map((risk: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-grey-700">
                          <span className="text-red-500 mt-1">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {insights.opportunities.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Opportunities
                    </h3>
                    <ul className="space-y-2">
                      {insights.opportunities.map((opp: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-grey-700">
                          <span className="text-green-500 mt-1">•</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              {/* AI Summary */}
              <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="text-lg font-semibold mb-3">AI Summary</h3>
                <p className="text-grey-700 leading-relaxed">
                  This property {insights.marketAnalysis.marketTrend === 'above' ? 'appears to be priced competitively' : 'may be slightly overpriced'} 
                  {' '}compared to similar properties in the area. With an estimated {insights.investment.annualROI}% annual ROI and 
                  {' '}{insights.investment.appreciation}% yearly appreciation potential, it presents 
                  {' '}{parseFloat(insights.investment.annualROI) > 5 ? 'a strong' : 'a moderate'} investment opportunity. 
                  The neighborhood scores well on {insights.neighborhood.walkScore > 70 ? 'walkability' : 'transit access'}, 
                  making it attractive for {property.bedrooms > 2 ? 'families' : 'young professionals'}.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}