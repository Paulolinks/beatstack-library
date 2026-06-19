import { SampleBrowser } from "@/components/SampleBrowser";

export default function CopiedCollectionPage() {
  return (
    <SampleBrowser
      title="Copiados"
      preset={{ downloaded: true }}
      showRatingFilter={true}
    />
  );
}
