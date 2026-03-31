import WhyEditor from "@/components/why/WhyEditor";

export default async function WhyPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const params = await searchParams;

  return <WhyEditor prompt={params.prompt} />;
}
