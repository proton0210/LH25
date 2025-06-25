'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Home,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  User,
  FileImage,
  X,
  Upload,
  Loader2,
  BedDouble,
  Bath,
  Square,
  Building,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { propertySchema, propertyTypes, states, type PropertyFormData } from '@/lib/validations/property';
import { uploadFile, generateFileKey } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { api, PropertyType, ListingType } from '@/lib/api/graphql-client';

// Add animation delays for the bouncing dots
const animationStyles = `
  @keyframes customBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.5rem); }
  }
  .animation-delay-0 { animation: customBounce 1.5s infinite; animation-delay: 0ms; }
  .animation-delay-200 { animation: customBounce 1.5s infinite; animation-delay: 200ms; }
  .animation-delay-400 { animation: customBounce 1.5s infinite; animation-delay: 400ms; }
`;

export function PropertyListingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showSampleHint, setShowSampleHint] = useState(true);

  const router = useRouter();
  const { user } = useAuth();

  // Sample property data for different property types
  const sampleProperties = [
    {
      title: 'Stunning Modern Condo with City Views',
      description: 'Experience luxury living in this beautifully designed 2-bedroom condo featuring floor-to-ceiling windows, premium finishes, and breathtaking city skyline views. The open-concept layout includes a gourmet kitchen with quartz countertops, stainless steel appliances, and a spacious island perfect for entertaining. Both bedrooms offer ample natural light and the master suite includes a walk-in closet. Building amenities include 24/7 concierge, fitness center, rooftop terrace, and secured parking.',
      propertyType: 'CONDO',
      listingType: 'FOR_SALE',
      price: 750000,
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      address: '500 Park Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10022',
      contactName: 'Sarah Johnson',
      contactEmail: 'sarah.johnson@luxuryrealty.com',
      contactPhone: '(212) 555-7890',
      amenities: ['Concierge', 'Fitness Center', 'Rooftop Terrace', 'Secured Parking', 'Pet Friendly'],
      yearBuilt: 2020,
      lotSize: 0,
      parkingSpaces: 1,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Spacious Family Home with Pool',
      description: 'Welcome to this beautiful 4-bedroom family home situated on a quiet cul-de-sac. This property features a newly renovated kitchen with granite countertops, hardwood floors throughout, and a master bedroom with en-suite bathroom. The backyard oasis includes a heated swimming pool, covered patio, and professionally landscaped gardens. Additional features include a 3-car garage, home office, finished basement with recreation room, and energy-efficient HVAC system. Located in a top-rated school district.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 890000,
      bedrooms: 4,
      bathrooms: 3.5,
      area: 3200,
      address: '1425 Oak Ridge Drive',
      city: 'Austin',
      state: 'TX',
      zipCode: '78759',
      contactName: 'Michael Chen',
      contactEmail: 'mchen@premierproperties.com',
      contactPhone: '(512) 555-4321',
      amenities: ['Pool', 'Garage', 'Home Office', 'Finished Basement', 'Energy Efficient'],
      yearBuilt: 2015,
      lotSize: 0.35,
      parkingSpaces: 3,
      images: [
        'https://images.unsplash.com/photo-1601760562234-9814eea6663a?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Charming Studio Apartment in Historic Building',
      description: 'Cozy studio apartment in a beautifully maintained historic building. Features include exposed brick walls, high ceilings, hardwood floors, and large windows providing excellent natural light. The efficient layout maximizes space with a Murphy bed, built-in storage, and a fully equipped kitchenette. Building amenities include laundry facilities, bike storage, and a communal rooftop deck with city views. Perfect for students or young professionals. Heat and hot water included.',
      propertyType: 'CONDO',
      listingType: 'FOR_RENT',
      price: 1850,
      bedrooms: 0,
      bathrooms: 1,
      area: 450,
      address: '88 Commonwealth Avenue',
      city: 'Boston',
      state: 'MA',
      zipCode: '02116',
      contactName: 'Emily Rodriguez',
      contactEmail: 'emily@bostonrentals.com',
      amenities: ['Laundry', 'Bike Storage', 'Rooftop Deck', 'Heat Included', 'Historic Building'],
      yearBuilt: 1920,
      lotSize: 0,
      parkingSpaces: 0,
      contactPhone: '(617) 555-2468',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Luxury Beachfront Villa with Private Access',
      description: 'Escape to paradise in this exquisite 5-bedroom beachfront villa. Features include panoramic ocean views from every room, chef\'s kitchen with high-end appliances, master suite with spa-like bathroom and private balcony, infinity pool overlooking the beach, and direct beach access via private stairs. The property includes smart home technology, hurricane-impact windows, whole-house generator, and a separate guest house. Perfect for vacation rental investment or primary residence.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 2850000,
      bedrooms: 5,
      bathrooms: 4.5,
      area: 4800,
      address: '2150 Ocean Boulevard',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      contactName: 'Carlos Martinez',
      contactEmail: 'cmartinez@beachfrontestates.com',
      contactPhone: '(305) 555-9876',
      amenities: ['Beach Access', 'Pool', 'Smart Home', 'Guest House', 'Generator'],
      yearBuilt: 2019,
      lotSize: 0.5,
      parkingSpaces: 3,
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1615571022219-eb45cf7faa9d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Mountain Retreat Cabin with Spectacular Views',
      description: 'Rustic luxury meets modern comfort in this stunning 3-bedroom log cabin. Nestled on 5 acres of private forest, features include vaulted ceilings with exposed beams, stone fireplace, gourmet kitchen with custom cabinetry, wraparound deck with hot tub, and floor-to-ceiling windows showcasing mountain views. Property includes hiking trails, seasonal creek, detached workshop/garage, and is minutes from ski resorts. Fully furnished and turn-key ready.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 675000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 2400,
      address: '15 Pine Ridge Road',
      city: 'Aspen',
      state: 'CO',
      zipCode: '81611',
      contactName: 'Jennifer Walsh',
      contactEmail: 'jwalsh@mountainproperties.com',
      contactPhone: '(970) 555-3456',
      images: [
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Urban Loft in Converted Warehouse District',
      description: 'Industrial chic at its finest in this spectacular 2-bedroom + den loft. Original features include 14-foot ceilings, exposed brick walls, oversized windows, and polished concrete floors. Modern updates feature open kitchen with island, spa-inspired bathrooms, custom closets, and in-unit laundry. Building offers rooftop garden, gym, co-working spaces, and pet spa. Walk to trendy restaurants, galleries, and public transit. Live/work permitted.',
      propertyType: 'CONDO',
      listingType: 'FOR_RENT',
      price: 3200,
      bedrooms: 2,
      bathrooms: 2,
      area: 1650,
      address: '421 Warehouse Way',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98121',
      contactName: 'David Park',
      contactEmail: 'dpark@urbanlivingseattle.com',
      contactPhone: '(206) 555-7823',
      images: [
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1527359443443-84a48aec73d2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Elegant Brownstone in Prime Location',
      description: 'Meticulously restored 1890s brownstone offering 4 floors of luxury living. Original details preserved including ornate moldings, marble fireplaces, and herringbone floors. Modern amenities include chef\'s kitchen with butler\'s pantry, luxurious master suite with dressing room, home theater, wine cellar, and private garden with outdoor kitchen. Located on tree-lined street near parks, museums, and top schools. Rare opportunity for sophisticated city living.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 3750000,
      bedrooms: 5,
      bathrooms: 4,
      area: 5200,
      address: '34 Beacon Street',
      city: 'Boston',
      state: 'MA',
      zipCode: '02108',
      contactName: 'Margaret Sullivan',
      contactEmail: 'msullivan@beaconhillrealty.com',
      contactPhone: '(617) 555-9012',
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600563438938-a9a27216b4f5?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Golf Course Estate with Resort Amenities',
      description: 'Prestigious estate home on the 9th fairway offering panoramic golf course and mountain views. This 6-bedroom masterpiece features grand foyer with dual staircases, formal living and dining rooms, gourmet kitchen with commercial appliances, temperature-controlled wine room, home office with built-ins, game room with wet bar, and resort-style backyard with pool, spa, outdoor kitchen, and fire pit. Community offers championship golf, tennis, and dining.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 1650000,
      bedrooms: 6,
      bathrooms: 5.5,
      area: 6500,
      address: '7 Championship Drive',
      city: 'Scottsdale',
      state: 'AZ',
      zipCode: '85255',
      contactName: 'Robert Thompson',
      contactEmail: 'rthompson@luxurygolfestates.com',
      contactPhone: '(480) 555-4567',
      images: [
        'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Modern Farmhouse on Acreage',
      description: 'Contemporary farmhouse design meets country living on 10 scenic acres. Features include open floor plan with vaulted ceilings, designer kitchen with farmhouse sink and professional range, master suite with barn door and soaking tub, mudroom with built-ins, and screened porch overlooking pastures. Property includes horse barn with 4 stalls, riding arena, chicken coop, vegetable garden, and pond. Perfect blend of rural tranquility and modern luxury.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 985000,
      bedrooms: 4,
      bathrooms: 3,
      area: 3400,
      address: '892 Country Lane',
      city: 'Nashville',
      state: 'TN',
      zipCode: '37215',
      contactName: 'Ashley Davis',
      contactEmail: 'adavis@countryliving.com',
      contactPhone: '(615) 555-2890',
      images: [
        'https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=800&h=600&fit=crop'
      ]
    },
    {
      title: 'Eco-Friendly Smart Home with Solar',
      description: 'Net-zero energy home showcasing sustainable luxury. Features include solar panels with battery backup, geothermal heating/cooling, rainwater collection system, electric car charging station, smart home automation, triple-pane windows, and toxin-free materials throughout. Open design with clerestory windows, bamboo floors, quartz counters, and energy-star appliances. Low-maintenance xeriscaped yard with native plants. Live sustainably without compromise.',
      propertyType: 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      price: 1125000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 2800,
      address: '55 Green Valley Road',
      city: 'Portland',
      state: 'OR',
      zipCode: '97210',
      contactName: 'Lisa Green',
      contactEmail: 'lgreen@ecohomesnw.com',
      contactPhone: '(503) 555-6789',
      images: [
        'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop'
      ]
    }
  ];

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: 'ACTIVE',
      bedrooms: 0,
      bathrooms: 0,
      price: 0,
      area: 0,
    },
  });

  const fillSampleData = async () => {
    // Select a random sample property
    const randomProperty = sampleProperties[Math.floor(Math.random() * sampleProperties.length)];
    
    // Fill form fields
    form.setValue('title', randomProperty.title);
    form.setValue('description', randomProperty.description);
    form.setValue('propertyType', randomProperty.propertyType);
    form.setValue('listingType', randomProperty.listingType);
    form.setValue('price', randomProperty.price);
    form.setValue('bedrooms', randomProperty.bedrooms);
    form.setValue('bathrooms', randomProperty.bathrooms);
    form.setValue('area', randomProperty.area);
    form.setValue('address', randomProperty.address);
    form.setValue('city', randomProperty.city);
    form.setValue('state', randomProperty.state as any);
    form.setValue('zipCode', randomProperty.zipCode);
    form.setValue('contactName', randomProperty.contactName);
    form.setValue('contactEmail', randomProperty.contactEmail);
    form.setValue('contactPhone', randomProperty.contactPhone);
    
    // Set image previews (for display purposes)
    setImagePreviews(randomProperty.images);
    
    // Create dummy File objects for form validation
    if (typeof window !== 'undefined') {
      const dummyFiles = randomProperty.images.map((url, index) => {
        const file = new File(['dummy'], `property-image-${index + 1}.jpg`, { type: 'image/jpeg' });
        // Store the URL as a property on the file for later use
        (file as any).dummyUrl = url;
        return file;
      });
      
      setImageFiles(dummyFiles);
      form.setValue('images', dummyFiles);
    }
    
    // Clear any errors
    setError(null);
    // Hide the sample hint after filling
    setShowSampleHint(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (imageFiles.length + files.length > 4) {
      setError('Maximum 4 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    setImageFiles([...imageFiles, ...validFiles]);
    form.setValue('images', [...imageFiles, ...validFiles]);

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setError(null);
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    form.setValue('images', newFiles);
  };

  const onSubmit = async (data: PropertyFormData) => {
    if (!user) {
      setError('You must be logged in to list a property');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload images to S3
      const imageUrls: string[] = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // Check if this is a dummy file with a URL
        if ((file as any).dummyUrl) {
          imageUrls.push((file as any).dummyUrl);
        } else {
          const key = generateFileKey(user.userId, file.name, 'properties');
          
          await uploadFile(key, file, {
            contentType: file.type,
            onProgress: (progress) => {
              setUploadProgress(Math.round((i / imageFiles.length) * 100 + (progress.percentage / imageFiles.length)));
            },
          });

          // Get the URL for the uploaded image
          imageUrls.push(key);
        }
      }


      // Prepare property data for API
      const propertyInput = {
        title: data.title,
        description: data.description,
        price: data.price,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        squareFeet: data.area || 0, // Map area to squareFeet
        propertyType: data.propertyType as PropertyType,
        listingType: data.listingType as ListingType,
        images: imageUrls,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        amenities: [], // Add amenities field to form if needed
      };

      // Call API to create property
      const response = await api.createProperty(propertyInput);
      
      // Redirect to listings with a success message
      router.push('/listings?uploadStatus=success');
    } catch (err: any) {
      // Check for GraphQL errors
      if (err.errors && Array.isArray(err.errors)) {
        const errorMessage = err.errors.map((e: any) => e.message).join(', ');
        setError(`GraphQL Error: ${errorMessage}`);
      } else if (err.response?.errors) {
        const errorMessage = err.response.errors.map((e: any) => e.message).join(', ');
        setError(`GraphQL Error: ${errorMessage}`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create property listing');
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <style jsx>{animationStyles}</style>
      <div className="min-h-screen bg-gradient-to-b from-grey-50 to-white py-12">
      <div className="container mx-auto px-6">
        {/* Back Button */}
        <div className="max-w-4xl mx-auto mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/listings')}
            className="flex items-center gap-2 text-grey-600 hover:text-grey-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Listings
          </Button>
        </div>
        
        <Card className="max-w-4xl mx-auto shadow-xl border-0">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-[1px]">
            <div className="bg-background">
              <CardHeader className="pb-8">
                <div className="relative">
                  <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    List Your Property
                  </CardTitle>
                  <div className="absolute -top-2 -right-2 animate-pulse">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-400 rounded-full blur-lg opacity-75"></div>
                      <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        NEW: Auto-Fill Available!
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-center text-grey-600">
                  Reach thousands of verified buyers with zero brokerage
                </CardDescription>
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={fillSampleData}
                    className="relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full text-base font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg group"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-200" />
                    <div className="relative flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-0" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-200" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-400" />
                      </div>
                      <span>Fill Sample Data</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </button>
                </div>
                <p className="text-center text-sm text-grey-500 mt-3">
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Try our form with pre-filled professional property listings
                  </span>
                </p>
                
                {/* Floating hint for first-time users */}
                {showSampleHint && form.formState.isSubmitted === false && (
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="relative">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                        👆 Click here to auto-fill the form!
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-blue-600"></div>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-8 pb-8">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Property Details Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-grey-900 flex items-center gap-2">
                      <Home className="w-5 h-5 text-pink-600" />
                      Property Details
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-grey-700">
                          Property Title
                        </Label>
                        <Input
                          id="title"
                          {...form.register('title')}
                          placeholder="e.g., Beautiful 3-bedroom home in downtown"
                          className="mt-1"
                        />
                        {form.formState.errors.title && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.title.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-grey-700">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          {...form.register('description')}
                          placeholder="Describe your property in detail..."
                          rows={4}
                          className="mt-1"
                        />
                        {form.formState.errors.description && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.description.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="propertyType" className="text-sm font-medium text-grey-700">
                            Property Type
                          </Label>
                          <Select 
                            value={form.watch('propertyType')}
                            onValueChange={(value) => {
                              form.setValue('propertyType', value as any, { shouldValidate: true });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                              <SelectItem value="CONDO">Condo</SelectItem>
                              <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
                              <SelectItem value="MULTI_FAMILY">Multi Family</SelectItem>
                              <SelectItem value="LAND">Land</SelectItem>
                              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.formState.errors.propertyType && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.propertyType.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="listingType" className="text-sm font-medium text-grey-700">
                            Listing Type
                          </Label>
                          <Select 
                            value={form.watch('listingType')}
                            onValueChange={(value) => {
                              form.setValue('listingType', value as any, { shouldValidate: true });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select listing type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FOR_SALE">For Sale</SelectItem>
                              <SelectItem value="FOR_RENT">For Rent</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.formState.errors.listingType && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.listingType.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="price" className="text-sm font-medium text-grey-700">
                          Price {form.watch('listingType') === 'FOR_RENT' ? '(per month)' : ''}
                        </Label>
                        <div className="relative mt-1">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                          <Input
                            id="price"
                            type="number"
                            {...form.register('price', { valueAsNumber: true })}
                            placeholder="0"
                            className="pl-10"
                          />
                        </div>
                        {form.formState.errors.price && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.price.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bedrooms" className="text-sm font-medium text-grey-700">
                            Bedrooms
                          </Label>
                          <div className="relative mt-1">
                            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                            <Input
                              id="bedrooms"
                              type="number"
                              {...form.register('bedrooms', { valueAsNumber: true })}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.bedrooms && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.bedrooms.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="bathrooms" className="text-sm font-medium text-grey-700">
                            Bathrooms
                          </Label>
                          <div className="relative mt-1">
                            <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                            <Input
                              id="bathrooms"
                              type="number"
                              step="0.5"
                              {...form.register('bathrooms', { valueAsNumber: true })}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.bathrooms && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.bathrooms.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="area" className="text-sm font-medium text-grey-700">
                            Area (sq ft)
                          </Label>
                          <div className="relative mt-1">
                            <Square className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                            <Input
                              id="area"
                              type="number"
                              {...form.register('area', { valueAsNumber: true })}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.area && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.area.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-grey-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-pink-600" />
                      Location
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address" className="text-sm font-medium text-grey-700">
                          Street Address
                        </Label>
                        <Input
                          id="address"
                          {...form.register('address')}
                          placeholder="123 Main Street"
                          className="mt-1"
                        />
                        {form.formState.errors.address && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-sm font-medium text-grey-700">
                            City
                          </Label>
                          <Input
                            id="city"
                            {...form.register('city')}
                            placeholder="New York"
                            className="mt-1"
                          />
                          {form.formState.errors.city && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.city.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="state" className="text-sm font-medium text-grey-700">
                            State
                          </Label>
                          <Select 
                            value={form.watch('state')}
                            onValueChange={(value) => {
                              form.setValue('state', value as any, { shouldValidate: true });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {states.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.state && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.state.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="zipCode" className="text-sm font-medium text-grey-700">
                            ZIP Code
                          </Label>
                          <Input
                            id="zipCode"
                            {...form.register('zipCode')}
                            placeholder="12345"
                            className="mt-1"
                          />
                          {form.formState.errors.zipCode && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.zipCode.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-grey-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-pink-600" />
                      Contact Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="contactName" className="text-sm font-medium text-grey-700">
                          Contact Name
                        </Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                          <Input
                            id="contactName"
                            {...form.register('contactName')}
                            placeholder="John Doe"
                            className="pl-10"
                          />
                        </div>
                        {form.formState.errors.contactName && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.contactName.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contactEmail" className="text-sm font-medium text-grey-700">
                            Email
                          </Label>
                          <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                            <Input
                              id="contactEmail"
                              type="email"
                              {...form.register('contactEmail')}
                              placeholder="john@example.com"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.contactEmail && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.contactEmail.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="contactPhone" className="text-sm font-medium text-grey-700">
                            Phone Number
                          </Label>
                          <div className="relative mt-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                            <Input
                              id="contactPhone"
                              {...form.register('contactPhone')}
                              placeholder="(555) 123-4567"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.contactPhone && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.contactPhone.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Images Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-grey-900 flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-pink-600" />
                        Property Images
                      </h3>
                      <span className={`text-sm font-medium ${imageFiles.length === 4 ? 'text-green-600' : 'text-grey-500'}`}>
                        {imageFiles.length}/4 images uploaded
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-grey-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="images"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={imageFiles.length >= 4}
                        />
                        <label
                          htmlFor="images"
                          className={`cursor-pointer ${imageFiles.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Upload className="w-12 h-12 text-grey-400 mx-auto mb-4" />
                          <p className="text-grey-600 font-medium">
                            Click to upload images
                          </p>
                          <p className="text-sm text-grey-500 mt-1">
                            Exactly 4 images required, up to 10MB each
                          </p>
                          <p className="text-xs text-grey-400 mt-2">
                            JPG, JPEG, PNG or WEBP
                          </p>
                        </label>
                      </div>

                      {form.formState.errors.images && (
                        <p className="text-red-500 text-xs">{form.formState.errors.images.message}</p>
                      )}
                      
                      {imageFiles.length > 0 && imageFiles.length < 4 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                          <span className="text-amber-600 text-sm font-medium">
                            ⚠️ You need to upload exactly 4 images. {4 - imageFiles.length} more required.
                          </span>
                        </div>
                      )}
                      
                      {imageFiles.length === 4 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                          <span className="text-green-600 text-sm font-medium">
                            ✅ Perfect! All 4 images uploaded. You can now create your listing.
                          </span>
                        </div>
                      )}

                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Property ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-grey-600">
                        <span>Uploading images...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-grey-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={`${
                        imageFiles.length !== 4 && !isLoading
                          ? 'bg-grey-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
                      }`}
                      disabled={isLoading || imageFiles.length !== 4}
                      onClick={(e) => {
                        if (imageFiles.length !== 4) {
                          e.preventDefault();
                          setError(`Please upload exactly 4 images. Currently uploaded: ${imageFiles.length}`);
                        }
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Listing...
                        </>
                      ) : imageFiles.length !== 4 ? (
                        `Upload ${4 - imageFiles.length} more image${4 - imageFiles.length === 1 ? '' : 's'}`
                      ) : (
                        'Create Listing'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}