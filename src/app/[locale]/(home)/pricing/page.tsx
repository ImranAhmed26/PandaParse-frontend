import PricingPlans from "@/components/Home/Pricing";
import React from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seoMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "pricing", "/pricing");
}

const page = () => {
  return (
    <div className="py-6 lg:py-20">
      <PricingPlans />
    </div>
  );
};

export default page;
