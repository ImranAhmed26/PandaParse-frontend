import React from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seoMetadata";
// import About from '@/components/Home/About';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "about", "/about");
}

const page = () => {
  return <div>{/* <About /> */}</div>;
};

export default page;
