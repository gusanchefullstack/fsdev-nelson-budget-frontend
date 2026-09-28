import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/country-select";
import { PhoneCodeInput } from "@/components/phone-code-input";
import { dialCodeOf } from "@/lib/countries";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { useZodForm } from "@/lib/forms";
import { PARTY_META, type Collection, type Party, type PartyInput } from "./api";
import { openingBalanceRule, partySchema } from "./schemas";

type Props = {
  collection: Collection;
  party?: Party;
  pending?: boolean;
  onSubmit: (data: PartyInput, setServerErrors: (e: unknown) => void) => void;
};

const CONTACT = [
  ["address", "Address", "street-address"],
  ["city", "City", "address-level2"],
  ["state", "State / region", "address-level1"],
  ["postalCode", "Postal code", "postal-code"],
] as const;

/** Account, payor and vendor fields; contact fields are optional (FR-030, FR-031). */
export function PartyForm({ collection, party, pending, onSubmit }: Props) {
  const meta = PARTY_META[collection];
  const isAccount = collection === "accounts";
  const form = useZodForm(partySchema, {
    name: party?.name ?? "",
    description: party?.description ?? "",
    type: party?.type ?? "",
    currency: party?.currency ?? "USD",
    openingBalance: party?.openingBalance ?? "",
    address: party?.address ?? "",
    city: party?.city ?? "",
    postalCode: party?.postalCode ?? "",
    state: party?.state ?? "",
    country: party?.country ?? "",
    phoneCountryCode: party?.phoneCountryCode ?? "",
    phoneNumber: party?.phoneNumber ?? "",
  });
  const locked = (party?.transactionCount ?? 0) > 0;
  const id = (f: string) => `${collection}-${f}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    if (isAccount && !openingBalanceRule.test(data.openingBalance)) {
      return form.setErrors({
        openingBalance: "Enter an amount with up to 2 decimals (negative for money owed).",
      });
    }
    const blankToNull = (v: string) => (v === "" ? null : v);
    const { openingBalance, ...rest } = data;
    onSubmit(
      {
        ...rest,
        description: blankToNull(rest.description),
        address: blankToNull(rest.address),
        city: blankToNull(rest.city),
        postalCode: blankToNull(rest.postalCode),
        state: blankToNull(rest.state),
        country: blankToNull(rest.country),
        phoneCountryCode: blankToNull(rest.phoneCountryCode),
        phoneNumber: blankToNull(rest.phoneNumber),
        ...(isAccount ? { openingBalance } : {}),
      },
      form.applyServerErrors,
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <FormField id={id("name")} label="Name" required error={form.errors.name}>
        {(a) => (
          <Input
            {...a}
            value={form.values.name}
            onChange={(e) => form.set("name")(e.target.value)}
          />
        )}
      </FormField>
      <FormField id={id("type")} label="Type" required error={form.errors.type}>
        {(a) => (
          <NativeSelect
            {...a}
            value={form.values.type}
            onChange={(e) => form.set("type")(e.target.value)}
          >
            <option value="">Choose a type</option>
            {Object.entries(meta.types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={id("currency")}
        label="Currency"
        required
        error={form.errors.currency}
        hint={locked && isAccount ? "Locked because transactions use this account." : undefined}
      >
        {(a) => (
          <NativeSelect
            {...a}
            disabled={locked && isAccount}
            value={form.values.currency}
            onChange={(e) => form.set("currency")(e.target.value as "USD" | "COP")}
          >
            <option value="USD">USD</option>
            <option value="COP">COP</option>
          </NativeSelect>
        )}
      </FormField>
      {isAccount && (
        <FormField
          id={id("opening")}
          label="Opening balance"
          required
          error={form.errors.openingBalance}
          hint="Transactions update the current balance automatically."
        >
          {(a) => (
            <Input
              {...a}
              inputMode="decimal"
              value={form.values.openingBalance}
              onChange={(e) => form.set("openingBalance")(e.target.value)}
            />
          )}
        </FormField>
      )}
      <FormField
        id={id("description")}
        label="Description"
        error={form.errors.description}
        className="grid gap-1.5 md:col-span-2"
      >
        {(a) => (
          <Textarea
            {...a}
            value={form.values.description}
            onChange={(e) => form.set("description")(e.target.value)}
          />
        )}
      </FormField>
      <fieldset className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <legend className="mb-2 font-semibold">Contact (optional)</legend>
        {CONTACT.map(([field, label, autoComplete]) => (
          <FormField key={field} id={id(field)} label={label} error={form.errors[field]}>
            {(a) => (
              <Input
                {...a}
                autoComplete={autoComplete}
                value={form.values[field]}
                onChange={(e) => form.set(field)(e.target.value)}
              />
            )}
          </FormField>
        ))}
        <FormField id={id("country")} label="Country" error={form.errors.country}>
          {(a) => (
            <CountrySelect
              {...a}
              value={form.values.country}
              onChange={(e) => {
                form.set("country")(e.target.value);
                // The phone code follows the country; blank when it has none (FR-001a).
                form.set("phoneCountryCode")(dialCodeOf(e.target.value) ?? "");
              }}
            />
          )}
        </FormField>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <FormField id={id("phone-code")} label="Phone code" error={form.errors.phoneCountryCode}>
            {(a) => (
              <PhoneCodeInput
                {...a}
                country={form.values.country}
                inputMode="tel"
                placeholder="+1"
                value={form.values.phoneCountryCode}
                onChange={(e) => form.set("phoneCountryCode")(e.target.value)}
              />
            )}
          </FormField>
          <FormField id={id("phone")} label="Phone number" error={form.errors.phoneNumber}>
            {(a) => (
              <Input
                {...a}
                inputMode="numeric"
                value={form.values.phoneNumber}
                onChange={(e) => form.set("phoneNumber")(e.target.value.replace(/\s/g, ""))}
              />
            )}
          </FormField>
        </div>
      </fieldset>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {party ? "Save" : `Add ${meta.singular}`}
      </Button>
    </form>
  );
}
