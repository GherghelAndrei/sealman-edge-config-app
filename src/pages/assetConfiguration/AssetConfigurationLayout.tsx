import SectionLayout from "@/layouts/SectionLayout";

const ASSET_CONFIGURATION_TABS = [
  { label: "Asset Types", path: "asset-types" },
];

export default function AssetConfigurationLayout() {
  return <SectionLayout tabs={ASSET_CONFIGURATION_TABS} />;
}
