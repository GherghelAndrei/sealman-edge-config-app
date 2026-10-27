import { formatCheckedAt } from "./HealthDot";
import { latestCheckedAt } from "./types";

describe("health checked-at tooltip", () => {
  it("formats a recent check as just now", () => {
    expect(formatCheckedAt(new Date().toISOString())).toBe("just now");
  });

  it("formats an older check relatively", () => {
    expect(formatCheckedAt(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())).toBe("2 hours ago");
  });

  it("picks the newest last_checked_at across upstreams", () => {
    expect(
      latestCheckedAt({
        a: { last_status: "healthy", last_checked_at: "2026-09-11T10:00:00.000Z" },
        b: { last_status: "healthy", last_checked_at: "2026-09-11T12:00:00.000Z" },
      }),
    ).toBe("2026-09-11T12:00:00.000Z");
  });
});
