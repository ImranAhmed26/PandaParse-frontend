import type { Metadata } from "next";
import Banner from "@/components/Home/Banner";
import PainPoints from "@/components/Home/PainPoints";
import Solution from "@/components/Home/Solution";
import Features from "@/components/Home/Features";
import Testimonials from "@/components/Home/Testimonials";
import Pricing from "@/components/Home/Pricing";
import FAQ from "@/components/Home/FAQ";
import FinalCTA from "@/components/Home/FinalCTA";
import { pageMetadata } from "@/lib/seoMetadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqs } from "@/constants/faq";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "home");
}

// FAQ structured data — mirrors the on-page FAQ accordion. Helps rich results and gives
// AI assistants clean, citable Q&A pairs about the product.
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

function Home() {
  return (
    <main className="overflow-hidden">
      <JsonLd data={faqLd} />
      <Banner />
      <PainPoints />
      <Solution />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </main>
  );
}

export default Home;
