import { SampleBrowser } from "@/components/SampleBrowser";

export default function RankedCollectionPage() {
  return (
    <SampleBrowser
      title="Ranqueados"
      preset={{ rated: true }}
      showRatingFilter={false}
    />
  );
}
