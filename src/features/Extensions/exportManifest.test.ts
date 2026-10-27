import { emptyDraft, emptyRoute, emptyUpstream } from "./extensionFormTypes";
import { toAuthorManifest } from "./exportManifest";
import { draftToRegistration } from "./extensionFormTypes";

describe("toAuthorManifest", () => {
  it("drops health and validation_mode fields from a converted draft", () => {
    const draft = emptyDraft();
    draft.name = "catalog-service";
    const upstream = emptyUpstream();
    upstream.key = "catalog";
    upstream.base_url = "http://localhost:7200";
    draft.upstreams = [upstream];
    const route = emptyRoute("catalog");
    route.path = "/catalog-service/items";
    route.method = "POST";
    route.upstream_path = "/items";
    route.body_ref = true;
    route.bodyText = '{"type":"object"}';
    draft.routes = [route];

    const converted = draftToRegistration(draft).registration;
    expect(converted).toBeDefined();
    const file = toAuthorManifest(converted!);

    expect(file.upstreams.catalog).not.toHaveProperty("last_status");
    expect(file.upstreams.catalog).not.toHaveProperty("last_checked_at");
    expect(file.routes[0]).not.toHaveProperty("validation_mode");
    expect(file.routes[0].body_ref).toBe(true);
    expect(file.routes[0].body).toBeNull();
  });
});
