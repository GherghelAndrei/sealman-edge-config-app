import { NavLink, Outlet } from "react-router-dom";

export interface SectionTab {
  label: string;
  path: string;
}

/** Page frame with horizontal sub-navigation shared by the platform sections. */
export default function SectionLayout({tabs }: {tabs: SectionTab[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <nav
        
        className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border bg-background p-3"
      >
        {/* <span className="mr-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span> */}
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
