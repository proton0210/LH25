import { z } from 'zod';

export const propertyTypes = [
  'SINGLE_FAMILY',
  'CONDO',
  'TOWNHOUSE',
  'MULTI_FAMILY',
  'LAND',
  'COMMERCIAL',
  'OTHER',
] as const;

export const listingTypes = [
  'FOR_SALE',
  'FOR_RENT',
] as const;

export const propertyStatuses = [
  'ACTIVE',
  'PENDING',
  'SOLD',
  'INACTIVE',
] as const;

export const commonAmenities = [
  'Pool',
  'Garage',
  'Garden',
  'Gym',
  'Parking',
  'Security',
  'Elevator',
  'Balcony',
  'Terrace',
  'Storage',
  'Laundry',
  'Dishwasher',
  'Air Conditioning',
  'Heating',
  'Fireplace',
  'Hardwood Floors',
  'Pet Friendly',
  'Furnished',
  'High Ceilings',
  'Walk-in Closet',
] as const;

export const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const propertySchema = z.object({
  // Property Details
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters'),
  
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  
  price: z
    .number()
    .positive('Price must be a positive number')
    .min(1, 'Price is required'),
  
  propertyType: z.enum(propertyTypes, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  
  bedrooms: z
    .number()
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative')
    .max(20, 'Please enter a valid number of bedrooms')
    .optional(),
  
  bathrooms: z
    .number()
    .min(0, 'Bathrooms cannot be negative')
    .max(20, 'Please enter a valid number of bathrooms')
    .optional(),
  
  area: z
    .number()
    .positive('Area must be a positive number')
    .optional(),
  
  // Additional Property Details
  listingType: z.enum(listingTypes, {
    errorMap: () => ({ message: 'Please select a listing type' }),
  }),
  
  amenities: z
    .array(z.string())
    .optional()
    .default([]),
  
  yearBuilt: z
    .number()
    .int('Year must be a whole number')
    .min(1800, 'Please enter a valid year')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future')
    .optional(),
  
  lotSize: z
    .number()
    .min(0, 'Lot size cannot be negative')
    .optional(),
  
  parkingSpaces: z
    .number()
    .int('Parking spaces must be a whole number')
    .min(0, 'Parking spaces cannot be negative')
    .max(20, 'Please enter a valid number of parking spaces')
    .optional(),
  
  // Location Details
  address: z
    .string()
    .min(5, 'Address is required')
    .max(200, 'Address is too long'),
  
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City name is too long')
    .regex(/^[a-zA-Z\s-]+$/, 'City name can only contain letters, spaces, and hyphens'),
  
  state: z.enum(states, {
    errorMap: () => ({ message: 'Please select a state' }),
  }),
  
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'),
  
  // Contact Information
  contactName: z
    .string()
    .min(2, 'Contact name is required')
    .max(100, 'Contact name is too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  contactEmail: z
    .string()
    .min(1, 'Contact email is required')
    .email('Please enter a valid email address'),
  
  contactPhone: z
    .string()
    .regex(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      'Please enter a valid phone number'
    ),
  
  // Status
  status: z.enum(propertyStatuses).default('ACTIVE'),
  
  // Images will be handled separately as File objects
  images: typeof window !== 'undefined' 
    ? z
        .array(z.instanceof(File))
        .length(4, 'Exactly 4 images are required')
        .refine(
          (files) => files.every(file => file.size <= MAX_FILE_SIZE),
          'Each image must be less than 10MB'
        )
        .refine(
          (files) => files.every(file => ACCEPTED_IMAGE_TYPES.includes(file.type)),
          'Only .jpg, .jpeg, .png and .webp formats are supported'
        )
    : z.array(z.any()).length(4, 'Exactly 4 images are required'),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

// Helper function to format price
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Helper function to format area
export function formatArea(area: number): string {
  return `${area.toLocaleString()} sq ft`;
}