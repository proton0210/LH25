//@ts-nocheck
import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface GeneratePDFInput {
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
  };
  content: string;
  executiveSummary?: string;
  marketInsights?: string;
  recommendations?: string;
  generationTimeMs: number;
}

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

export const handler = async (
  event: GeneratePDFInput
): Promise<GeneratePDFInput & { pdfBuffer: string }> => {
  console.log("Generating PDF for report:", event.reportId);

  try {
    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      info: {
        Title: `Property Report - ${event.input.title}`,
        Author: "Lambda Real Estate Pro",
        Subject: `${event.input.reportType.replace(/_/g, " ")} Report`,
        Keywords: "real estate, property, analysis, report",
      },
    });

    // Header with gradient effect
    const pageWidth = doc.page.width - 100;
    doc.rect(50, 50, pageWidth, 80).fill("#667eea");

    // Title
    doc.fontSize(24).fillColor("white").text("Lambda Real Estate Pro", 60, 70);

    doc
      .fontSize(16)
      .fillColor("white")
      .text(
        event.input.reportType.replace(/_/g, " ").toUpperCase() + " REPORT",
        60,
        100
      );

    // Property details section
    doc.fillColor("black").fontSize(20).text(event.input.title, 50, 160);

    doc
      .fontSize(12)
      .fillColor("#666")
      .text(
        `${event.input.address}, ${event.input.city}, ${event.input.state} ${event.input.zipCode}`,
        50,
        190
      );

    // Key metrics box
    doc.rect(50, 220, pageWidth, 80).fill("#f8f9fa");

    const metricsY = 235;
    const metricsSpacing = pageWidth / 4;

    // Price
    doc.fillColor("#667eea").fontSize(10).text("PRICE", 70, metricsY);
    doc
      .fillColor("black")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`$${event.input.price.toLocaleString()}`, 70, metricsY + 15);

    // Property Type
    doc
      .fillColor("#667eea")
      .fontSize(10)
      .font("Helvetica")
      .text("TYPE", 70 + metricsSpacing, metricsY);
    doc
      .fillColor("black")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(
        event.input.propertyType.replace(/_/g, " "),
        70 + metricsSpacing,
        metricsY + 15
      );

    // Size
    doc
      .fillColor("#667eea")
      .fontSize(10)
      .font("Helvetica")
      .text("SIZE", 70 + metricsSpacing * 2, metricsY);
    doc
      .fillColor("black")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(
        `${event.input.squareFeet.toLocaleString()} sq ft`,
        70 + metricsSpacing * 2,
        metricsY + 15
      );

    // Bed/Bath
    doc
      .fillColor("#667eea")
      .fontSize(10)
      .font("Helvetica")
      .text("BED/BATH", 70 + metricsSpacing * 3, metricsY);
    doc
      .fillColor("black")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(
        `${event.input.bedrooms} / ${event.input.bathrooms}`,
        70 + metricsSpacing * 3,
        metricsY + 15
      );

    // Reset font
    doc.font("Helvetica").fontSize(12).fillColor("black");

    let currentY = 330;

    // Executive Summary
    if (event.executiveSummary) {
      doc
        .fontSize(16)
        .fillColor("#667eea")
        .text("Executive Summary", 50, currentY);

      currentY += 25;
      doc
        .fontSize(11)
        .fillColor("black")
        .text(event.executiveSummary, 50, currentY, {
          width: pageWidth,
          align: "justify",
        });

      currentY = doc.y + 20;
    }

    // Market Insights & Neighborhood Amenities
    if (event.marketInsights && currentY < 650) {
      doc
        .fontSize(16)
        .fillColor("#667eea")
        .text("Market Insights & Neighborhood Amenities", 50, currentY);

      currentY += 25;
      doc
        .fontSize(11)
        .fillColor("black")
        .text(event.marketInsights, 50, currentY, {
          width: pageWidth,
          align: "justify",
        });

      currentY = doc.y + 20;
    }

    // Add new page if needed
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    // Full Report Content
    doc
      .fontSize(16)
      .fillColor("#667eea")
      .text("Detailed Analysis", 50, currentY);

    currentY += 25;

    // Split content into paragraphs and format
    const paragraphs = event.content.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Check if it's a heading (starts with number or specific keywords)
      if (/^\d+\.|^[A-Z][A-Z\s]+:/i.test(paragraph.trim())) {
        doc.fontSize(13).font("Helvetica-Bold").fillColor("#333");
      } else {
        doc.fontSize(11).font("Helvetica").fillColor("black");
      }

      doc.text(paragraph.trim(), 50, currentY, {
        width: pageWidth,
        align: "justify",
      });

      currentY = doc.y + 10;
    }

    // Recommendations section on new page
    if (event.recommendations) {
      doc.addPage();

      doc.fontSize(16).fillColor("#667eea").text("Recommendations", 50, 50);

      doc.fontSize(11).fillColor("black").text(event.recommendations, 50, 80, {
        width: pageWidth,
        align: "justify",
      });
    }

    // Footer on last page
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `Generated on ${new Date().toLocaleDateString()} by Lambda Real Estate Pro`,
        50,
        doc.page.height - 70,
        {
          width: pageWidth,
          align: "center",
        }
      );

    doc
      .fontSize(8)
      .text(`Report ID: ${event.reportId}`, 50, doc.page.height - 50, {
        width: pageWidth,
        align: "center",
      });

    // Finalize the PDF
    doc.end();

    // Convert to buffer
    const pdfBuffer = await streamToBuffer(doc as unknown as Readable);

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    return {
      ...event,
      pdfBuffer: pdfBuffer.toString("base64"),
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
