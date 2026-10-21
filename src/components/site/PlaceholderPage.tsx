import { SectionHeader } from "@/components/brand/SectionHeader";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <section className="container-page py-section">
      <SectionHeader as="h1" eyebrow="Coming soon" title={title} description={description} />
    </section>
  );
}
