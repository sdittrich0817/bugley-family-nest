import { SectionHeader } from "@/components/brand/SectionHeader";
import { Bugley } from "@/components/brand/Bugley";
import { Glow } from "@/components/brand/Glow";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <section className="container-page flex flex-col items-center gap-8 py-section">
      <Glow size="md">
        <Bugley stage="scout" expression="curious" size={140} />
      </Glow>
      <SectionHeader
        as="h1"
        eyebrow="Coming soon"
        title={title}
        description={description ?? "Bugley is still exploring this page. Check back soon!"}
      />
    </section>
  );
}
