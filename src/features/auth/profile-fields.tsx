import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { CountrySelect } from "@/components/country-select";
import { TimezoneSelect } from "@/components/timezone-select";

export type ProfileValues = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  phoneCountryCode: string;
  phoneNumber: string;
  timezone: string;
};

type Props = {
  values: ProfileValues;
  errors: Record<string, string>;
  onChange: (field: keyof ProfileValues, value: string) => void;
  timezoneHint?: string;
};

/** The mandatory profile fields shared by sign-up and the profile page. */
export function ProfileFields({ values, errors, onChange, timezoneHint }: Props) {
  const text = (field: keyof ProfileValues, label: string, autoComplete?: string) => (
    <FormField id={field} label={label} required error={errors[field]}>
      {(a) => (
        <Input
          {...a}
          autoComplete={autoComplete}
          value={values[field]}
          onChange={(e) => onChange(field, e.target.value)}
        />
      )}
    </FormField>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {text("firstName", "First name", "given-name")}
      {text("lastName", "Last name", "family-name")}
      <div className="md:col-span-2">{text("address", "Address", "street-address")}</div>
      {text("city", "City", "address-level2")}
      {text("state", "State / region", "address-level1")}
      {text("postalCode", "Postal code", "postal-code")}
      <FormField id="country" label="Country" required error={errors.country}>
        {(a) => (
          <CountrySelect
            {...a}
            value={values.country}
            onChange={(e) => onChange("country", e.target.value)}
          />
        )}
      </FormField>
      <fieldset className="grid grid-cols-[6rem_1fr] gap-2 md:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">Phone number *</legend>
        <FormField id="phoneCountryCode" label="Country code" error={errors.phoneCountryCode}>
          {(a) => (
            <Input
              {...a}
              inputMode="tel"
              autoComplete="tel-country-code"
              placeholder="+1"
              value={values.phoneCountryCode}
              onChange={(e) => onChange("phoneCountryCode", e.target.value)}
            />
          )}
        </FormField>
        <FormField id="phoneNumber" label="Number" error={errors.phoneNumber}>
          {(a) => (
            <Input
              {...a}
              inputMode="numeric"
              autoComplete="tel-national"
              value={values.phoneNumber}
              onChange={(e) => onChange("phoneNumber", e.target.value.replace(/\s/g, ""))}
            />
          )}
        </FormField>
      </fieldset>
      <FormField
        id="timezone"
        label="Timezone"
        required
        error={errors.timezone}
        hint={timezoneHint}
        className="grid gap-1.5 md:col-span-2"
      >
        {(a) => (
          <TimezoneSelect
            {...a}
            value={values.timezone}
            onChange={(e) => onChange("timezone", e.target.value)}
          />
        )}
      </FormField>
    </div>
  );
}
