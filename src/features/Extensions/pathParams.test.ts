import { coerceScopeParam, pathParamNames, pathParts, scopeParamChoices } from "./pathParams";
import { emptyQueryParam, emptyRoute } from "./extensionFormTypes";

describe("pathParamNames", () => {
  it("extracts placeholders from a path", () => {
    expect(pathParamNames("/fun/{widget_id}/test/{other}")).toEqual(["widget_id", "other"]);
  });

  it("ignores empty braces", () => {
    expect(pathParamNames("/fun/{}/test")).toEqual([]);
  });
});

describe("scopeParamChoices", () => {
  it("uses path placeholders when location is path", () => {
    const route = { ...emptyRoute(), path: "/x/{widget_id}", scope_in: "path" as const };
    expect(scopeParamChoices(route)).toEqual(["widget_id"]);
  });

  it("uses declared query names when location is query", () => {
    const qp = emptyQueryParam();
    qp.name = "device_id";
    const route = { ...emptyRoute(), query_params: [qp], scope_in: "query" as const };
    expect(scopeParamChoices(route)).toEqual(["device_id"]);
  });
});

describe("coerceScopeParam", () => {
  it("clears a path-scoped value when the placeholder is removed", () => {
    const route = {
      ...emptyRoute(),
      scoped: true,
      scope_in: "path" as const,
      scope_param: "widget_id",
      path: "/fun/test",
    };
    expect(coerceScopeParam(route).scope_param).toBe("");
  });

  it("remaps to a remaining placeholder instead of keeping the DB value", () => {
    const route = {
      ...emptyRoute(),
      scoped: true,
      scope_in: "path" as const,
      scope_param: "widget_id",
      path: "/fun/{other}/test",
    };
    expect(coerceScopeParam(route).scope_param).toBe("other");
  });

  it("clears a query-scoped value when that query param is deleted", () => {
    const leftover = emptyQueryParam();
    leftover.name = "limit";
    const route = {
      ...emptyRoute(),
      scoped: true,
      scope_in: "query" as const,
      scope_param: "widget_id",
      query_params: [leftover],
    };
    expect(coerceScopeParam(route).scope_param).toBe("limit");
  });

  it("keeps a still-valid value", () => {
    const route = {
      ...emptyRoute(),
      scoped: true,
      scope_in: "path" as const,
      scope_param: "widget_id",
      path: "/fun/{widget_id}/test",
    };
    expect(coerceScopeParam(route)).toBe(route);
  });

  it("does not touch unscoped routes", () => {
    const route = {
      ...emptyRoute(),
      scoped: false,
      scope_param: "widget_id",
      path: "/fun/test",
    };
    expect(coerceScopeParam(route)).toBe(route);
  });
});

describe("pathParts", () => {
  it("splits braces from names", () => {
    expect(pathParts("/fun/{widget_id}/test")).toEqual([
      { kind: "text", text: "/fun/" },
      { kind: "brace", text: "{" },
      { kind: "name", text: "widget_id" },
      { kind: "brace", text: "}" },
      { kind: "text", text: "/test" },
    ]);
  });
});
