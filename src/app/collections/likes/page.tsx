import { SampleBrowser } from "@/components/SampleBrowser";

export default function LikesCollectionPage() {
  return (
    <SampleBrowser
      title="Likes"
      preset={{ favorite: true, copyFolder: "likes" }}
      showRatingFilter={true}
    />
  );
}
