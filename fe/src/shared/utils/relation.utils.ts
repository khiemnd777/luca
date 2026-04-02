export function mapIdFieldToNameField(field: string): string {
  if (field.endsWith("_ids")) {
    return field.slice(0, -4) + "_names";
  }
  if (field.endsWith("_id")) {
    return field.slice(0, -3) + "_name";
  }
  if (field.endsWith("Ids")) {
    return field.slice(0, -3) + "Names";
  }
  if (field.endsWith("Id")) {
    return field.slice(0, -2) + "Name";
  }
  return field;
}
