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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "home");
}

function Home() {
  return (
    <main className="overflow-hidden">
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
