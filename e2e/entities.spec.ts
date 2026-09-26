import { expectAccessible, expectNoHorizontalScroll } from "./helpers/a11y";
import { createParty, expect, signUp, test } from "./fixtures";

test("create an account, a payor and a vendor; delete an unused vendor (scenario 5)", async ({
  page,
}) => {
  await signUp(page);
  await createParty(page, "accounts", { name: "Checking", type: "CHECKING", opening: "10000" });
  await expect(page.getByRole("row", { name: /Checking/ })).toContainText("USD 10,000.00");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await createParty(page, "payors", { name: "Employer", type: "EMPLOYER" });
  await createParty(page, "vendors", { name: "Landlord", type: "SERVICE" });
  await createParty(page, "vendors", { name: "Old gym", type: "SUBSCRIPTION" });

  await page.getByRole("link", { name: "Old gym" }).click();
  await expect(page.getByRole("heading", { name: "Old gym", level: 1 })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByRole("link", { name: "Old gym" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Landlord" })).toBeVisible();
});
