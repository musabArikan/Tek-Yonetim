import { useMemo } from "react";
import { FormField, TextInput } from "./FormField";

export default function DefterInput({ value, onChange, suggestions, error }) {
  const allSuggestions = useMemo(() => {
    const set = new Set(suggestions);
    if (value?.trim()) set.add(value.trim());
    return Array.from(set).sort();
  }, [suggestions, value]);

  const listId = "defter-datalist";

  return (
    <FormField label="Kayıt Edilen Defter" error={error} required>
      <TextInput
        list={listId}
        value={value}
        onChange={onChange}
        placeholder="Defter adı seçin veya yazın..."
        error={error}
      />
      <datalist id={listId}>
        {allSuggestions.map((defter) => (
          <option key={defter} value={defter} />
        ))}
      </datalist>
    </FormField>
  );
}
