import { NavLink, Outlet } from "react-router-dom";

type SettingsTab = {
  label: string;
  path: string;
};

const SETTINGS_TABS: SettingsTab[] = [
  {
    label: "Platform Types",
    path: "platform-types",
  },
  {
    label: "Templates",
    path: "templates",
  },
  {
    label: "Extensions",
    path: "extensions",
  },
  // {
  //   label: "Smart EMS",
  //   path: "smartems",
  // }
];

export default function SettingsLayout() {
  return (
    <div className="h-full flex bg-gray-50">

      <div className="w-64 bg-white border-r">

        <div className="p-4 font-semibold text-lg border-b">
          Settings
        </div>

        <nav className="flex flex-col p-2 gap-1">

          {SETTINGS_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100 text-gray-700"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}

        </nav>

      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </div>

    </div>
  );
}
