import React from "react";
import type { Metadata } from "next";
import Contact from "@/components/Home/Resources/Contact";
import { pageMetadata } from "@/lib/seoMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "contact", "/contact");
}

const page = () => {
  return (
    <div>
      <Contact />
    </div>
  );
};

export default page;
