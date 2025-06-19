'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/user-store';
import { useUserDetails } from '@/hooks/useUserDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  Plus,
  Search,
  Filter,
  LogOut,
  User,
  Calendar,
  Phone,
  Mail,
  Crown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useState } from 'react';
import { api } from '@/lib/api/graphql-client';
import { PaymentModal } from '@/components/payment/payment-modal';

export default function ListingsPage() {
  const { user, signOut } = useAuth();
  const { userSub, email, clearUser } = useUserStore();
  const { data: userDetails, isLoading: userLoading } = useUserDetails();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Real property data
  const realProperties = [
    {
      id: '1',
      title: 'Modern Downtown Penthouse with Skyline Views',
      description: 'Luxurious 2-bedroom penthouse featuring floor-to-ceiling windows, gourmet kitchen, and a private balcony overlooking the city skyline.',
      price: 4500,
      city: 'New York',
      state: 'NY',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1800,
      listingType: 'For Rent',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'
      ]
    },
    {
      id: '2',
      title: 'Charming Victorian Home in Historic District',
      description: 'Beautifully restored 4-bedroom Victorian with original hardwood floors, updated kitchen, and landscaped garden in quiet neighborhood.',
      price: 875000,
      city: 'San Francisco',
      state: 'CA',
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 3200,
      listingType: 'For Sale',
      images: [
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop'
      ]
    },
    {
      id: '3',
      title: 'Beachfront Condo with Ocean Views',
      description: 'Wake up to stunning ocean views in this 3-bedroom condo. Features include open-plan living, modern amenities, and direct beach access.',
      price: 3200,
      city: 'Miami',
      state: 'FL',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      listingType: 'For Rent',
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
      ]
    },
    {
      id: '4',
      title: 'Contemporary Townhouse in Tech District',
      description: 'Sleek 3-bedroom townhouse with smart home technology, rooftop deck, and garage. Walking distance to major tech companies.',
      price: 1250000,
      city: 'Seattle',
      state: 'WA',
      bedrooms: 3,
      bathrooms: 2.5,
      squareFeet: 2400,
      listingType: 'For Sale',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop'
      ]
    },
    {
      id: '5',
      title: 'Cozy Studio in Arts District',
      description: 'Efficient studio apartment with exposed brick, high ceilings, and modern finishes. Perfect for young professionals or students.',
      price: 1800,
      city: 'Portland',
      state: 'OR',
      bedrooms: 0,
      bathrooms: 1,
      squareFeet: 600,
      listingType: 'For Rent',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&h=600&fit=crop'
      ]
    },
    {
      id: '6',
      title: 'Suburban Family Home with Pool',
      description: 'Spacious 5-bedroom home on a large lot with swimming pool, three-car garage, and excellent schools nearby.',
      price: 650000,
      city: 'Austin',
      state: 'TX',
      bedrooms: 5,
      bathrooms: 4,
      squareFeet: 4200,
      listingType: 'For Sale',
      images: [
        'https://images.unsplash.com/photo-1601760562234-9814eea6663a?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&h=600&fit=crop'
      ]
    }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh the page to update user tier
    window.location.reload();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-grey-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Property Listings
                </h1>
                {userDetails && (
                  <div className="flex items-center gap-4">
                    <div className="text-grey-700">
                      <span className="text-sm">Welcome back,</span>
                      <span className="text-sm font-semibold ml-1">
                        {userDetails.firstName} {userDetails.lastName}!
                      </span>
                    </div>
                    {userDetails.tier === 'user' && (
                      <Button
                        onClick={handleUpgrade}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Link href="/list-property">
                  <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    List Property
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-grey-200 hover:bg-grey-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* User Details Card */}
          {userLoading ? (
            <div className="mb-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
            </div>
          ) : userDetails ? (
            <Card className="mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-[1px]">
                <CardHeader className="bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {userDetails.firstName.charAt(0)}{userDetails.lastName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                          {userDetails.firstName} {userDetails.lastName}
                        </CardTitle>
                        <CardDescription className="text-grey-600">
                          Member since {format(new Date(userDetails.createdAt), 'MMMM yyyy')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userDetails.tier === 'paid' && (
                        <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          <Crown className="w-4 h-4" />
                          Premium
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-white pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 text-grey-700">
                      <Mail className="w-5 h-5 text-pink-500" />
                      <span className="text-sm">{userDetails.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-grey-700">
                      <Phone className="w-5 h-5 text-pink-500" />
                      <span className="text-sm">{userDetails.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-grey-700">
                      <User className="w-5 h-5 text-pink-500" />
                      <span className="text-sm">ID: {userDetails.userId}</span>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ) : (
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-grey-900 mb-2">
                Welcome back!
              </h2>
              <p className="text-grey-600">
                Browse through available properties or list your own.
              </p>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-grey-100 p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
                <input
                  type="text"
                  placeholder="Search by location, property type..."
                  className="w-full pl-10 pr-4 py-2 border border-grey-200 rounded-lg focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <Button variant="outline" className="border-grey-200 hover:bg-grey-50">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Property Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Real Property Cards */}
            {realProperties.map((property, index) => {
              const imageIndex = currentImageIndex[property.id] || 0;
              return (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                  <div className="h-48 relative group">
                    <img 
                      src={property.images[imageIndex]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                      {property.listingType}
                    </div>
                    
                    {/* Image navigation */}
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
                    
                    {/* Image indicators */}
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
                          {property.listingType === 'For Rent' && '/mo'}
                        </span>
                      </div>
                      <div className="text-sm text-grey-600">
                        {property.squareFeet.toLocaleString()} sqft
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-grey-600">
                      <div className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        <span className="text-sm">
                          {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} beds`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{property.bathrooms} baths</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-grey-100">
                      <p className="text-sm text-grey-600 line-clamp-2">{property.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          {/* Empty State (uncomment when no properties) */}
          {/* <div className="text-center py-12">
            <Home className="w-16 h-16 text-grey-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-grey-900 mb-2">No properties found</h3>
            <p className="text-grey-600 mb-6">Be the first to list a property!</p>
            <Link href="/list-property">
              <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                List Your Property
              </Button>
            </Link>
          </div> */}
        </main>
      </div>

      {/* Payment Modal */}
      {userSub && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cognitoUserId={userSub}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </ProtectedRoute>
  );
}