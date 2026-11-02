import SectionLayout from "@/layouts/SectionLayout";

const SETTINGS_TABS = [
  { label: "Seal-Agent", path: "seal-agent" },
  { label: "Azure IoT Edge", path: "azure-iot-edge" },
  { label: "SEALMAN EMS", path: "sealman-ems" },
  { label: "Container Registries", path: "container-registries" },
  { label: "Templates", path: "templates" },
  { label: "Extensions", path: "extensions" },
];

export default function SettingsLayout() {
  return <SectionLayout tabs={SETTINGS_TABS} />;
}
