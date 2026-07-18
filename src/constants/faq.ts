/**
 * FAQ content — single source of truth for both the on-page FAQ accordion and the
 * FAQPage structured data emitted on the home page. Keeping them in sync matters for SEO
 * and for AI assistants that cite Q&A pairs; Google requires the schema to match visible
 * content.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: "How accurate is your OCR technology?",
    answer:
      "Our AI-powered OCR achieves 99%+ accuracy for standard documents and 95%+ for complex layouts. We continuously train our models on diverse document types to ensure high accuracy across different formats and languages.",
  },
  {
    question: "Is my data secure and GDPR compliant?",
    answer:
      "Yes, we take data security seriously. All data is processed in EU-based data centers, encrypted in transit and at rest, and automatically deleted according to your retention settings. We are fully GDPR compliant and can sign DPAs as needed.",
  },
  {
    question: "How quickly can I get started?",
    answer:
      "You can start processing documents within minutes of signing up. Our platform requires no installation - simply upload your documents through our web interface or API. We offer a 14-day free trial with no credit card required.",
  },
  {
    question: "What types of documents do you support?",
    answer:
      "We support a wide range of documents including invoices, receipts, purchase orders, shipping documents, and general business documents. Our system handles various formats including PDF, JPEG, PNG, and TIFF files.",
  },
  {
    question: "Can I integrate with my existing systems?",
    answer:
      "Yes, we provide a comprehensive REST API and webhooks for seamless integration with your existing systems. We also offer pre-built integrations with popular accounting and ERP systems.",
  },
  {
    question: "What happens if there's an error in the extraction?",
    answer:
      "Our platform includes a built-in verification interface where you can review and correct any extraction errors. We also provide confidence scores for each extracted field to help identify potential issues.",
  },
];
