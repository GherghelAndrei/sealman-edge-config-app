import SectionLayout from "@/layouts/SectionLayout";

const AUTHORIZATION_TABS = [
  { label: "Teams", path: "teams" },
  { label: "Roles", path: "roles" },
  { label: "Scopes", path: "scopes" },
  { label: "Users", path: "users" },
];

export default function Authorization() {
  return <SectionLayout tabs={AUTHORIZATION_TABS} />;
}
