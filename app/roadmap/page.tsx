import SimpleTabs from "@/components/layout/SimpleTabs";
import RoadmapPlanner from "@/components/roadmap/RoadmapPlanner";

export default function RoadmapPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <SimpleTabs />
      </div>
      <RoadmapPlanner />
    </>
  );
}
