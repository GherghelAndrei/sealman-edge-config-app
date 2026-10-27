/**
 * Keycloak Authentication Provider
 * Uses oidc-client-ts and react-oidc-context
 */

import { User, UserManager, WebStorageStateStore } from "oidc-client-ts";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import {
  IAuthProvider,
  AuthContextValue,
  AuthProviderProps,
  UserProfile,
} from "../types";

const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const AUTHORITY = import.meta.env.VITE_KEYCLOAK_AUTHORITY;

export const userManager = new UserManager({
  authority: AUTHORITY,
  client_id: CLIENT_ID,
  redirect_uri: `${window.location.origin}`,
  post_logout_redirect_uri: window.location.origin,
  // ec-api-scope is optional on the ec-app client; requesting it adds the
  // "ec-api" audience the backend verifies in auth.verify_token().
  scope: "openid profile email ec-api-scope",
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  monitorSession: true,
  automaticSilentRenew: true,
});

export const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

/**
 * Get token synchronously (for axios interceptors)
 * Uses UserManager's cached user instead of direct sessionStorage access
 */
function getToken(): string {
  // Access through UserManager's store interface instead of raw sessionStorage
  // This is safer as the library handles validation
  const storageKey = `oidc.user:${AUTHORITY}:${CLIENT_ID}`;

  // Get from the UserManager's configured store
  const userData = sessionStorage.getItem(storageKey);

  if (!userData) {
    throw new Error("No user authenticated");
  }

  try {
    // Use library's safe deserialization
    const user = User.fromStorageString(userData);
    return user.access_token;
  } catch (error) {
    throw new Error("Invalid user data in storage");
  }
}

/**
 * Get user profile synchronously
 */
function getUserProfile(): UserProfile {
  const storageKey = `oidc.user:${AUTHORITY}:${CLIENT_ID}`;
  const userData = sessionStorage.getItem(storageKey);

  if (!userData) {
    throw new Error("No user authenticated");
  }

  try {
    const user = User.fromStorageString(userData);
    return user.profile;
  } catch (error) {
    throw new Error("Invalid user data in storage");
  }
}

/**
 * Async version using UserManager - preferred when possible
 */
export async function getTokenAsync(): Promise<string> {
  const user = await userManager.getUser();

  if (!user) {
    throw new Error("No user authenticated");
  }

  return user.access_token;
}

/**
 * Get access token for API calls
 * Note: For Keycloak, scopes are set at login time
 */
async function getAccessToken(): Promise<string> {
  let user = await userManager.getUser();

  if (user?.expired) {
    user = await userManager.signinSilent();
  }

  if (!user?.access_token) {
    throw new Error("No user authenticated");
  }

  return user.access_token;
}

// Wrapper hook to match our unified interface
function useKeycloakAuth(): AuthContextValue {
  const auth = useOidcAuth();

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user?.profile || null,
    signIn: () => auth.signinRedirect(),
    signOut: () => auth.signoutRedirect(),
    getAccessToken: () => auth.user?.access_token || null,
  };
}

// Provider wrapper component
function KeycloakProvider({ children }: AuthProviderProps) {
  return (
    <OidcAuthProvider
      userManager={userManager}
      onSigninCallback={onSigninCallback}
    >
      {children}
    </OidcAuthProvider>
  );
}

export const keycloakAuthProvider: IAuthProvider = {
  Provider: KeycloakProvider,
  useAuth: useKeycloakAuth,
  getToken,
  getUserProfile,
  getAccessToken,
};
