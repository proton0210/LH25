'use client';

import { useState, useCallback } from 'react';
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
  ArrowLeft,
  Calendar,
  Car,
  Trees,
  Plus,
  Check,
  ChevronDown,
  Image as ImageIcon
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  propertySchema, 
  propertyTypes, 
  listingTypes,
  states, 
  commonAmenities,
  type PropertyFormData 
} from '@/lib/validations/property';
import { uploadMultipleFiles, validateImageFile, compressImage } from '@/lib/storage-presigned';
import { useAuth } from '@/hooks/useAuth';
import { api, PropertyType, ListingType } from '@/lib/api/graphql-client';
import { cn } from '@/lib/utils';

interface ImageUpload {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  key?: string;
}

export function PropertyListingFormV2() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploads, setImageUploads] = useState<ImageUpload[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: 'ACTIVE',
      bedrooms: 0,
      bathrooms: 0,
      price: 0,
      area: 0,
      amenities: [],
      listingType: 'FOR_SALE',
      parkingSpaces: 0,
    },
  });

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleImageFiles(files);
  }, []);

  const handleImageFiles = async (files: File[]) => {
    const remainingSlots = 4 - imageUploads.length;
    
    if (remainingSlots === 0) {
      setError('Maximum 4 images allowed');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newUploads: ImageUpload[] = [];

    for (const file of filesToProcess) {
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        setError(validation.error!);
        continue;
      }

      // Compress image if needed
      const processedFile = file.size > 2 * 1024 * 1024 
        ? await compressImage(file)
        : file;

      // Create preview
      const preview = URL.createObjectURL(processedFile);
      
      newUploads.push({
        file: processedFile,
        preview,
        progress: 0,
        status: 'pending',
      });
    }

    setImageUploads(prev => [...prev, ...newUploads]);
    form.setValue('images', [...imageUploads.map(u => u.file), ...newUploads.map(u => u.file)]);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleImageFiles(files);
  };

  const removeImage = (index: number) => {
    const newUploads = imageUploads.filter((_, i) => i !== index);
    setImageUploads(newUploads);
    form.setValue('images', newUploads.map(u => u.file));
    
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(imageUploads[index].preview);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => {
      const newAmenities = prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity];
      
      form.setValue('amenities', newAmenities);
      return newAmenities;
    });
  };

  const onSubmit = async (data: PropertyFormData) => {
    if (!user) {
      setError('You must be logged in to list a property');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update image upload states
      setImageUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'uploading',
        progress: 0,
      })));

      // Upload images using presigned URLs
      const uploadedKeys = await uploadMultipleFiles(
        imageUploads.map(u => u.file),
        (fileIndex, progress) => {
          setImageUploads(prev => {
            const newUploads = [...prev];
            newUploads[fileIndex] = {
              ...newUploads[fileIndex],
              progress: progress.percentage,
              status: progress.percentage === 100 ? 'uploaded' : 'uploading',
            };
            return newUploads;
          });
        }
      );

      // Map property type from form to GraphQL enum
      const mapPropertyType = (type: string): PropertyType => {
        const typeMap: Record<string, PropertyType> = {
          'House': PropertyType.SINGLE_FAMILY,
          'Apartment': PropertyType.CONDO,
          'Condo': PropertyType.CONDO,
          'Townhouse': PropertyType.TOWNHOUSE,
          'Villa': PropertyType.SINGLE_FAMILY,
          'Studio': PropertyType.CONDO,
          'Duplex': PropertyType.MULTI_FAMILY,
          'Penthouse': PropertyType.CONDO,
          'Land': PropertyType.LAND,
          'Commercial': PropertyType.COMMERCIAL,
        };
        return typeMap[type] || PropertyType.OTHER;
      };

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
        squareFeet: data.area || 0,
        propertyType: mapPropertyType(data.propertyType),
        listingType: data.listingType === 'FOR_SALE' ? ListingType.FOR_SALE : ListingType.FOR_RENT,
        images: uploadedKeys,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        amenities: data.amenities || [],
        yearBuilt: data.yearBuilt,
        lotSize: data.lotSize,
        parkingSpaces: data.parkingSpaces,
      };

      console.log('Submitting property:', propertyInput);
      
      // Call API to create property
      const response = await api.createProperty(propertyInput);
      
      console.log('Property upload initiated:', response);
      
      // Navigate to status tracking page
      router.push(`/property/upload-status?executionArn=${response.queueMessageId}&propertyId=${response.propertyId}`);
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err instanceof Error ? err.message : 'Failed to create property listing');
      
      // Reset image upload states on error
      setImageUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'error',
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const displayedAmenities = showAllAmenities 
    ? commonAmenities 
    : commonAmenities.slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container mx-auto px-6">
        {/* Back Button */}
        <div className="max-w-4xl mx-auto mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/listings')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Listings
          </Button>
        </div>
        
        <Card className="max-w-4xl mx-auto shadow-xl border-0">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-[1px]">
            <div className="bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  List Your Property
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Reach thousands of verified buyers with our advanced listing platform
                </CardDescription>
              </CardHeader>

              <CardContent className="px-8 pb-8">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Property Images Section - Moved to top for better UX */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-pink-600" />
                        Property Images
                      </h3>
                      <span className={cn(
                        "text-sm font-medium",
                        imageUploads.length === 4 ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {imageUploads.length}/4 images
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Drag and Drop Area */}
                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                          isDragging ? "border-pink-500 bg-pink-50" : "border-gray-300",
                          imageUploads.length >= 4 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <input
                          type="file"
                          id="images"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={imageUploads.length >= 4}
                        />
                        <label
                          htmlFor="images"
                          className={cn(
                            "cursor-pointer",
                            imageUploads.length >= 4 && "cursor-not-allowed"
                          )}
                        >
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">
                            {isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Exactly 4 images required • Max 10MB each
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            JPG, JPEG, PNG or WEBP
                          </p>
                        </label>
                      </div>

                      {form.formState.errors.images && (
                        <p className="text-red-500 text-xs">{form.formState.errors.images.message}</p>
                      )}

                      {/* Image Previews with Upload Progress */}
                      {imageUploads.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {imageUploads.map((upload, index) => (
                            <div key={index} className="relative group">
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={upload.preview}
                                  alt={`Property ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                
                                {/* Upload Progress Overlay */}
                                {upload.status === 'uploading' && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-white text-center">
                                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                      <span className="text-sm">{upload.progress}%</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Success Indicator */}
                                {upload.status === 'uploaded' && (
                                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                                
                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={upload.status === 'uploading'}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {/* Individual Progress Bar */}
                              {upload.status === 'uploading' && (
                                <Progress value={upload.progress} className="h-1 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Details Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Home className="w-5 h-5 text-pink-600" />
                      Property Details
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">
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
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="propertyType" className="text-sm font-medium text-gray-700">
                            Property Type
                          </Label>
                          <Select onValueChange={(value) => form.setValue('propertyType', value as any)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {propertyTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.propertyType && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.propertyType.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="listingType" className="text-sm font-medium text-gray-700">
                            Listing Type
                          </Label>
                          <Select 
                            defaultValue="FOR_SALE"
                            onValueChange={(value) => form.setValue('listingType', value as any)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
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

                        <div>
                          <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                            {form.watch('listingType') === 'FOR_RENT' ? 'Monthly Rent ($)' : 'Price ($)'}
                          </Label>
                          <div className="relative mt-1">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="bedrooms" className="text-sm font-medium text-gray-700">
                            Bedrooms
                          </Label>
                          <div className="relative mt-1">
                            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                          <Label htmlFor="bathrooms" className="text-sm font-medium text-gray-700">
                            Bathrooms
                          </Label>
                          <div className="relative mt-1">
                            <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                          <Label htmlFor="area" className="text-sm font-medium text-gray-700">
                            Area (sq ft)
                          </Label>
                          <div className="relative mt-1">
                            <Square className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

                        <div>
                          <Label htmlFor="parkingSpaces" className="text-sm font-medium text-gray-700">
                            Parking
                          </Label>
                          <div className="relative mt-1">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="parkingSpaces"
                              type="number"
                              {...form.register('parkingSpaces', { valueAsNumber: true })}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.parkingSpaces && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.parkingSpaces.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="yearBuilt" className="text-sm font-medium text-gray-700">
                            Year Built
                          </Label>
                          <div className="relative mt-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="yearBuilt"
                              type="number"
                              {...form.register('yearBuilt', { valueAsNumber: true })}
                              placeholder={new Date().getFullYear().toString()}
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.yearBuilt && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.yearBuilt.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="lotSize" className="text-sm font-medium text-gray-700">
                            Lot Size (acres)
                          </Label>
                          <div className="relative mt-1">
                            <Trees className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="lotSize"
                              type="number"
                              step="0.01"
                              {...form.register('lotSize', { valueAsNumber: true })}
                              placeholder="0.00"
                              className="pl-10"
                            />
                          </div>
                          {form.formState.errors.lotSize && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.lotSize.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amenities Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-pink-600" />
                      Amenities
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {displayedAmenities.map((amenity) => (
                          <label
                            key={amenity}
                            className={cn(
                              "flex items-center space-x-2 cursor-pointer p-3 rounded-lg border transition-colors",
                              selectedAmenities.includes(amenity)
                                ? "border-pink-500 bg-pink-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <Checkbox
                              checked={selectedAmenities.includes(amenity)}
                              onCheckedChange={() => toggleAmenity(amenity)}
                            />
                            <span className="text-sm font-medium">{amenity}</span>
                          </label>
                        ))}
                      </div>

                      {!showAllAmenities && commonAmenities.length > 8 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAllAmenities(true)}
                          className="w-full"
                        >
                          Show More Amenities
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      )}

                      {selectedAmenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {selectedAmenities.map((amenity) => (
                            <Badge key={amenity} variant="secondary">
                              {amenity}
                              <button
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className="ml-2 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-pink-600" />
                      Location
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700">
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
                          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
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
                          <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                            State
                          </Label>
                          <Select onValueChange={(value) => form.setValue('state', value as any)}>
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
                          <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
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
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-pink-600" />
                      Contact Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="contactName" className="text-sm font-medium text-gray-700">
                          Contact Name
                        </Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                          <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700">
                            Email
                          </Label>
                          <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                          <Label htmlFor="contactPhone" className="text-sm font-medium text-gray-700">
                            Phone Number
                          </Label>
                          <div className="relative mt-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {error}
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
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                      disabled={isLoading || imageUploads.length !== 4}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Listing...
                        </>
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
  );
}