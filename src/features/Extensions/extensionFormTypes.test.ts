import {
  draftToRegistration,
  emptyDraft,
  emptyRoute,
  emptyUpstream,
  HTTP_METHODS,
  type ExtensionFormDraft,
} from "./extensionFormTypes";

function validDraft(): ExtensionFormDraft {
  const draft = emptyDraft();
  draft.name = "catalog";
  const upstream = emptyUpstream();
  upstream.key = "svc";
  upstream.base_url = "http://catalog-service:8080/api";
  draft.upstreams = [upstream];
  const route = emptyRoute("svc");
  route.path = "/catalog/{item_id}";
  route.upstream_path = "/items/{item_id}";
  draft.routes = [route];
  return draft;
}

describe("extension manifest form contract", () => {
  it("matches the backend method set and device scope default", () => {
    expect(HTTP_METHODS).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
    expect(emptyRoute().scope_param).toBe("device_id");
  });

  it.each([
    "not a URL",
    "ftp://catalog-service/files",
    "http://user:secret@catalog-service",
    "http://catalog-service/api?token=secret",
    "http://catalog-service/api#fragment",
  ])("rejects invalid HTTP base URL %s", (baseUrl) => {
    const draft = validDraft();
    draft.upstreams[0].base_url = baseUrl;

    const result = draftToRegistration(draft);

    expect(result.registration).toBeUndefined();
    expect(result.errors.some((error) => error.includes("base URL"))).toBe(true);
  });

  it("rejects relative paths and unavailable upstream placeholders", () => {
    const draft = validDraft();
    draft.routes[0].path = "catalog/{item_id}";
    draft.routes[0].upstream_path = "/items/{missing_id}";

    const result = draftToRegistration(draft);

    expect(result.registration).toBeUndefined();
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("path must start with exactly one '/'"),
      expect.stringContaining("unavailable placeholders: missing_id"),
    ]));
  });

  it("defaults an empty HTTP upstream path to the public route path", () => {
    const draft = validDraft();
    draft.routes[0].upstream_path = "";

    const result = draftToRegistration(draft);

    expect(result.errors).toEqual([]);
    expect(result.registration?.routes[0].upstream_path).toBe("/catalog/{item_id}");
  });

  it("rejects a method outside the backend method set", () => {
    const draft = validDraft();
    draft.routes[0].method = "TRACE" as typeof draft.routes[0]["method"];

    const result = draftToRegistration(draft);

    expect(result.registration).toBeUndefined();
    expect(result.errors.some((error) => error.includes('unsupported HTTP method "TRACE"'))).toBe(true);
  });
});