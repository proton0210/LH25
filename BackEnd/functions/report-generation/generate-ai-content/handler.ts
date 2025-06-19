import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export interface GenerateAIContentInput {
  reportId: string;
  userId: string;
  cognitoUserId?: string;
  input: {
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
    yearBuilt?: number;
    lotSize?: number;
    amenities?: string[];
    reportType: string;
    additionalContext?: string;
    includeDetailedAmenities?: boolean;
  };
}

const generatePrompt = (input: GenerateAIContentInput["input"]): string => {
  const amenitiesText = input.amenities?.length ? `Amenities: ${input.amenities.join(", ")}` : "";
  const yearBuiltText = input.yearBuilt ? `Year Built: ${input.yearBuilt}` : "";
  const lotSizeText = input.lotSize ? `Lot Size: ${input.lotSize} acres` : "";
  
  const basePrompt = `You are a professional real estate analyst with expertise in location analysis. Generate a comprehensive ${input.reportType.replace(/_/g, " ")} report for the following property:

Property Title: ${input.title}
Description: ${input.description}
Price: $${input.price.toLocaleString()}
Address: ${input.address}, ${input.city}, ${input.state} ${input.zipCode}
Property Type: ${input.propertyType.replace(/_/g, " ")}
Listing Type: ${input.listingType === "FOR_SALE" ? "For Sale" : "For Rent"}
Bedrooms: ${input.bedrooms}
Bathrooms: ${input.bathrooms}
Square Feet: ${input.squareFeet.toLocaleString()}
${yearBuiltText}
${lotSizeText}
${amenitiesText}

Additional Context: ${input.additionalContext || "None provided"}

IMPORTANT: Include analysis of nearby amenities and infrastructure based on the property location (${input.city}, ${input.state}). Consider typical amenities found in this area and provide realistic estimates of distances and quality ratings.

${input.includeDetailedAmenities ? `
DETAILED AMENITIES REQUIRED: Provide comprehensive analysis of:
- SCHOOLS: List specific schools within 2-5 miles with estimated ratings (Elementary, Middle, High Schools)
- HOSPITALS: Major medical centers and hospitals within 10 miles with specialties
- AIRPORTS: Nearest airports with drive times and whether they're international/regional
- TRANSIT: Train stations, subway stops, major bus routes within walking distance
- SHOPPING: Major shopping centers, grocery stores, pharmacies within 2 miles
- DINING: Restaurant density and types within 1 mile
- RECREATION: Parks, gyms, entertainment venues within 3 miles
Include specific names where typical for the area and realistic distance estimates.` : ''}`;

  const reportInstructions = {
    MARKET_ANALYSIS: `
Create a detailed market analysis report that includes:
1. Executive Summary (2-3 sentences)
2. Local Market Overview
3. Comparable Properties Analysis
4. Price Positioning Assessment
5. Market Trends and Forecast
6. Neighborhood Amenities Analysis:
   - Schools (Elementary, Middle, High Schools with ratings)
   - Healthcare Facilities (Hospitals, Urgent Care, Medical Centers)
   - Transportation (Airports, Train Stations, Bus Routes)
   - Shopping & Dining (Grocery Stores, Restaurants, Shopping Centers)
   - Recreation (Parks, Gyms, Entertainment)
7. Recommendations for Pricing Strategy

Format the response with clear sections and bullet points. Include estimated distances and quality ratings where applicable.`,
    
    INVESTMENT_ANALYSIS: `
Create a comprehensive investment analysis report that includes:
1. Executive Summary (2-3 sentences)
2. ROI Projections
3. Cash Flow Analysis
4. Risk Assessment
5. Market Growth Potential
6. Location Value Drivers:
   - Top-Rated Schools (impact on property values)
   - Major Employers & Business Centers (within 10 miles)
   - Healthcare Infrastructure (hospitals, medical facilities)
   - Transportation Access (airports, highways, public transit)
   - Future Development Plans
7. Investment Recommendations

Include specific metrics, financial projections, and how nearby amenities affect investment potential.`,
    
    COMPARATIVE_MARKET_ANALYSIS: `
Create a detailed comparative market analysis (CMA) that includes:
1. Executive Summary (2-3 sentences)
2. Subject Property Analysis
3. Comparable Properties (suggest 3-5 similar properties)
4. Market Adjustments
5. Location Premium Analysis:
   - School District Quality & Rankings
   - Distance to Major Hospitals & Medical Centers
   - Airport Accessibility (drive time to nearest airports)
   - Public Transit Options (subway, bus, train stations)
   - Walkability Score & Nearby Amenities
6. Final Value Opinion
7. Marketing Recommendations

Provide specific price ranges, adjustment factors, and how location amenities impact property value.`,
    
    LISTING_OPTIMIZATION: `
Create a listing optimization report that includes:
1. Executive Summary (2-3 sentences)
2. Listing Strengths and Weaknesses
3. Pricing Recommendations
4. Key Selling Points - Location Advantages:
   - Highlight Nearby Top-Rated Schools
   - Proximity to Healthcare Facilities
   - Transportation Convenience (airports, stations)
   - Lifestyle Amenities (shopping, dining, entertainment)
   - Safety & Community Features
5. Marketing Strategy Suggestions
6. Staging and Presentation Tips
7. Target Buyer Profile

Focus on actionable recommendations and how to leverage nearby amenities in marketing.`,
    
    CUSTOM: `
Create a comprehensive property analysis report that includes:
1. Executive Summary (2-3 sentences)
2. Property Overview
3. Market Context
4. Neighborhood Analysis:
   - Educational Facilities (schools, colleges, libraries)
   - Healthcare Access (hospitals, clinics, emergency services)
   - Transportation Infrastructure (airports, train/bus stations, highways)
   - Essential Services (grocery, pharmacy, banking)
   - Quality of Life Factors (parks, recreation, safety)
5. Value Assessment
6. Opportunities and Challenges
7. Strategic Recommendations

Provide a balanced analysis with emphasis on location advantages and nearby amenities.`
  };

  return basePrompt + (reportInstructions[input.reportType as keyof typeof reportInstructions] || reportInstructions.CUSTOM);
};

