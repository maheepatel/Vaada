'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  STATES,
  districtsFor,
  subdistrictsFor,
  villagesFor,
  schoolsFor,
  rankMatches,
  isValidPincode,
  type PlaceValue,
} from '@/lib/geo';

/**
 * Cascading location picker: state → district → tehsil/block → village, with
 * school and PIN code alongside.
 *
 * Each field is a combobox, not a select. Two reasons, and they are the whole
 * design:
 *
 *   1. Typing "raj" and getting Rajasthan is faster than scrolling 36 options,
 *      and much faster on a phone, which is where most of these get filed.
 *   2. The dataset is genuinely incomplete below district level. A hard select
 *      would make it impossible to log a promise made in a village we have
 *      never heard of — which is precisely where promises get broken. So an
 *      unlisted value is accepted, and the field says so rather than failing.
 *
 * Narrowing is one-directional: changing a level clears everything below it,
 * because a district that no longer belongs to the chosen state is worse than
 * a blank field.
 */
export function PlacePicker({
  value,
  onChange,
}: {
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
}) {
  const stateNames = useMemo(() => STATES.map((s) => s.name), []);
  const districts = useMemo(() => districtsFor(value.state), [value.state]);
  const subdistricts = useMemo(
    () => subdistrictsFor(value.state, value.district),
    [value.state, value.district],
  );
  const villages = useMemo(
    () => villagesFor(value.state, value.district, value.subdistrict),
    [value.state, value.district, value.subdistrict],
  );
  const schools = useMemo(
    () => schoolsFor(value.state, value.district, value.subdistrict, value.village),
    [value.state, value.district, value.subdistrict, value.village],
  );

  // Each setter clears the levels below it. Order matters here.
  const setState = (state: string) =>
    onChange({ ...value, state, district: '', subdistrict: '', village: '', school: '', udise: '' });
  const setDistrict = (district: string) =>
    onChange({ ...value, district, subdistrict: '', village: '', school: '', udise: '' });
  const setSubdistrict = (subdistrict: string) =>
    onChange({ ...value, subdistrict, village: '', school: '', udise: '' });
  const setVillage = (village: string) =>
    onChange({ ...value, village, school: '', udise: '' });

  const pincodeBad = value.pincode.length > 0 && !isValidPincode(value.pincode);

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <Combo
        label="State or UT"
        required
        value={value.state}
        onChange={setState}
        options={stateNames}
        placeholder="Start typing — Rajasthan…"
      />

      <Combo
        label="District"
        value={value.district}
        onChange={setDistrict}
        options={districts}
        disabled={!value.state}
        placeholder={value.state ? 'Alwar…' : 'Pick a state first'}
        note={
          value.state && districts.length > 0
            ? `${districts.length} districts in ${value.state}`
            : undefined
        }
      />

      <Combo
        label="Tehsil, taluk or block"
        value={value.subdistrict}
        onChange={setSubdistrict}
        options={subdistricts}
        disabled={!value.district}
        placeholder={value.district ? 'Thanagazi…' : 'Pick a district first'}
        note={
          value.district && subdistricts.length === 0
            ? 'Not in our list for this district — type it in'
            : undefined
        }
      />

      <Combo
        label="Village or ward"
        value={value.village}
        onChange={setVillage}
        options={villages}
        disabled={!value.subdistrict}
        placeholder={value.subdistrict ? 'Jodhawas…' : 'Pick a tehsil first'}
        note={
          value.subdistrict && villages.length === 0
            ? 'Not in our list — type it in'
            : undefined
        }
      />

      <div className="sm:col-span-2">
        <Combo
          label="School or institution"
          value={value.school}
          onChange={(school) => {
            const match = schools.find((s) => s.name === school);
            onChange({ ...value, school, udise: match?.udise ?? value.udise });
          }}
          options={schools.map((s) => s.name)}
          placeholder="Government Senior Secondary School, Jodhawas"
          note="Free text. Leave blank if the promise is not about one institution."
        />
      </div>

      <Field
        label="UDISE+ code"
        value={value.udise}
        onChange={(udise) => onChange({ ...value, udise })}
        placeholder="11 digits, if you know it"
        inputMode="numeric"
        note="The national school code. It makes this row joinable to official enrolment and infrastructure data — by far the most useful thing you can add."
      />

      <Field
        label="PIN code"
        value={value.pincode}
        onChange={(pincode) => onChange({ ...value, pincode })}
        placeholder="301022"
        inputMode="numeric"
        maxLength={6}
        invalid={pincodeBad}
        note={pincodeBad ? 'A PIN code is six digits and does not start with 0.' : undefined}
      />
    </div>
  );
}

/**
 * Text input with a filtered suggestion list. Not a `<datalist>` — Safari and
 * several Android browsers render those inconsistently or not at all, and this
 * form has to work on a cheap phone at a protest.
 */
function Combo({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  note,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  note?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(
    () => rankMatches(options, value, 10),
    [options, value],
  );
  // Nothing to offer once the typed value already is the only match.
  const showList =
    open && matches.length > 0 && !(matches.length === 1 && matches[0] === value);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="eyebrow">
        {label}
        {required && <span className="ml-1 text-[var(--band-broken)]">*</span>}
      </label>
      <input
        id={id}
        required={required}
        disabled={disabled}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on an option land before the list unmounts.
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            commit(matches[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-4"
      />

      {note && <p className="mt-1 text-[0.7rem] leading-snug text-ink-3">{note}</p>}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-surface py-1 shadow-[var(--shadow-md)]"
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(m)}
                className={`block w-full px-3 py-1.5 text-left text-[0.85rem] ${
                  i === active ? 'bg-surface-2 text-ink' : 'text-ink-2'
                }`}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  note,
  inputMode,
  maxLength,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  note?: string;
  inputMode?: 'numeric' | 'text';
  maxLength?: number;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
        style={invalid ? { borderColor: 'var(--band-broken)' } : undefined}
      />
      {note && (
        <p
          className="mt-1 text-[0.7rem] leading-snug"
          style={{ color: invalid ? 'var(--band-broken-ink)' : 'var(--ink-3)' }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
