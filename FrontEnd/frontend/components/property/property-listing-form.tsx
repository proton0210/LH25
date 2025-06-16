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
  Building
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

export function PropertyListingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
    },
  });

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

      // Here you would submit the property data to your API
      const propertyData = {
        ...data,
        images: imageUrls,
        userId: user.userId,
      };

      console.log('Property data to submit:', propertyData);
      
      // TODO: Call your API to save the property
      // await createProperty(propertyData);

      router.push('/dashboard/properties');
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err instanceof Error ? err.message : 'Failed to create property listing');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-grey-50 to-white py-12">
      <div className="container mx-auto px-6">
        <Card className="max-w-4xl mx-auto shadow-xl border-0">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-[1px]">
            <div className="bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  List Your Property
                </CardTitle>
                <CardDescription className="text-center text-grey-600">
                  Reach thousands of verified buyers with zero brokerage
                </CardDescription>
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
                          <Select onValueChange={(value) => form.setValue('propertyType', value as any)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select property type" />
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
                          <Label htmlFor="price" className="text-sm font-medium text-grey-700">
                            Price ($)
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
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                      disabled={isLoading || imageFiles.length !== 4}
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