'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/hooks/useAuth';
import { useUserDetails } from '@/hooks/useUserDetails';
import { api, PropertyStatus, PropertyType, ListingType } from '@/lib/api/graphql-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield,
  Home, 
  MapPin, 
  DollarSign,
  ArrowLeft,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bath,
  BedDouble,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  AlertCircle,
  Check,
  X,
  Eye,
  FileText,
  Building
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: userDetails, isLoading: userDetailsLoading } = useUserDetails();
  const router = useRouter();
  
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

  // Check if user is admin
  useEffect(() => {
    if (!userDetailsLoading && userDetails?.tier !== 'admin') {
      router.push('/listings');
    }
  }, [userDetails, userDetailsLoading, router]);

  // Fetch pending properties
  useEffect(() => {
    if (userDetails?.tier === 'admin') {
      fetchPendingProperties();
    }
  }, [userDetails?.tier]);

  const fetchPendingProperties = async (token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.listPendingProperties({
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
      console.error('Error fetching pending properties:', err);
      setError('Failed to load pending properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (nextToken) {
      fetchPendingProperties(nextToken);
    }
  };

  const handleApprove = async (property: any) => {
    setActionLoading({ ...actionLoading, [`approve-${property.id}`]: true });
    
    try {
      await api.approveProperty(property.id);
      // Remove the property from the list after approval
      setProperties(properties.filter(p => p.id !== property.id));
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right duration-300';
      successDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-medium">Property approved successfully!</span>
        </div>
      `;
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
      console.error('Error approving property:', err);
      alert('Failed to approve property. Please try again.');
    } finally {
      setActionLoading({ ...actionLoading, [`approve-${property.id}`]: false });
    }
  };

  const handleReject = async () => {
    if (!selectedProperty || !rejectReason.trim()) return;
    
    setActionLoading({ ...actionLoading, [`reject-${selectedProperty.id}`]: true });
    
    try {
      await api.rejectProperty(selectedProperty.id, rejectReason);
      // Remove the property from the list after rejection
      setProperties(properties.filter(p => p.id !== selectedProperty.id));
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedProperty(null);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right duration-300';
      successDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-medium">Property rejected.</span>
        </div>
      `;
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
      console.error('Error rejecting property:', err);
      alert('Failed to reject property. Please try again.');
    } finally {
      setActionLoading({ ...actionLoading, [`reject-${selectedProperty.id}`]: false });
    }
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

  if (userDetailsLoading || (userDetails?.tier !== 'admin')) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
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
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                </div>
              </div>
              <div className="text-sm text-grey-600">
                Logged in as <span className="font-semibold text-red-600">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Summary */}
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-grey-900 mb-4">Pending Reviews</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-grey-900">{properties.length}</p>
                  <p className="text-sm text-grey-600">Properties awaiting review</p>
                </div>
              </div>
              <div className="ml-auto text-sm text-grey-500">
                {properties.length > 0 && (
                  <span>Oldest submission: {format(new Date(Math.min(...properties.map(p => new Date(p.submittedAt).getTime()))), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
          </div>

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
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          )}

          {/* Empty State */}
          {!loading && properties.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-grey-900 mb-2">All caught up!</h3>
                <p className="text-grey-600">No properties are pending review at the moment.</p>
              </CardContent>
            </Card>
          )}

          {/* Property Grid */}
          {properties.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {properties.map((property) => {
                const imageIndex = currentImageIndex[property.id] || 0;
                return (
                  <Card key={property.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-200 border-amber-100">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* Image Section */}
                      <div className="h-64 md:h-full relative group">
                        <img 
                          src={property.images[imageIndex]} 
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        
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
                        
                        {/* Status Badge */}
                        <div className="absolute top-4 left-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Review
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="p-6 space-y-4">
                        {/* Title and Price */}
                        <div>
                          <h3 className="text-lg font-semibold text-grey-900 line-clamp-1">{property.title}</h3>
                          <div className="flex items-center gap-1 text-grey-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{property.city}, {property.state}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-xl font-semibold text-grey-900">
                              {property.price.toLocaleString()}
                              {property.listingType === 'FOR_RENT' && '/mo'}
                            </span>
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-grey-600">
                            <Building className="w-4 h-4" />
                            <span>{formatPropertyType(property.propertyType)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-grey-600">
                            <FileText className="w-4 h-4" />
                            <span>{formatListingType(property.listingType)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-grey-600">
                            <BedDouble className="w-4 h-4" />
                            <span>{property.bedrooms} beds</span>
                          </div>
                          <div className="flex items-center gap-2 text-grey-600">
                            <Bath className="w-4 h-4" />
                            <span>{property.bathrooms} baths</span>
                          </div>
                          <div className="flex items-center gap-2 text-grey-600">
                            <Square className="w-4 h-4" />
                            <span>{property.squareFeet.toLocaleString()} sqft</span>
                          </div>
                          <div className="flex items-center gap-2 text-grey-600">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(property.submittedAt), 'MMM d')}</span>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="pt-3 border-t border-grey-100 space-y-2">
                          <p className="text-xs font-medium text-grey-500 uppercase tracking-wider">Contact Information</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-grey-600">
                              <User className="w-3.5 h-3.5" />
                              <span>{property.contactName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-grey-600">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{property.contactEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-grey-600">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{property.contactPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                            onClick={() => handleApprove(property)}
                            disabled={actionLoading[`approve-${property.id}`] || actionLoading[`reject-${property.id}`]}
                          >
                            {actionLoading[`approve-${property.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setSelectedProperty(property);
                              setShowRejectModal(true);
                            }}
                            disabled={actionLoading[`approve-${property.id}`] || actionLoading[`reject-${property.id}`]}
                          >
                            {actionLoading[`reject-${property.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
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

        {/* Reject Modal */}
        {showRejectModal && selectedProperty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 animate-in zoom-in duration-200">
              <h3 className="text-lg font-semibold text-grey-900 mb-4">Reject Property</h3>
              <p className="text-sm text-grey-600 mb-4">
                Please provide a reason for rejecting "<span className="font-medium">{selectedProperty.title}</span>".
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-grey-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors min-h-[100px]"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedProperty(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading[`reject-${selectedProperty.id}`]}
                >
                  {actionLoading[`reject-${selectedProperty.id}`] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reject Property'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}