export const handler = async (event: GenerateAIContentInput): Promise<GenerateAIContentInput & { 
  content: string;
  executiveSummary?: string;
  marketInsights?: string;
  recommendations?: string;
  generationTimeMs: number;
}> => {
  console.log("Generating AI content for report:", event.reportId);
  const startTime = Date.now();
  
  try {
    // Generate the prompt
    const prompt = generatePrompt(event.input);
    
    // Use Claude 3 Haiku model with APAC inference profile
    const modelId = "apac.anthropic.claude-3-haiku-20240307-v1:0";
    
    // Create the conversation
    const conversation = [
      {
        role: "user" as const,
        content: [{ text: prompt }]
      }
    ];
    
    // Create command with the Converse API
    const command = new ConverseCommand({
      modelId,
      messages: conversation,
      inferenceConfig: { 
        maxTokens: 2000, 
        temperature: 0.7, 
        topP: 0.9 
      }
    });
    
    console.log("Invoking Bedrock with model:", modelId);
    
    // Send the command to the model
    const response = await bedrockClient.send(command);
    
    // Extract the response text
    const content = response.output?.message?.content?.[0]?.text || "No content generated";
    
    // Parse sections from the content
    const executiveSummary = content.match(/executive summary[:\s]*([\s\S]*?)(?=\n\n|\d\.|$)/i)?.[1]?.trim();
    
    // Enhanced market insights to capture neighborhood amenities
    const marketInsights = content.match(/(?:market|trends?|analysis|neighborhood|amenities|location|schools|hospitals|transportation)[:\s]*([\s\S]*?)(?=\n\n|\d\.|recommendations|final|$)/i)?.[1]?.trim();
    
    const recommendations = content.match(/recommendations?[:\s]*([\s\S]*?)(?=\n\n|$)/i)?.[1]?.trim();
    
    const generationTimeMs = Date.now() - startTime;
    
    return {
      ...event,
      content,
      executiveSummary,
      marketInsights,
      recommendations,
      generationTimeMs
    };
    
  } catch (error) {
    console.error("Error generating AI content:", error);
    throw error;
  }
};