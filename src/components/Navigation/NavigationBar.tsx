import { NavLink } from "react-router-dom";

import { Disclosure, Menu, MenuButton, MenuItems, MenuItem, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import SignOutButton from "../Auth/SignOutButton";

import logo from "../../assets/sealman_logo.png";
import { Fragment, useMemo } from "react";

import { useAuth } from "@/auth";
import { usePermissions } from "@/features/authorization/permissions/use-permissions";
import { PERMISSION_KEYS } from "@/features/authorization/permissions/permission-keys";

interface INavigation {
  name: string;
  href: string;
  current: boolean;
}

export default function NavigationBar() {
  const auth = useAuth();
  const { hasPermission: hasAuthorizationReadPermission, isLoading: isPermissionsLoading } = usePermissions({
    permissionKey: PERMISSION_KEYS.PLATFORM_AUTHORIZATION_READ,
  });

  const navigation: INavigation[] = useMemo(() => {
    const items: INavigation[] = [
      {
        name: "Dashboard",
        href: "/",
        current: true,
      },
      {
        name: "Devices",
        href: "/devices",
        current: true,
      },
      {
        name: "Deployments",
        href: "/deployments",
        current: true,
      },
      {
        name: "Edge Deployments (mockup)",
        href: "/mockups/deployments",
        current: true,
      },
    ];

    if (!isPermissionsLoading && hasAuthorizationReadPermission) {
      items.push({
        name: "Authorization",
        href: "/authorization/teams",
        current: true,
      });
    }

    return items;
  }, [hasAuthorizationReadPermission, isPermissionsLoading]);

  const initials = useMemo(() => {
    return auth.user?.name?.split(" ").map(n => n[0]).join("") || "";
  }, [auth.user?.name]);

  return (
    <Disclosure as="nav" className="bg-white sticky top-0 z-1001">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-(--breakpoint-3xl) px-4">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-sm p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex shrink-0 items-center">
                  <img className="h-8 w-auto" src={logo} alt="Sealman" />
                </div>
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }: { isActive: boolean }) =>
                          `px-3 py-2 text-sm font-medium ${isActive ? "underline" : "hover:text-vibrant-blue"}`
                        }
                        aria-current={item.current ? "page" : undefined}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <Menu as="div" className="relative ml-3">
                  <div>
                    <MenuButton className="relative flex rounded-full text-sm border border-gray-500 hover:border-gray-900 focus:outline-hidden focus:ring-1 focus:ring-white focus:ring-offset-1 focus:ring-offset-gray-800">
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full items-center py-1.5">{initials}</div>
                    </MenuButton>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden">
                      <MenuItem>
                        {({ close }) => (
                          <NavLink
                            to="/settings/platform-types"
                            onClick={close}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Settings
                          </NavLink>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ close }) => (
                          <NavLink
                            to="/user/profile"
                            onClick={close}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            User Profile
                          </NavLink>
                        )}
                      </MenuItem>
                      <MenuItem>
                        <SignOutButton />
                      </MenuItem>
                    </MenuItems>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden relative">
            <div className="absolute space-y-2 px-2 pb-3 pt-2 bg-white w-full">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={NavLink}
                  to={item.href}
                  className={`${item.current ? "bg-vibrant-blue text-white" : "text-gray-300"
                    } hover:bg-night-blue hover:text-white block rounded-sm px-3 py-2 text-base font-medium`}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
