interface PropertyInput {
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  listingType: string;
  images: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  userId?: string;
  cognitoUserId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  propertyData?: PropertyInput;
}

export const handler = async (
  event: PropertyInput
): Promise<ValidationResult> => {
  console.log('Validating property data:', JSON.stringify(event, null, 2));

  const errors: string[] = [];

  // Required field validation
  const requiredFields = [
    'title', 'description', 'price', 'address', 'city', 'state', 
    'zipCode', 'bedrooms', 'bathrooms', 'squareFeet', 'propertyType',
    'listingType', 'contactName', 'contactEmail', 'contactPhone'
  ];

  for (const field of requiredFields) {
    if (!event[field as keyof PropertyInput]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Email validation
  if (event.contactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(event.contactEmail)) {
      errors.push('Invalid email format');
    }
  }

  // Phone validation
  if (event.contactPhone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(event.contactPhone)) {
      errors.push('Invalid phone format');
    }
  }

  // Price validation
  if (event.price !== undefined && event.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  // Numeric field validations
  if (event.bedrooms !== undefined && event.bedrooms < 0) {
    errors.push('Bedrooms must be 0 or greater');
  }

  if (event.bathrooms !== undefined && event.bathrooms < 0) {
    errors.push('Bathrooms must be 0 or greater');
  }

  if (event.squareFeet !== undefined && event.squareFeet <= 0) {
    errors.push('Square feet must be greater than 0');
  }

  // Images validation
  if (!event.images || !Array.isArray(event.images) || event.images.length === 0) {
    errors.push('At least one image is required');
  }

  // Property type validation
  const validPropertyTypes = [
    'SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 
    'LAND', 'COMMERCIAL', 'OTHER'
  ];
  if (event.propertyType && !validPropertyTypes.includes(event.propertyType)) {
    errors.push(`Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`);
  }

  // Listing type validation
  const validListingTypes = ['FOR_SALE', 'FOR_RENT', 'SOLD', 'RENTED'];
  if (event.listingType && !validListingTypes.includes(event.listingType)) {
    errors.push(`Invalid listing type. Must be one of: ${validListingTypes.join(', ')}`);
  }

  // Year built validation
  if (event.yearBuilt !== undefined) {
    const currentYear = new Date().getFullYear();
    if (event.yearBuilt < 1800 || event.yearBuilt > currentYear + 1) {
      errors.push('Year built must be between 1800 and next year');
    }
  }

  // Zip code validation (basic US format)
  if (event.zipCode) {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(event.zipCode)) {
      errors.push('Invalid zip code format');
    }
  }

  const isValid = errors.length === 0;

  if (isValid) {
    console.log('Property data validation successful');
    return {
      isValid: true,
      propertyData: event
    };
  } else {
    console.log('Property data validation failed:', errors);
    return {
      isValid: false,
      errors
    };
  }
};