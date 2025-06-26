'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/hooks/useAuth';
import { useUserDetails } from '@/hooks/useUserDetails';
import { api, PropertyStatus } from '@/lib/api/graphql-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  Plus,
  ArrowLeft,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bath,
  BedDouble,
  Square,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MyListingsPage() {
  const { user } = useAuth();
  const { data: userDetails, isLoading: userDetailsLoading } = useUserDetails();
  const router = useRouter();
  
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Fetch user's properties
  useEffect(() => {
    if (userDetails?.userId) {
      fetchMyProperties();
    }
  }, [userDetails?.userId]);

  const fetchMyProperties = async (token?: string) => {
    if (!userDetails?.userId) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.listMyProperties({
        userId: userDetails.userId,
        limit: 12,
        nextToken: token || undefined
      });
      
      if (token) {
        setProperties(prev => [...prev, ...response.items]);
      } else {
        setProperties(response.items);
      }
      
      setNextToken(response.nextToken || null);
      setHasMore(!!response.nextToken);
    } catch (err) {
      if (err instanceof Error && err.message.includes('User not found')) {
        setError('User profile not found. Please ensure your profile is set up correctly.');
      } else if (err instanceof Error && err.message.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to load your properties. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (nextToken) {
      fetchMyProperties(nextToken);
    }
  };


  const getStatusBadge = (status: PropertyStatus) => {
    const statusConfig = {
      [PropertyStatus.PENDING_REVIEW]: {
        icon: Clock,
        text: 'Pending Review',
        className: 'bg-amber-100 text-amber-800 border-amber-200'
      },
      [PropertyStatus.ACTIVE]: {
        icon: CheckCircle,
        text: 'Active',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [PropertyStatus.INACTIVE]: {
        icon: EyeOff,
        text: 'Inactive',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      [PropertyStatus.REJECTED]: {
        icon: XCircle,
        text: 'Rejected',
        className: 'bg-red-100 text-red-800 border-red-200'
      }
    };

    const config = statusConfig[status] || statusConfig[PropertyStatus.PENDING_REVIEW];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.text}
      </div>
    );
  };

  const formatPropertyType = (type: string): string => {
    const displayMap: { [key: string]: string } = {
      'SINGLE_FAMILY': 'Single Family',
      'CONDO': 'Condo',
      'TOWNHOUSE': 'Townhouse',
      'MULTI_FAMILY': 'Multi Family',
      'LAND': 'Land',
      'COMMERCIAL': 'Commercial',
      'OTHER': 'Other'
    };
    return displayMap[type] || type;
  };

  const formatListingType = (type: string): string => {
    const displayMap: { [key: string]: string } = {
      'FOR_SALE': 'For Sale',
      'FOR_RENT': 'For Rent',
      'SOLD': 'Sold',
      'RENTED': 'Rented'
    };
    return displayMap[type] || type;
  };

  if (userDetailsLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-grey-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link href="/listings">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Listings
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  My Property Listings
                </h1>
              </div>
              <Link href="/list-property">
                <Button className="bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  List New Property
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Summary */}
          {properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Active</p>
                      <p className="text-2xl font-bold text-green-800">
                        {properties.filter(p => p.status === PropertyStatus.ACTIVE).length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-600 text-sm font-medium">Pending</p>
                      <p className="text-2xl font-bold text-amber-800">
                        {properties.filter(p => p.status === PropertyStatus.PENDING_REVIEW).length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Inactive</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {properties.filter(p => p.status === PropertyStatus.INACTIVE).length}
                      </p>
                    </div>
                    <EyeOff className="w-8 h-8 text-gray-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-purple-800">{properties.length}</p>
                    </div>
                    <Home className="w-8 h-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && properties.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
            </div>
          )}

          {/* Empty State */}
          {!loading && properties.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Home className="w-16 h-16 text-grey-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-grey-900 mb-2">No properties listed yet</h3>
                <p className="text-grey-600 mb-6">Start by listing your first property!</p>
                <Link href="/list-property">
                  <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    List Your First Property
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Property Grid */}
          {properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const imageIndex = currentImageIndex[property.id] || 0;
                return (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    {/* Image Carousel */}
                    <div className="h-48 relative group">
                      <img 
                        src={property.images[imageIndex]} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        {getStatusBadge(property.status)}
                      </div>
                      
                      {/* Listing Type Badge */}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                        {formatListingType(property.listingType)}
                      </div>
                      
                      {/* Image Navigation */}
                      {property.images.length > 1 && (
                        <>
                          <div className="absolute inset-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(prev => ({
                                  ...prev,
                                  [property.id]: imageIndex > 0 ? imageIndex - 1 : property.images.length - 1
                                }));
                              }}
                              className="ml-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(prev => ({
                                  ...prev,
                                  [property.id]: imageIndex < property.images.length - 1 ? imageIndex + 1 : 0
                                }));
                              }}
                              className="mr-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                          
                          {/* Image Indicators */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {property.images.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                  idx === imageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-xl font-semibold text-grey-900">
                              {property.price.toLocaleString()}
                              {property.listingType === 'FOR_RENT' && '/mo'}
                            </span>
                          </div>
                          <div className="text-sm text-grey-600">
                            {formatPropertyType(property.propertyType)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-grey-600">
                          <div className="flex items-center gap-1">
                            <BedDouble className="w-4 h-4" />
                            <span className="text-sm">
                              {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} beds`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4" />
                            <span className="text-sm">{property.bathrooms} baths</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Square className="w-4 h-4" />
                            <span className="text-sm">{property.squareFeet.toLocaleString()} sqft</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-grey-100">
                          <div className="flex items-center justify-between text-xs text-grey-500">
                            <span>Listed {format(new Date(property.submittedAt), 'MMM d, yyyy')}</span>
                            <span>Updated {format(new Date(property.updatedAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Properties'
                )}
              </Button>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}